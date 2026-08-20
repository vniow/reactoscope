import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAxis, useEffects } from '../../contexts/WoahscopeContext';
import { updateGeometryArrays } from '../../woahscope/utils';
import { DEFAULT_AUDIO_SETTINGS } from '../../config';
import { readWaveformTap, getSampleRate, getSceneInputPhase } from '../../audio/engine';
import type { TapCursor } from '../../audio/engine';
import {
	N_SAMPLES,
	FADE_AMOUNT,
	useRenderTargets,
	useFadePass,
	useLineMesh,
	useCRTTexture,
	usePassPipeline,
} from '../../woahscope/sceneHooks';
import {
	buildSweepPositions,
	findTriggerOffset,
	channelColour,
	type ChannelId,
} from '../../woahscope/sweepUtils';

// Default display window: half the analyser buffer, leaving headroom for the
// trigger search when no period information is available.
const DISPLAY_SAMPLES = N_SAMPLES >> 1;

const ALL_CHANNELS: ChannelId[] = ['x', 'y', 'r', 'g', 'b', 'z'];

export type TriggerMode = 'clock' | 'edge' | 'free';

interface Props {
	activeChannels:     ChannelId[];
	scanFrequency:      number;
	sceneInputChannels: Set<ChannelId>;
	triggerMode:        TriggerMode;
	phaseOffset:        number;
}

