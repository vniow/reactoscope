import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAxis, useEffects } from '../../contexts/WoahscopeContext';
import { updateGeometryArrays } from '../../woahscope/utils';
import { whiteTexture } from '../../woahscope/materials';
import type { ScannerAxis } from '../../dsp/scannerAxis';
import { writeLaserReadout } from './laserReadout';
import { readWaveformTap, getSampleRate } from '../../audio/engine';
import type { TapCursor } from '../../audio/engine';
import { isMasterMultichannel } from '../../store/daw';
import { useDawStore } from '../../store/daw';
import {
	FADE_AMOUNT,
	MAX_POINTS,
	useRenderTargets,
	useFadePass,
	useLineMesh,
	usePassPipeline,
	useLanczos,
} from '../../woahscope/sceneHooks';

// ─── Shared laser Beam Emulator renderer ────────────────────────────────────
// Drives both Galvo Laser and MEMS Laser. The two devices differ *only* in
// their Scanner Model — everything downstream of it (tracking-error gate,
// Z shaping, exposure integration, Lanczos, the line/blur/output pipeline) is
// laser-generic — so they share this component and supply their own axis
// factories (ADR-0012, sub-decision 6). The `ScannerAxis` interface is
// therefore the actual plug-in point ADR-0010 promised, rather than a seam in
// name only.
//
// Still a sibling to WoscopeSceneR3F rather than a mode flag on it: the CRT
// renders the commanded path and has no Scanner Model at all, so folding it in
// would tangle genuinely different physical models in one useFrame (ADR-0010).
// Reuses woahscope/sceneHooks exactly as SweepSceneR3F already does.
//
// A few mappings the specs describe in words but don't pin to an exact
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
//    FADE_AMOUNT constant the CRT view uses, since nothing in either device's
//    parameter tables names a replacement for it.
//
// Tracking-error blanking (`trackingBlankThreshold`): Z is deliberately
// unlagged (see the chain comment on the `useFrame` body below), which means
// it unblanks the instant the *commanded* position reaches a blank-travel
// target — but the Scanner Model's *actual* output is still lagging behind,
// mid-transit, for many samples after that. Confirmed by direct
// instrumentation, not theory: raw tap data showed Z correctly dropping to
// -1 exactly at a blank-travel jump and unblanking only at a
// zero-distance sample — the bug was one layer downstream, in the gap
// between when Z says "bright" and when the lagged beam is actually there.
// Real laser rigs solve the identical problem with TTL blanking during fast
// repositioning; this is that same fix, gated on |commanded - actual|
// exceeding a threshold small enough to leave ordinary corner-rounding lag
// (a much smaller, intentional artifact) alone. It matters for MEMS too, where
// the lag comes from band-limiting rather than slew-limiting but produces the
// same commanded-versus-actual gap.
//
// `trackingBlankSoftness` softens that gate from a hard cutoff into a
// smoothstep ramp — a hard cutoff has its own small residual artifact (a
// "pop-in" the instant tracking error crosses back under the threshold,
// since crossing the threshold means "close enough," not "settled").

const white = whiteTexture();

/**
 * Beam, optics, integration and display parameters. Identical in meaning for
 * every laser device, which is why they live on this shared component rather
 * than in either device's Scanner Model. Each device stores its own values
 * (under its own localStorage prefix) so the two can be tuned independently
 * and compared by switching between them.
 */
export interface LaserOptics {
	spotSize: number;
	power: number;
	gainR: number;
	gainG: number;
	gainB: number;
	blankFloor: number;
	zGamma: number;
	exposureTime: number;
	glowStrength: number;
	hazeStrength: number;
	whitePoint: number;
	trackingBlankThreshold: number;
	trackingBlankSoftness: number;
}

export interface LaserSceneProps {
	/**
	 * Builds this frame's X-axis Scanner Model. Callers must memoise it on their
	 * own parameter object, because a new identity is what triggers the rebuild
	 * effect below — that is how a slider edit reaches the model.
	 */
	makeAxisX: (sampleRate: number) => ScannerAxis;
	makeAxisY: (sampleRate: number) => ScannerAxis;
	/** When false, renders the commanded path — a direct A/B against the CRT view. */
	scannerEnabled: boolean;
	optics: LaserOptics;
}

/**
 * Smoothstep gate: 1 (fully open) at distance=innerRadius, 0 (fully closed)
 * at distance=threshold, ramping between. innerRadius===threshold (softness
 * 0) reproduces a hard cutoff exactly, without dividing by zero.
 */
