import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAxis, useEffects } from '../contexts/WoahscopeContext';
import { updateGeometryArrays, getColourFromHue } from '../woahscope/utils';
import { DEFAULT_AUDIO_SETTINGS } from '../config';
import { getWaveformData } from '../store/daw';
import { useDawStore, MASTER_NODE_ID } from '../store/daw';
import type { MasterOutputNodeData } from '../store/dawTypes';
import type { DebugSnapshot } from '../debug/types';
import { EMPTY_SNAPSHOT } from '../debug/types';
import {
	N_SAMPLES,
	FADE_AMOUNT,
	useRenderTargets,
	useFadePass,
	useLineMesh,
	useCRTTexture,
	usePassPipeline,
	useLanczos,
} from '../woahscope/sceneHooks';

export const debugRef = { current: { ...EMPTY_SNAPSHOT } as DebugSnapshot };

const isDebugMode = import.meta.env.DEV &&
	new URLSearchParams(window.location.search).has('debug');

let _debugGetToneContext: (() => { state: string }) | null = null;
if (isDebugMode) {
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		// @ts-ignore — require is available at runtime in Vite dev mode
		const { getContext } = require('tone') as typeof import('tone');
		_debugGetToneContext = getContext;
	} catch {
		// Tone.js unavailable in this environment
	}
}

function readCenter(
	gl: THREE.WebGLRenderer,
	rt: THREE.WebGLRenderTarget | null,
): [number, number, number, number] {
	const w = rt ? rt.width  : gl.domElement.width;
	const h = rt ? rt.height : gl.domElement.height;
	const buf = new Uint8Array(4);
	gl.setRenderTarget(rt);
	const ctx = gl.getContext() as WebGLRenderingContext;
	ctx.readPixels(w >> 1, h >> 1, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, buf);
	return [buf[0], buf[1], buf[2], buf[3]];
}

