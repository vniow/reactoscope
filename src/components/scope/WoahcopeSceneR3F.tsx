import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAxis, useEffects } from '../../contexts/WoahscopeContext';
import { updateGeometryArrays, getColourFromHue } from '../../woahscope/utils';
import { DEFAULT_AUDIO_SETTINGS } from '../../config';
import { readWaveformTap, setAnalyserSize, setWaveformCaptureSize } from '../../audio/engine';
import type { TapCursor } from '../../audio/engine';
import { isMasterMultichannel } from '../../store/daw';
import { useDawStore } from '../../store/daw';
import {
	N_SAMPLES,
	FADE_AMOUNT,
	useRenderTargets,
	useFadePass,
	useLineMesh,
	useCRTTexture,
	usePassPipeline,
	useLanczos,
} from '../../woahscope/sceneHooks';


export function WoscopeSceneR3F() {
	const { swapXY, invertXY, intensity, hue } = useAxis();
	const { crtEnabled, persistence, glowStrength, scatterStrength, lanczosEnabled, lanczosSteps, nSamples } = useEffects();
	const { camera, size, invalidate } = useThree();

	// Track multichannel rendering via a ref so useFrame always sees the latest value.
	// Multichannel is enabled when any R/G/B handle on master output has a wired edge.
	const isMultichannel = useDawStore(s => isMasterMultichannel(s.edges));
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
	        smoothedR, smoothedG, smoothedB, smoothedZ,
	        nPointsRef }                                  = useLanczos(lanczosSteps, nSamples);

	useEffect(() => {
		invalidate();
	}, [intensity, hue, crtEnabled, persistence, glowStrength, scatterStrength, invertXY, swapXY, invalidate]);

	useEffect(() => {
		setAnalyserSize(nSamples);
		setWaveformCaptureSize(nSamples);
	}, [nSamples]);

	const gainPowRef      = useRef(1.0);
	const intensityPowRef = useRef(0.005 * Math.pow(2, intensity));
	const exposurePowRef  = useRef(Math.pow(2, intensity - 2));
	const persistPowRef   = useRef(Math.pow(0.5, persistence));
	useEffect(() => {
		intensityPowRef.current = 0.005 * Math.pow(2, intensity);
		exposurePowRef.current  = Math.pow(2, intensity - 2);
		persistPowRef.current   = Math.pow(0.5, persistence);
	}, [intensity, persistence]);

	const hueColourRef = useRef(getColourFromHue(hue));
	useEffect(() => {
		hueColourRef.current = getColourFromHue(hue);
	}, [hue]);

	const tapCursorRef   = useRef<TapCursor>({ last: 0 });
	const prevNPointsRef = useRef(-1);

	useFrame(({ gl, camera: cam, invalidate: inv }) => {
		let xBuf: Float32Array;
		let yBuf: Float32Array;
		let rBuf: Float32Array;
		let gBuf: Float32Array;
		let bBuf: Float32Array;
		let zBuf: Float32Array;
		let nPoints: number;
		let fadeAlpha: number;

		// Full-window redraw with frame-based phosphor.
		const waveform = readWaveformTap(tapCursorRef.current);
		if (waveform === null) { inv(); return; }
		xBuf = swapXY ? waveform.y : waveform.x;
		yBuf = swapXY ? waveform.x : waveform.y;
		rBuf = waveform.r;
		gBuf = waveform.g;
		bBuf = waveform.b;
		zBuf = waveform.z;

		nPoints = N_SAMPLES;
		if (lanczosEnabled) {
			upsamplerRef.current.apply(xBuf, smoothedX.current);
			upsamplerRef.current.apply(yBuf, smoothedY.current);
			upsamplerRef.current.apply(rBuf, smoothedR.current);
			upsamplerRef.current.apply(gBuf, smoothedG.current);
			upsamplerRef.current.apply(bBuf, smoothedB.current);
			upsamplerRef.current.apply(zBuf, smoothedZ.current);
			nPoints = upsamplerRef.current.outputLength;
			xBuf = smoothedX.current;
			yBuf = smoothedY.current;
			rBuf = smoothedR.current;
			gBuf = smoothedG.current;
			bBuf = smoothedB.current;
			zBuf = smoothedZ.current;
		}

		fadeAlpha = persistPowRef.current * FADE_AMOUNT;
		updateGeometryArrays(nPoints, aIdxArray, startArray, endArray, xBuf, yBuf);

		// Fill per-point colour buffer
		const [hr, hg, hb] = hueColourRef.current;
		const multi = isMultichannelRef.current;
		for (let i = 0; i < nPoints; i++) {
			const cr = multi ? 0.5 + 0.5 * rBuf[i] : hr;
			const cg = multi ? 0.5 + 0.5 * gBuf[i] : hg;
			const cb = multi ? 0.5 + 0.5 * bBuf[i] : hb;
			const ca = 0.5 + 0.5 * zBuf[i];
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
		geometry.setDrawRange(0, Math.max(0, (nPoints - 1) * 2 * 3));
		nPointsRef.current = nPoints;

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
		fadeMat.uniforms.uAlpha.value = fadeAlpha;
		gl.setRenderTarget(lineRT);
		gl.render(fadeScene, cam);

		gl.render(lineScene, cam);

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

		inv();
	}, 1);

	return null;
}