function trackingGateFactor(distance: number, threshold: number, innerRadius: number): number {
	if (threshold <= innerRadius) return distance <= threshold ? 1 : 0;
	const t = Math.min(1, Math.max(0, (threshold - distance) / (threshold - innerRadius)));
	return t * t * (3 - 2 * t);
}

export function LaserSceneR3F({ makeAxisX, makeAxisY, scannerEnabled, optics }: LaserSceneProps) {
	const { swapXY, invertXY, intensity } = useAxis();
	const { lanczosEnabled, lanczosSteps, nSamples } = useEffects();
	const {
		trackingBlankThreshold, trackingBlankSoftness,
		spotSize, power, gainR, gainG, gainB, blankFloor, zGamma,
		exposureTime, glowStrength, hazeStrength, whitePoint,
	} = optics;
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
	// Reconstructions of the *commanded* (pre-Scanner-Model) position, at the
	// same upsampled resolution as smoothedX/Y — needed to compute tracking
	// error against the actual (lagged) position below. Not part of
	// useLanczos's own return since that hook is shared with the CRT view,
	// which has no such concept.
	const smoothedCmdX = useRef(new Float32Array(MAX_POINTS));
	const smoothedCmdY = useRef(new Float32Array(MAX_POINTS));

	useEffect(() => { invalidate(); }, [
		intensity, invertXY, swapXY, scannerEnabled, trackingBlankThreshold, trackingBlankSoftness,
		spotSize, power, gainR, gainG, gainB, blankFloor, zGamma,
		exposureTime, glowStrength, hazeStrength, whitePoint,
		invalidate,
	]);

	// ── Scanner Model — one instance per axis, rebuilt on parameter change ──
	// Coefficients are baked in at construction, so a parameter edit means a new
	// instance, not a live update. lastPos*Ref tracks each axis's own most
	// recent output so the rebuilt instance can warm-start there: the physical
	// mirror doesn't teleport just because a slider moved, even though its
	// *future* dynamics just changed.
	const scannerXRef = useRef<ScannerAxis | null>(null);
	const scannerYRef = useRef<ScannerAxis | null>(null);
	const lastPosXRef = useRef(0);
	const lastPosYRef = useRef(0);
	const resetCountRef = useRef(0);

	useEffect(() => {
		const axis = makeAxisX(getSampleRate());
		axis.reset(lastPosXRef.current);
		scannerXRef.current = axis;
	}, [makeAxisX]);

	useEffect(() => {
		const axis = makeAxisY(getSampleRate());
		axis.reset(lastPosYRef.current);
		scannerYRef.current = axis;
	}, [makeAxisY]);

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

		const xCommanded = swapXY ? waveform.y : waveform.x;
		const yCommanded = swapXY ? waveform.x : waveform.y;
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
			scannerXAxis.reset(xCommanded[0]);
			scannerYAxis.reset(yCommanded[0]);
			resetCountRef.current++;
		}

		// xActual/yActual: the Scanner Model's simulated real mirror position.
		// Deliberately kept distinct from xCommanded/yCommanded (never
		// overwritten in place) — the tracking-error gate below needs both.
		let xActual = xCommanded;
		let yActual = yCommanded;
		if (scannerEnabled) {
			xActual = scannerXAxis.process(xCommanded);
			yActual = scannerYAxis.process(yCommanded);
		}
		lastPosXRef.current = xActual[xActual.length - 1];
		lastPosYRef.current = yActual[yActual.length - 1];

		let nPoints = nSamples;
		let xOut = xActual, yOut = yActual;
		let cmdXOut = xCommanded, cmdYOut = yCommanded;
		if (lanczosEnabled) {
			upsamplerRef.current.apply(xActual, smoothedX.current);
			upsamplerRef.current.apply(yActual, smoothedY.current);
			upsamplerRef.current.apply(rBuf, smoothedR.current);
			upsamplerRef.current.apply(gBuf, smoothedG.current);
			upsamplerRef.current.apply(bBuf, smoothedB.current);
			// Z is a hard blanked/visible gate, not a continuous quantity — sinc
			// interpolation smears a sharp transition into a ramp, leaking
			// brightness across blank-travel jumps. applyMin (same fix as
			// aa103b1's for the CRT renderer's alpha channel) uses only the two
			// raw samples bracketing each output position instead.
			upsamplerRef.current.applyMin(zBuf, smoothedZ.current);
			// Same reconstruction as the actual position, applied to the
			// commanded one — needed for a like-for-like tracking-error
			// comparison at the same (upsampled) resolution below.
			upsamplerRef.current.apply(xCommanded, smoothedCmdX.current);
			upsamplerRef.current.apply(yCommanded, smoothedCmdY.current);
			nPoints = upsamplerRef.current.outputLength;
			xOut = smoothedX.current;
			yOut = smoothedY.current;
			cmdXOut = smoothedCmdX.current;
			cmdYOut = smoothedCmdY.current;
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

		updateGeometryArrays(nPoints, aIdxArray, startArray, endArray, xOut, yOut);

		const multi = isMultichannelRef.current;
		const floorSpan = Math.max(1e-6, 1 - blankFloor);
		const trackingInnerRadius = trackingBlankThreshold * (1 - trackingBlankSoftness);
		// Tracking-error telemetry accumulates inside the colour loop below,
		// which already computes the per-point error for the blanking gate —
		// so the readout costs an add and a compare, not a second pass.
		let trackErrSumSq = 0;
		let trackErrPeak  = 0;
		for (let i = 0; i < nPoints; i++) {
			const cr = (multi ? 0.5 + 0.5 * rOut[i] : 0.5) * gainR;
			const cg = (multi ? 0.5 + 0.5 * gOut[i] : 0.5) * gainG;
			const cb = (multi ? 0.5 + 0.5 * bOut[i] : 0.5) * gainB;
			// Segment i spans sample[i] -> sample[i+1] but is drawn as one
			// uniformly-coloured quad (vsLine.glsl) — colouring from sample[i]
			// alone means a visible->blank transition segment renders at
			// sample[i]'s full brightness across its whole geometric length
			// (same leak as aa103b1's CRT-renderer fix). Taking the min of both
			// endpoints' raw Z before shaping makes the whole segment blank if
			// either end is; the floor/gamma mapping below is monotonic, so
			// shaping the min is equivalent to (and cheaper than) shaping both
			// endpoints and taking the min of the results.
			const j = i + 1 < nPoints ? i + 1 : i;
			const zRaw = Math.min(zOut[i], zOut[j]);
			const zNorm = Math.min(1, Math.max(0, (zRaw - blankFloor) / floorSpan));
			let ca = Math.pow(zNorm, zGamma);

			// Tracking-error gate: Z can legitimately say "bright" while the
			// Scanner Model's actual position is still lagging, mid-transit
			// toward the commanded target (see the header comment above) — force
			// blank (or fade, per trackingBlankSoftness) in that case regardless
			// of what Z says. Checked at both segment endpoints, taking whichever
			// is more closed — same "either end forces the whole segment blank"
			// principle as the Z-min logic just above, generalised to a
			// continuous factor instead of a boolean.
			const trackErrI = Math.hypot(xOut[i] - cmdXOut[i], yOut[i] - cmdYOut[i]);
			const trackErrJ = Math.hypot(xOut[j] - cmdXOut[j], yOut[j] - cmdYOut[j]);
			const gateI = trackingGateFactor(trackErrI, trackingBlankThreshold, trackingInnerRadius);
			const gateJ = trackingGateFactor(trackErrJ, trackingBlankThreshold, trackingInnerRadius);
			ca *= Math.min(gateI, gateJ);
			trackErrSumSq += trackErrI * trackErrI;
			if (trackErrI > trackErrPeak) trackErrPeak = trackErrI;
			const base = i * 4 * 4; // 4 verts × 4 floats
			for (let v = 0; v < 4; v++) {
				const off = base + v * 4;
				aColorArray[off    ] = cr;
				aColorArray[off + 1] = cg;
				aColorArray[off + 2] = cb;
				aColorArray[off + 3] = ca;
			}
		}

		// Clamp counts come from the raw (pre-Lanczos) buffers the model actually
		// saw, so the denominator is nSamples rather than nPoints. Devices with
		// no position limit don't implement clampedCount and report null.
		const clampedX = scannerXAxis.clampedCount?.();
		const clampedY = scannerYAxis.clampedCount?.();
		const clampedFraction =
			clampedX === undefined || clampedY === undefined || !scannerEnabled
				? null
				: (clampedX + clampedY) / (2 * nSamples);

		writeLaserReadout({
			trackingRms:  nPoints > 0 ? Math.sqrt(trackErrSumSq / nPoints) : 0,
			trackingPeak: trackErrPeak,
			clampedFraction,
			resetCount:   resetCountRef.current,
		});

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
