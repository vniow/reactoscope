import { Split, getContext, start as toneStart } from 'tone';
import { _audioNodes, SCENE_INPUT_ID } from './audioCore';
import { ENGINE_INFO, ENGINE_OK } from './log';
import type { SceneInputAudioEntry } from '../store/dawTypes';

// ─── Scene-input phase register (SharedArrayBuffer) ──────────────────────────
// The worklet writes its _index (0–1 scan phase) here every process() block.
// Reading this on the main thread gives exact phase with no currentTime uncertainty.

const _phaseSAB  = new SharedArrayBuffer(4);
const _phaseView = new Float32Array(_phaseSAB);

export function getSceneInputPhase(): number {
	return _phaseView[0];
}

// ─── Scene Input worklet lifecycle ────────────────────────────────────────────

export async function initSceneInput(): Promise<void> {
	// Tone.js v15 uses standardized-audio-context internally, so rawContext is NOT
	// a native BaseAudioContext. Use Tone's own methods to create the AudioWorklet
	// node — they handle standardized-audio-context correctly.
	console.log(...ENGINE_INFO, 'initSceneInput() — loading AudioWorklet module…');
	const toneCtx    = getContext();
	const sampleRate = toneCtx.rawContext.sampleRate;

	// Use rawContext.audioWorklet.addModule() directly — toneCtx.addAudioWorkletModule()
	// caches a single _workletPromise, so the first caller blocks Tone.js's own
	// internal worklets (FeedbackCombFilter, BitCrusher, etc.) from ever registering.
	await (toneCtx.rawContext as AudioContext).audioWorklet.addModule('/sceneInputProcessor.worklet.js');
	console.log(...ENGINE_INFO, 'AudioWorklet module loaded — creating node…');

	const workletNode = toneCtx.createAudioWorkletNode('scene-input-processor', {
		numberOfOutputs:    1,
		outputChannelCount: [6],
		processorOptions:   {},
	});

	// Tone.Split(6) wraps a ChannelSplitterNode via context.createChannelSplitter,
	// keeping everything within the standardized-audio-context graph.
	const toneSplit = new Split(6);
	workletNode.connect(toneSplit.input);

	const entry: SceneInputAudioEntry = {
		kind: 'sceneInput',
		workletNode,
		split: toneSplit,
	};
	_audioNodes.set(SCENE_INPUT_ID, entry);

	// Give the worklet a direct write-path into the phase register.
	(workletNode as AudioWorkletNode).port.postMessage({ type: 'phaseBuffer', buffer: _phaseSAB });

	console.log(
		...ENGINE_OK,
		`initSceneInput() complete — sampleRate: ${sampleRate} Hz, mode: coordinate-streaming`,
	);
}

let _sceneRunning = false;

export async function startSceneInput(): Promise<void> {
	await toneStart();
	_sceneRunning = true;
	console.log(...ENGINE_OK, 'startSceneInput() — scene audio running');
}

export function stopSceneInput(): void {
	_sceneRunning = false;
	// Clear the worklet's coord buffer so the oscilloscope goes silent immediately
	// rather than continuing to cycle through the last received frame.
	const entry = _audioNodes.get(SCENE_INPUT_ID);
	if (entry && entry.kind === 'sceneInput') {
		(entry.workletNode as AudioWorkletNode).port.postMessage({ type: 'clear' });
	}
	console.log(...ENGINE_INFO, 'stopSceneInput() — scene audio stopped');
}

export function getSceneRunning(): boolean {
	return _sceneRunning;
}

/**
 * Returns the AudioWorkletNode for the scene input so the main thread can
 * forward coordinate buffers via workletNode.port.postMessage.
 * Returns null if initSceneInput() hasn't completed yet.
 */
export function getSceneInputWorkletNode(): AudioWorkletNode | null {
	const entry = _audioNodes.get(SCENE_INPUT_ID);
	if (!entry || entry.kind !== 'sceneInput') return null;
	return entry.workletNode as AudioWorkletNode;
}

/** Tears down the scene input worklet. Only called from the engine's unload cleanup. */
export function disposeSceneInput(): void {
	const entry = _audioNodes.get(SCENE_INPUT_ID);
	if (!entry || entry.kind !== 'sceneInput') return;
	try { entry.workletNode.disconnect(); } catch { /* already disconnected */ }
	entry.split.dispose();
	_audioNodes.delete(SCENE_INPUT_ID);
}

// ─── Last-coord-buffer cache ─────────────────────────────────────────────────
// Stores whichever coord buffer the path worker emitted most recently so the
// "Export ILDA" action can read it without recomputing or waiting for the
// next frame.

let _lastCoordBuffer: { data: Float32Array; nPoints: number } | null = null;

/** Called by the scene-to-audio pipeline after forwarding a fresh frame to the worklet. */
export function setLastCoordBuffer(data: Float32Array, nPoints: number): void {
	_lastCoordBuffer = { data, nPoints };
}

/** Returns the most recent coord buffer produced by the path worker, or null. */
export function getLastCoordBuffer(): { data: Float32Array; nPoints: number } | null {
	return _lastCoordBuffer;
}
