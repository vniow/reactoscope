import { Split, getContext, start as toneStart } from 'tone';
import { _audioNodes, SCENE_INPUT_ID } from './audioCore';
import type { SceneInputAudioEntry } from '../store/dawTypes';

// ─── Scene-input phase register (SharedArrayBuffer) ──────────────────────────
// The worklet writes its _index (0–1 scan phase) here every process() block.
// Reading this on the main thread gives exact phase with no currentTime uncertainty.

const _phaseSAB  = new SharedArrayBuffer(4);
const _phaseView = new Float32Array(_phaseSAB);

export function getSceneInputPhase(): number {
	return _phaseView[0];
}

// ─── Worklet stats (memory-leak-harness instrumentation) ─────────────────────
// The worklet pings these once/sec (see sceneInputProcessor.worklet.js). This is
// the only visibility into the audio thread, which performance.memory, heap
// snapshots, and renderer.info all miss entirely.

export type SceneInputWorkletStats = {
	processCallCount: number;
	frameSwapCount:   number;
	nPoints:          number;
	maxNPointsSeen:   number;
	currentTime:      number;
	receivedAt:       number; // Date.now() when the main thread got this ping
};

let _workletStats: SceneInputWorkletStats | null = null;

export function getSceneInputWorkletStats(): SceneInputWorkletStats | null {
	return _workletStats;
}

// ─── Scene Input worklet lifecycle ────────────────────────────────────────────

export async function initSceneInput(): Promise<void> {
	// Tone.js v15 uses standardized-audio-context internally, so rawContext is NOT
	// a native BaseAudioContext. Use Tone's own methods to create the AudioWorklet
	// node — they handle standardized-audio-context correctly.
	const toneCtx = getContext();

	// Use rawContext.audioWorklet.addModule() directly — toneCtx.addAudioWorkletModule()
	// caches a single _workletPromise, so the first caller blocks Tone.js's own
	// internal worklets (FeedbackCombFilter, BitCrusher, etc.) from ever registering.
	await (toneCtx.rawContext as AudioContext).audioWorklet.addModule('/sceneInputProcessor.worklet.js');

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

	workletNode.port.addEventListener('message', (e: MessageEvent) => {
		if (e.data?.type === 'stats') {
			_workletStats = { ...(e.data as Omit<SceneInputWorkletStats, 'receivedAt'>), receivedAt: Date.now() };
		}
	});
	(workletNode as AudioWorkletNode).port.start();
}

let _sceneRunning = false;

export async function startSceneInput(): Promise<void> {
	await toneStart();
	_sceneRunning = true;
}

export function stopSceneInput(): void {
	_sceneRunning = false;
	// Clear the worklet's coord buffer so the oscilloscope goes silent immediately
	// rather than continuing to cycle through the last received frame.
	const entry = _audioNodes.get(SCENE_INPUT_ID);
	if (entry && entry.kind === 'sceneInput') {
		(entry.workletNode as AudioWorkletNode).port.postMessage({ type: 'clear' });
	}
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

// Coord buffer layout — must match COORD_STRIDE in scene/pathBuilder.ts:
// [x, y, r, g, b, z] per point.
const SYNTHETIC_COORD_STRIDE = 6;
const SYNTHETIC_N_POINTS     = 1024;

/**
 * Feeds the worklet one static coord buffer (a traced circle) and leaves it
 * there for the worklet to cycle through indefinitely. Used in `?isolate=audio`
 * mode (see isolationMode.ts), where no canvas is mounted to drive
 * useSceneToAudio's live WebGL scan — this exercises the worklet's own
 * long-run state (buffer swapping, frame counting, its stats-ping logic) in
 * isolation from anything WebGL. See Wayfinder issue #4.
 */
export function seedSyntheticCoordBuffer(): void {
	const node = getSceneInputWorkletNode();
	if (!node) return;

	const data = new Float32Array(SYNTHETIC_N_POINTS * SYNTHETIC_COORD_STRIDE);
	for (let i = 0; i < SYNTHETIC_N_POINTS; i++) {
		const theta = (i / SYNTHETIC_N_POINTS) * Math.PI * 2;
		const o = i * SYNTHETIC_COORD_STRIDE;
		data[o]     = Math.cos(theta);
		data[o + 1] = Math.sin(theta);
		data[o + 2] = 1; data[o + 3] = 1; data[o + 4] = 1; data[o + 5] = 1;
	}

	node.port.postMessage(
		{ type: 'path', data: data.buffer, nPoints: SYNTHETIC_N_POINTS },
		[data.buffer],
	);
}

/** Tears down the scene input worklet. Only called from the engine's unload cleanup. */
export function disposeSceneInput(): void {
	const entry = _audioNodes.get(SCENE_INPUT_ID);
	if (!entry || entry.kind !== 'sceneInput') return;
	try { entry.workletNode.disconnect(); } catch { /* already disconnected */ }
	entry.split.dispose();
	_audioNodes.delete(SCENE_INPUT_ID);
}