export function WoscopeSceneR3F() {
	const { swapXY, invertXY, gain, intensity, hue } = useAxis();
	const { crtEnabled, persistence, glowStrength, scatterStrength, lanczosEnabled, lanczosSteps } = useEffects();
	const { camera, size, invalidate } = useThree();

	// Track multichannel mode via a ref so useFrame always sees the latest value
	const isMultichannel = useDawStore(s => {
		const master = s.nodes.find(n => n.id === MASTER_NODE_ID);
		return (master?.data as MasterOutputNodeData | undefined)?.mode === 'multichannel';
	});
	const isMultichannelRef = useRef(isMultichannel);
	useEffect(() => { isMultichannelRef.current = isMultichannel; }, [isMultichannel]);

	useEffect(() => {
		const cam = camera as THREE.OrthographicCamera;
		const aspect = size.width / size.height;
		if (aspect >= 1) {
			cam.left = -aspect; cam.right  =  aspect;
			cam.top  =  1;      cam.bottom = -1;
		} else {
			cam.left = -1;         cam.right  = 1;
			cam.top  = 1 / aspect; cam.bottom = -(1 / aspect);
		}
		cam.near = -1; cam.far = 1;
		cam.position.set(0, 0, 0);
		cam.updateProjectionMatrix();
		invalidate();
	}, [camera, size, invalidate]);

	// ── scene resources ───────────────────────────────────────────────────────
	const { lineRT, blur1RT, blur2RT, blur3RT, blur4RT } = useRenderTargets();
	const { fadeScene, fadeMat }                         = useFadePass();
	const { geometry, lineMat, lineScene,
	        startArray, endArray, aIdxArray,
	        aColorArray }                                = useLineMesh();
	const { whiteTex, screenTextureRef }                 = useCRTTexture();
	const { passScene, passQuad, copyMat,
	        blurMat, outputMat }                          = usePassPipeline();
	const { upsamplerRef, smoothedX, smoothedY,
	        smoothedR, smoothedG, smoothedB, smoothedA,
	        nPointsRef }                                  = useLanczos(lanczosSteps);

	useEffect(() => {
		invalidate();
	}, [gain, intensity, hue, crtEnabled, persistence, glowStrength, scatterStrength, invertXY, swapXY, invalidate]);

	const gainPowRef      = useRef(Math.pow(2, gain));
	const intensityPowRef = useRef(0.005 * Math.pow(2, intensity));
	const exposurePowRef  = useRef(Math.pow(2, intensity - 2));
	const persistPowRef   = useRef(Math.pow(0.5, persistence));
	useEffect(() => {
		gainPowRef.current      = Math.pow(2, gain);
		intensityPowRef.current = 0.005 * Math.pow(2, intensity);
		exposurePowRef.current  = Math.pow(2, intensity - 2);
		persistPowRef.current   = Math.pow(0.5, persistence);
	}, [gain, intensity, persistence]);

	const hueColourRef = useRef(getColourFromHue(hue));
	useEffect(() => {
		hueColourRef.current = getColourFromHue(hue);
	}, [hue]);

	const prevNPointsRef = useRef(-1);
	const frameCountRef  = useRef(0);

	useFrame(({ gl, camera: cam, invalidate: inv }) => {
		const waveform = getWaveformData();
		let xBuf: Float32Array = swapXY ? waveform.y : waveform.x;
		let yBuf: Float32Array = swapXY ? waveform.x : waveform.y;
		let rBuf: Float32Array = waveform.r;
		let gBuf: Float32Array = waveform.g;
		let bBuf: Float32Array = waveform.b;
		let aBuf: Float32Array = waveform.a;

		let nPoints: number = N_SAMPLES;
		if (lanczosEnabled) {
			upsamplerRef.current.apply(xBuf, smoothedX.current);
			upsamplerRef.current.apply(yBuf, smoothedY.current);
			upsamplerRef.current.apply(rBuf, smoothedR.current);
			upsamplerRef.current.apply(gBuf, smoothedG.current);
			upsamplerRef.current.apply(bBuf, smoothedB.current);
			upsamplerRef.current.apply(aBuf, smoothedA.current);
			nPoints = upsamplerRef.current.outputLength;
			xBuf = smoothedX.current;
			yBuf = smoothedY.current;
			rBuf = smoothedR.current;
			gBuf = smoothedG.current;
			bBuf = smoothedB.current;
			aBuf = smoothedA.current;
		}

		updateGeometryArrays(nPoints, aIdxArray, startArray, endArray, xBuf, yBuf);

		// Fill per-point colour buffer
		const [hr, hg, hb] = hueColourRef.current;
		const multi = isMultichannelRef.current;
		for (let i = 0; i < nPoints; i++) {
			const cr = multi ? 0.5 + 0.5 * rBuf[i] : hr;
			const cg = multi ? 0.5 + 0.5 * gBuf[i] : hg;
			const cb = multi ? 0.5 + 0.5 * bBuf[i] : hb;
			const ca = multi ? 0.5 + 0.5 * aBuf[i] : 1.0;
			const base = i * 4 * 4; // 4 verts × 4 floats
			for (let v = 0; v < 4; v++) {
				const off = base + v * 4;
				aColorArray[off    ] = cr;
				aColorArray[off + 1] = cg;
				aColorArray[off + 2] = cb;
				aColorArray[off + 3] = ca;
			}
		}

		(geometry.getAttribute('aStart') as THREE.BufferAttribute).needsUpdate = true;
		(geometry.getAttribute('aEnd')   as THREE.BufferAttribute).needsUpdate = true;
		(geometry.getAttribute('aIdx')   as THREE.BufferAttribute).needsUpdate = true;
		(geometry.getAttribute('aColor') as THREE.BufferAttribute).needsUpdate = true;
		geometry.setDrawRange(0, (nPoints - 1) * 2 * 3);
		nPointsRef.current = nPoints;

		if (isDebugMode) {
			const dbg = getWaveformData();
			let lMin = Infinity, lMax = -Infinity;
			for (let i = 0; i < dbg.x.length; i++) {
				if (dbg.x[i] < lMin) lMin = dbg.x[i];
				if (dbg.x[i] > lMax) lMax = dbg.x[i];
			}
			let rMin = Infinity, rMax = -Infinity;
			for (let i = 0; i < dbg.y.length; i++) {
				if (dbg.y[i] < rMin) rMin = dbg.y[i];
				if (dbg.y[i] > rMax) rMax = dbg.y[i];
			}
			debugRef.current.waveformLeft  = { min: lMin, max: lMax, sample: Array.from(dbg.x.subarray(0, 4)) };
			debugRef.current.waveformRight = { min: rMin, max: rMax, sample: Array.from(dbg.y.subarray(0, 4)) };
			debugRef.current.nPoints       = nPoints;

			// Silence detector: track when waveform energy drops to near-zero and when it resumes.
			// silenceEndMs >= silenceStartMs means "was silent, now recovered"; the inverse means "currently silent".
			const isSilent = Math.abs(lMax) < 0.001 && Math.abs(rMax) < 0.001;
			const wasSilent = debugRef.current.silenceStartMs > debugRef.current.silenceEndMs;
			if (isSilent && !wasSilent) {
				debugRef.current.silenceStartMs = performance.now();
			} else if (!isSilent && wasSilent) {
				debugRef.current.silenceEndMs = performance.now();
			}
		}

		const screenTex = crtEnabled && screenTextureRef.current
			? screenTextureRef.current
			: whiteTex;
		const lm = lineMat as THREE.ShaderMaterial;
		lm.uniforms.uScreen.value     = screenTex;
		lm.uniforms.uInvert.value     = invertXY ? -1 : 1;
		lm.uniforms.uSize.value       = DEFAULT_AUDIO_SETTINGS.lineSize;
		lm.uniforms.uGain.value       = gainPowRef.current;
		if (nPointsRef.current !== prevNPointsRef.current) {
			lm.uniforms.uNEdges.value = nPointsRef.current - 1;
			prevNPointsRef.current = nPointsRef.current;
		}
		lm.uniforms.uFadeAmount.value = FADE_AMOUNT;
		lm.uniforms.uIntensity.value  = intensityPowRef.current;

		gl.autoClear = false;
		fadeMat.uniforms.uAlpha.value = persistPowRef.current * FADE_AMOUNT;
		gl.setRenderTarget(lineRT);
		gl.render(fadeScene, cam);

		if (isDebugMode) debugRef.current.lineRTPixelAfterFade = readCenter(gl, lineRT);

		gl.render(lineScene, cam);

		if (isDebugMode) debugRef.current.lineRTPixelAfterLine = readCenter(gl, lineRT);

		passQuad.material = copyMat;
		copyMat.uniforms.uTexture0.value = lineRT.texture;
		gl.setRenderTarget(blur1RT);
		gl.clear();
		gl.render(passScene, cam);

		passQuad.material = blurMat;
		blurMat.uniforms.uTexture0.value = blur1RT.texture;
		blurMat.uniforms.uOffset.value.set(1 / 256, 0);
		gl.setRenderTarget(blur2RT);
		gl.clear();
		gl.render(passScene, cam);

		blurMat.uniforms.uTexture0.value = blur2RT.texture;
		blurMat.uniforms.uOffset.value.set(0, 1 / 256);
		gl.setRenderTarget(blur1RT);
		gl.clear();
		gl.render(passScene, cam);

		if (isDebugMode) debugRef.current.blur1RTPixel = readCenter(gl, blur1RT);

		passQuad.material = copyMat;
		copyMat.uniforms.uTexture0.value = blur1RT.texture;
		gl.setRenderTarget(blur3RT);
		gl.clear();
		gl.render(passScene, cam);

		passQuad.material = blurMat;
		blurMat.uniforms.uTexture0.value = blur3RT.texture;
		blurMat.uniforms.uOffset.value.set(1 / 32, 1 / 60);
		gl.setRenderTarget(blur4RT);
		gl.clear();
		gl.render(passScene, cam);

		blurMat.uniforms.uTexture0.value = blur4RT.texture;
		blurMat.uniforms.uOffset.value.set(-1 / 60, 1 / 32);
		gl.setRenderTarget(blur3RT);
		gl.clear();
		gl.render(passScene, cam);

		if (isDebugMode) debugRef.current.blur3RTPixel = readCenter(gl, blur3RT);

		passQuad.material = outputMat;
		outputMat.uniforms.uTexture0.value        = lineRT.texture;
		outputMat.uniforms.uTexture1.value        = blur1RT.texture;
		outputMat.uniforms.uTexture2.value        = blur3RT.texture;
		outputMat.uniforms.uTexture3.value        = screenTex;
		outputMat.uniforms.uExposure.value        = exposurePowRef.current;
		outputMat.uniforms.uGlowStrength.value    = glowStrength;
		outputMat.uniforms.uScatterStrength.value = scatterStrength;
		gl.autoClear = true;
		gl.setRenderTarget(null);
		gl.render(passScene, cam);

		if (isDebugMode) {
			debugRef.current.canvasPixelAfterBlit = readCenter(gl, null);
			debugRef.current.shaderPrograms       = gl.info.programs?.length ?? 0;
			debugRef.current.frameCount           = ++frameCountRef.current;
			debugRef.current.audioContextState    = _debugGetToneContext?.().state ?? 'unavailable';
		}

		inv();
	}, 1);

	return null;
}
