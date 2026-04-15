import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { usePlayback, useAxis, useEffects } from '../contexts/WoahscopeContext';
import { updateGeometryArrays, getColourFromHue } from '../woahscope/utils';
import { DEFAULT_AUDIO_SETTINGS } from '../config';
import { getWaveformData } from '../audio/graph';
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
	const { isPlaying } = usePlayback();
	const { swapXY, invertXY, gain, intensity, hue } = useAxis();
	const { crtEnabled, persistence, glowStrength, scatterStrength, lanczosEnabled, lanczosSteps } = useEffects();
	const { camera, size, invalidate } = useThree();


	useEffect(() => {
		const cam = camera as THREE.OrthographicCamera;
		const aspect = size.width / size.height;
		if (aspect >= 1) {
			// wider than tall — expand horizontal bounds
			cam.left = -aspect; cam.right  =  aspect;
			cam.top  =  1;      cam.bottom = -1;
		} else {
			// taller than wide — expand vertical bounds
			cam.left = -1;         cam.right  = 1;
			cam.top  = 1 / aspect; cam.bottom = -(1 / aspect);
		}
		cam.near = -1; cam.far = 1;
		cam.position.set(0, 0, 0);
		cam.updateProjectionMatrix();
		invalidate();
	}, [camera, size, invalidate]);

	// ── scene resources (lifecycle managed inside each hook) ──────────────────
	const { lineRT, blur1RT, blur2RT, blur3RT, blur4RT } = useRenderTargets();
	const { fadeScene, fadeMat }                         = useFadePass();
	const { geometry, lineMat, lineScene,
	        startArray, endArray, aIdxArray }             = useLineMesh();
	const { whiteTex, screenTextureRef }                 = useCRTTexture();
	const { passScene, passQuad, copyMat,
	        blurMat, outputMat }                          = usePassPipeline();
	const { upsamplerRef, smoothedX, smoothedY,
	        nPointsRef }                                  = useLanczos(lanczosSteps);


	useEffect(() => {
		invalidate(); // kick off a frame on any settings or playback state change
	}, [gain, intensity, hue, crtEnabled, persistence, glowStrength, scatterStrength, invertXY, swapXY, isPlaying, invalidate]);

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

	const frameCountRef = useRef(0);

	useFrame(({ gl, camera: cam, invalidate: inv }) => {
		if (isPlaying) {
			const { left, right } = getWaveformData();
			let xBuf: Float32Array = swapXY ? right : left;
			let yBuf: Float32Array = swapXY ? left  : right;

			let nPoints: number = N_SAMPLES;
			if (lanczosEnabled) {
				upsamplerRef.current.apply(xBuf, smoothedX.current);
				upsamplerRef.current.apply(yBuf, smoothedY.current);
				nPoints = upsamplerRef.current.outputLength;
				xBuf = smoothedX.current;
				yBuf = smoothedY.current;
			}

			updateGeometryArrays(nPoints, aIdxArray, startArray, endArray, xBuf, yBuf);
			(geometry.getAttribute('aStart') as THREE.BufferAttribute).needsUpdate = true;
			(geometry.getAttribute('aEnd')   as THREE.BufferAttribute).needsUpdate = true;
			(geometry.getAttribute('aIdx')   as THREE.BufferAttribute).needsUpdate = true;
			geometry.setDrawRange(0, (nPoints - 1) * 2 * 3);
			nPointsRef.current = nPoints;

			if (isDebugMode) {
				const { left: dbgLeft, right: dbgRight } = getWaveformData();
				let lMin = Infinity, lMax = -Infinity;
				for (let i = 0; i < dbgLeft.length; i++) {
					if (dbgLeft[i] < lMin) lMin = dbgLeft[i];
					if (dbgLeft[i] > lMax) lMax = dbgLeft[i];
				}
				let rMin = Infinity, rMax = -Infinity;
				for (let i = 0; i < dbgRight.length; i++) {
					if (dbgRight[i] < rMin) rMin = dbgRight[i];
					if (dbgRight[i] > rMax) rMax = dbgRight[i];
				}
				debugRef.current.waveformLeft  = { min: lMin, max: lMax, sample: Array.from(dbgLeft.subarray(0, 4)) };
				debugRef.current.waveformRight = { min: rMin, max: rMax, sample: Array.from(dbgRight.subarray(0, 4)) };
				debugRef.current.nPoints       = nPoints;
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

		const [r, g, b] = hueColourRef.current;
		passQuad.material = outputMat;
		outputMat.uniforms.uTexture0.value        = lineRT.texture;
		outputMat.uniforms.uTexture1.value        = blur1RT.texture;
		outputMat.uniforms.uTexture2.value        = blur3RT.texture;
		outputMat.uniforms.uTexture3.value        = screenTex;
		outputMat.uniforms.uExposure.value        = exposurePowRef.current;
		outputMat.uniforms.uColour.value.set(r, g, b);
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

		if (isPlaying) inv(); // keep loop running while playing; paused frames are one-shots
	}, 1);

	return null;
}
