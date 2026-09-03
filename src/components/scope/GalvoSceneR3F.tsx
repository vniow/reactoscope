import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAxis, useEffects } from '../../contexts/WoahscopeContext';
import { useGalvo } from '../../contexts/GalvoContext';
import { updateGeometryArrays } from '../../woahscope/utils';
import { whiteTexture } from '../../woahscope/materials';
import { createScannerAxis, type ScannerAxis } from '../../galvo/scannerModel';
import { readWaveformTap, getSampleRate } from '../../audio/engine';
import type { TapCursor } from '../../audio/engine';
import { isMasterMultichannel } from '../../store/daw';
import { useDawStore } from '../../store/daw';
import {
	FADE_AMOUNT,
	useRenderTargets,
	useFadePass,
	useLineMesh,
	usePassPipeline,
	useLanczos,
} from '../../woahscope/sceneHooks';

// ─── Galvo Laser Beam Emulator ──────────────────────────────────────────────
// Sibling to WoscopeSceneR3F, not a mode flag on it — the two render
// fundamentally different things (commanded path vs. simulated actual mirror
// position) and sharing one component would tangle two physical models in
// one useFrame (ADR-0010). Reuses woahscope/sceneHooks exactly as
// SweepSceneR3F already does; see docs/galvo-laser-emulator.md for the
// signal chain and parameter tables this implements.
//
// A few mappings the spec describes in words but doesn't pin to an exact
// formula — noted here rather than left silent:
//  - Z -> alpha: `blankFloor` is a hard floor (values at/below it are exactly
//    zero, modelling a real diode's threshold current), `zGamma` reshapes the
//    curve above that floor (diode L/I response isn't linear), `power` is an
//    overall multiplier on top.
//  - `power` composes multiplicatively with the shared, device-neutral
//    `intensity` exposure curve rather than replacing it — both are named as
//    "overall brightness" controls in their respective docs, and multiplying
//    two brightness scalars is the safe, unsurprising reading when the spec
//    doesn't say one supersedes the other.
//  - `gainR/gainG/gainB` apply to whichever colour the point already has
//    (multichannel RGB or the single-hue fallback) — a diode power imbalance
//    is a hardware property independent of which colour mode is active.
//  - The per-edge `uFadeAmount` line-material uniform (a rendering-pipeline
//    recency weighting, not a physical persistence control) reuses the same
//    FADE_AMOUNT constant the CRT view uses, since nothing in the Galvo
//    parameter tables names a replacement for it.

const white = whiteTexture();