export function SweepSceneR3F({ activeChannels, scanFrequency, sceneInputChannels, triggerMode, phaseOffset }: Props) {
	const { intensity } = useAxis();
	const { crtEnabled, persistence, glowStrength, scatterStrength } = useEffects();
	const { camera, invalidate } = useThree();

	// NDC-space camera: x and y both span [-1, +1] regardless of panel aspect
	useEffect(() => {
		const cam = camera as THREE.OrthographicCamera;
		cam.left = -1; cam.right = 1;
		cam.top  =  1; cam.bottom = -1;
		cam.near = -1; cam.far   =  1;
		cam.position.set(0, 0, 0);
		cam.updateProjectionMatrix();
		invalidate();
	}, [camera, invalidate]);

	// Six line meshes — one per channel, always created, hidden when inactive
	const mesh0 = useLineMesh(); // X
	const mesh1 = useLineMesh(); // Y
	const mesh2 = useLineMesh(); // R
	const mesh3 = useLineMesh(); // G
	const mesh4 = useLineMesh(); // B
	const mesh5 = useLineMesh(); // Z

	const meshMap = useMemo(() => ({
		x: mesh0, y: mesh1, r: mesh2,
		g: mesh3, b: mesh4, z: mesh5,
	} as Record<ChannelId, typeof mesh0>), [mesh0, mesh1, mesh2, mesh3, mesh4, mesh5]);

	const { lineRT, blur1RT, blur2RT, blur3RT, blur4RT } = useRenderTargets();
	const { fadeScene, fadeMat }                         = useFadePass();
	const { whiteTex, screenTextureRef }                 = useCRTTexture();
	const { passScene, passQuad, copyMat, blurMat, outputMat } = usePassPipeline();

	// Sample rate is stable for the session — read once on mount
	const sampleRateRef = useRef(getSampleRate());
	const tapCursorRef  = useRef<TapCursor>({ last: 0 });

	// Refs keep frame-loop closures current without requiring re-subscription
	const gainPowRef      = useRef(1.0);
	const intensityPowRef = useRef(0.005 * Math.pow(2, intensity));
	const exposurePowRef  = useRef(Math.pow(2, intensity - 2));
	const persistPowRef   = useRef(Math.pow(0.5, persistence));
	useEffect(() => {
		intensityPowRef.current = 0.005 * Math.pow(2, intensity);
		exposurePowRef.current  = Math.pow(2, intensity - 2);
		persistPowRef.current   = Math.pow(0.5, persistence);
		invalidate();
	}, [intensity, persistence, invalidate]);

	useEffect(() => { invalidate(); }, [crtEnabled, glowStrength, scatterStrength, invalidate]);

	const activeChannelsRef     = useRef(activeChannels);
	const scanFrequencyRef      = useRef(scanFrequency);
	const sceneInputChannelsRef = useRef(sceneInputChannels);
	const triggerModeRef        = useRef(triggerMode);
	const phaseOffsetRef        = useRef(phaseOffset);
	useEffect(() => {
		activeChannelsRef.current     = activeChannels;
		scanFrequencyRef.current      = scanFrequency;
		sceneInputChannelsRef.current = sceneInputChannels;
		triggerModeRef.current        = triggerMode;
		phaseOffsetRef.current        = phaseOffset;
		invalidate();
	}, [activeChannels, scanFrequency, sceneInputChannels, triggerMode, phaseOffset, invalidate]);

	// Scratch buffers — sized to the maximum possible display window
	const sweepX = useMemo(() => new Float32Array(N_SAMPLES), []);
	const sweepY = useMemo(() => new Float32Array(N_SAMPLES), []);

	useFrame(({ gl, camera: cam, invalidate: inv }) => {
		// Only render when the tap has produced a new frame; falls back to
		// analyser reads until the capture worklet's first frame arrives.
		const waveform = readWaveformTap(tapCursorRef.current);
		if (waveform === null) { inv(); return; }
		const active        = activeChannelsRef.current;
		const nLanes        = active.length;
		const scanFreq      = scanFrequencyRef.current;
		const sceneInputChs = sceneInputChannelsRef.current;
		const sampleRate    = sampleRateRef.current;

		const screenTex = crtEnabled && screenTextureRef.current
			? screenTextureRef.current
			: whiteTex;

		for (const chId of ALL_CHANNELS) {
			const mesh      = meshMap[chId];
			const activeIdx = active.indexOf(chId);
			const isActive  = activeIdx !== -1;

			const meshObj = mesh.lineScene.children[0] as THREE.Mesh;
			meshObj.visible = isActive;
			if (!isActive || nLanes === 0) continue;

			// ── Determine display window and trigger search range ──────────────
			let displaySamples: number;
			let searchWindow:   number;
			const period = Math.round(sampleRate / scanFreq);

			if (sceneInputChs.has(chId)) {
				if (period >= N_SAMPLES) {
					// Scan rate so low the period exceeds the buffer — best-effort
					displaySamples = DISPLAY_SAMPLES;
					searchWindow   = DISPLAY_SAMPLES;
				} else {
					displaySamples = Math.min(period, N_SAMPLES);
					searchWindow   = Math.min(period, N_SAMPLES - displaySamples - 1);
				}
			} else {
				// Non-SceneInput source: edge trigger across the full default window
				displaySamples = DISPLAY_SAMPLES;
				searchWindow   = DISPLAY_SAMPLES;
			}

			// ── Compute buffer start offset ────────────────────────────────────
			const mode            = triggerModeRef.current;
			const phaseOffSamples = Math.floor(phaseOffsetRef.current * period);

			let startSample: number;
			if (mode === 'clock' && sceneInputChs.has(chId)) {
				// _phaseView[0] is the worklet's _index at the end of its last audio block —
				// this is the phase of the most recent sample in the analyser buffer.
				// Dividing by step gives how many samples ago this cycle started.
				const phase    = getSceneInputPhase();             // 0–1
				const step     = scanFreq / sampleRate;            // fraction per sample
				const agoSamples = Math.floor(phase / step);       // samples since last cycle boundary
				startSample = (N_SAMPLES - 1) - agoSamples + phaseOffSamples;
				if (startSample + displaySamples > N_SAMPLES) startSample -= period;
				if (startSample < 0)                          startSample += period;
				startSample = Math.max(0, Math.min(N_SAMPLES - displaySamples, startSample));
			} else if (mode === 'edge') {
				const raw = findTriggerOffset(waveform[chId], displaySamples, 0.1, searchWindow);
				startSample = Math.max(0, Math.min(N_SAMPLES - displaySamples, raw + phaseOffSamples));
			} else {
				// free: fixed position in buffer — PHASE scrolls through it
				startSample = Math.max(0, Math.min(N_SAMPLES - displaySamples, phaseOffSamples));
			}

			buildSweepPositions(
				waveform[chId], startSample, displaySamples,
				activeIdx, nLanes, gainPowRef.current, sweepX, sweepY,
			);
			updateGeometryArrays(
				displaySamples, mesh.aIdxArray, mesh.startArray, mesh.endArray, sweepX, sweepY,
			);

			const [cr, cg, cb] = channelColour(chId);
			for (let i = 0; i < displaySamples; i++) {
				const base = i * 4 * 4;
				for (let v = 0; v < 4; v++) {
					const off = base + v * 4;
					mesh.aColorArray[off    ] = cr;
					mesh.aColorArray[off + 1] = cg;
					mesh.aColorArray[off + 2] = cb;
					mesh.aColorArray[off + 3] = 1.0;
				}
			}

			(mesh.geometry.getAttribute('aStart') as THREE.BufferAttribute).needsUpdate = true;
			(mesh.geometry.getAttribute('aEnd')   as THREE.BufferAttribute).needsUpdate = true;
			(mesh.geometry.getAttribute('aIdx')   as THREE.BufferAttribute).needsUpdate = true;
			(mesh.geometry.getAttribute('aColor') as THREE.BufferAttribute).needsUpdate = true;
			mesh.geometry.setDrawRange(0, (displaySamples - 1) * 2 * 3);

			const lm = mesh.lineMat as THREE.ShaderMaterial;
			lm.uniforms.uScreen.value     = screenTex;
			lm.uniforms.uInvert.value     = 1;
			lm.uniforms.uSize.value       = DEFAULT_AUDIO_SETTINGS.lineSize;
			lm.uniforms.uGain.value       = 1.0; // gain pre-applied in buildSweepPositions
			lm.uniforms.uNEdges.value     = displaySamples - 1;
			lm.uniforms.uFadeAmount.value = FADE_AMOUNT;
			// The shader normalizes brightness by segment length; compensate so Hz changes don't dim the line.
			lm.uniforms.uIntensity.value  = intensityPowRef.current * DISPLAY_SAMPLES / displaySamples;
		}

		// ── Render pipeline ────────────────────────────────────────────────────
		gl.autoClear = false;
		fadeMat.uniforms.uAlpha.value = persistPowRef.current * FADE_AMOUNT;
		gl.setRenderTarget(lineRT);
		gl.render(fadeScene, cam);

		for (const chId of ALL_CHANNELS) {
			if (active.includes(chId)) gl.render(meshMap[chId].lineScene, cam);
		}

		// Tight glow — two-pass horizontal/vertical Gaussian at 256px
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

		// Wide scatter — two-pass diagonal Gaussian at 32px
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

		// Final composite to screen
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