export function GalvoSceneR3F() {
	const { swapXY, invertXY, intensity } = useAxis();
	const { lanczosEnabled, lanczosSteps, nSamples } = useEffects();
	const {
		enabled, scannerX, effectiveScannerY,
		spotSize, power, gainR, gainG, gainB, blankFloor, zGamma,
		exposureTime, glowStrength, hazeStrength, whitePoint,
	} = useGalvo();
	const { camera, size, invalidate } = useThree();

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

	// ── scene resources — shared with the CRT view via woahscope/sceneHooks ──
	const { lineRT, blur1RT, blur2RT, blur3RT, blur4RT } = useRenderTargets();
	const { fadeScene, fadeMat }                         = useFadePass();
	const { geometry, lineMat, lineScene,
	        startArray, endArray, aIdxArray,
	        aColorArray }                                = useLineMesh();
	const { passScene, passQuad, copyMat,
	        blurMat, outputMat }                          = usePassPipeline();
	const { upsamplerRef, smoothedX, smoothedY,
	        smoothedR, smoothedG, smoothedB, smoothedZ,
	        nPointsRef }                                  = useLanczos(lanczosSteps, nSamples);

	useEffect(() => { invalidate(); }, [
		intensity, invertXY, swapXY, enabled,
		spotSize, power, gainR, gainG, gainB, blankFloor, zGamma,
		exposureTime, glowStrength, hazeStrength, whitePoint,
		invalidate,
	]);

	// ── Scanner Model — one instance per axis, rebuilt on parameter change ──
	// Coefficients are baked in at construction (see scannerModel.ts), so a
	// parameter edit means a new instance, not a live update. lastPos*Ref
	// tracks each axis's own most recent output so the rebuilt instance can
	// warm-start there: the physical mirror doesn't teleport just because a
	// slider moved, even though its *future* dynamics just changed.
	const scannerXRef = useRef<ScannerAxis | null>(null);
	const scannerYRef = useRef<ScannerAxis | null>(null);
	const lastPosXRef = useRef(0);
	const lastPosYRef = useRef(0);
	const resetCountRef = useRef(0);

	useEffect(() => {
		const axis = createScannerAxis(getSampleRate(), scannerX);
		axis.reset(lastPosXRef.current);
		scannerXRef.current = axis;
	}, [scannerX]);

	useEffect(() => {
		const axis = createScannerAxis(getSampleRate(), effectiveScannerY);
		axis.reset(lastPosYRef.current);
		scannerYRef.current = axis;
	}, [effectiveScannerY]);

	const intensityPowRef = useRef(0.005 * Math.pow(2, intensity));
	const exposurePowRef  = useRef(Math.pow(2, intensity - 2) * power);
	useEffect(() => {
		intensityPowRef.current = 0.005 * Math.pow(2, intensity);
		exposurePowRef.current  = Math.pow(2, intensity - 2) * power;
	}, [intensity, power]);

	const tapCursorRef   = useRef<TapCursor>({ last: 0, lastNSamples: -1 });
	const prevNPointsRef = useRef(-1);

	useFrame(({ gl, camera: cam, invalidate: inv }) => {
		const waveform = readWaveformTap(tapCursorRef.current);
		if (waveform === null) { inv(); return; }

		let xBuf = swapXY ? waveform.y : waveform.x;
		let yBuf = swapXY ? waveform.x : waveform.y;
		const rBuf = waveform.r;
		const gBuf = waveform.g;
		const bBuf = waveform.b;
		const zBuf = waveform.z;

		const scannerXAxis = scannerXRef.current!;
		const scannerYAxis = scannerYRef.current!;

		// Tap discontinuity: warm-start to the *incoming* commanded position —
		// real data was lost, so "assume it was already there" is the honest
		// guess (ADR-0010, sub-decision 3). Distinct from the parameter-change
		// warm-start above, which preserves the *previous* physical position
		// instead, because nothing was actually lost in that case.
		if (waveform.continuity !== 'contiguous') {
			scannerXAxis.reset(xBuf[0]);
			scannerYAxis.reset(yBuf[0]);
			resetCountRef.current++;
		}

		if (enabled) {
			xBuf = scannerXAxis.process(xBuf);
			yBuf = scannerYAxis.process(yBuf);
		}
		lastPosXRef.current = xBuf[xBuf.length - 1];
		lastPosYRef.current = yBuf[yBuf.length - 1];

		let nPoints = nSamples;
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
		}
		const rOut = lanczosEnabled ? smoothedR.current : rBuf;
		const gOut = lanczosEnabled ? smoothedG.current : gBuf;
		const bOut = lanczosEnabled ? smoothedB.current : bBuf;
		const zOut = lanczosEnabled ? smoothedZ.current : zBuf;

		// Exposure-time integration, not phosphor persistence: a laser spot has
		// no afterglow, what's perceived is eye/camera integration over the
		// audio time one tap frame actually covers.
		const dtSeconds = nSamples / getSampleRate();
		const fadeAlpha = 1 - Math.exp(-dtSeconds / (exposureTime / 1000));

		updateGeometryArrays(nPoints, aIdxArray, startArray, endArray, xBuf, yBuf);

		const multi = isMultichannelRef.current;
		const floorSpan = Math.max(1e-6, 1 - blankFloor);
		for (let i = 0; i < nPoints; i++) {
			const cr = (multi ? 0.5 + 0.5 * rOut[i] : 0.5) * gainR;
			const cg = (multi ? 0.5 + 0.5 * gOut[i] : 0.5) * gainG;
			const cb = (multi ? 0.5 + 0.5 * bOut[i] : 0.5) * gainB;
			const zNorm = Math.min(1, Math.max(0, (zOut[i] - blankFloor) / floorSpan));
			const ca = Math.pow(zNorm, zGamma);
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

		const lm = lineMat as THREE.ShaderMaterial;
		lm.uniforms.uScreen.value     = white;
		lm.uniforms.uInvert.value     = invertXY ? -1 : 1;
		lm.uniforms.uSize.value       = spotSize;
		lm.uniforms.uGain.value       = 1;
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
		outputMat.uniforms.uTexture3.value        = white;
		outputMat.uniforms.uExposure.value        = exposurePowRef.current;
		outputMat.uniforms.uGlowStrength.value    = glowStrength;
		outputMat.uniforms.uScatterStrength.value = hazeStrength;
		outputMat.uniforms.uWhitePoint.value      = whitePoint;
		gl.autoClear = true;
		gl.setRenderTarget(null);
		gl.render(passScene, cam);

		inv();
	}, 1);

	return null;
}
