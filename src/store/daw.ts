/**
 * DAW Zustand store — owns both the React Flow graph state and the Tone.js audio graph.
 *
 * Design notes:
 * - `_audioNodes` is a module-level Map, NOT inside Zustand state.
 *   Tone.js objects are mutable and non-serializable; keeping them outside
 *   state avoids spurious re-renders and impossible serialization.
 * - `audioVersion` is a counter in Zustand state that bumps whenever the
 *   audio topology changes, giving components a stable signal to subscribe to.
 * - The MasterOutputNode owns the stereo chain:
 *     inputGainL → merge(channel 0) → toDestination() (stereo)
 *     inputGainL → leftAnalyser  (oscilloscope X axis)
 *     inputGainR → merge(channel 1)
 *     inputGainR → rightAnalyser (oscilloscope Y axis)
 * - Handle ID convention:
 *     Source handles: 'out-0', 'out-1', ...  (position Bottom)
 *     Target handles: 'in-0',  'in-1',  ...  (position Top)
 *   MasterOutput: 'in-0' = Left, 'in-1' = Right
 */

import { create } from 'zustand';
import {
	applyNodeChanges,
	applyEdgeChanges,
	addEdge,
	reconnectEdge,
	type OnNodesChange,
	type OnEdgesChange,
	type OnConnect,
	type NodeChange,
	type Connection,
} from '@xyflow/react';
import {
	Player,
	Gain,
	Merge,
	Analyser,
	Oscillator,
	Split,
	Noise,
	Signal,
	getTransport,
	getContext,
	start as toneStart,
} from 'tone';
import { DEFAULT_AUDIO_SETTINGS } from '../config';
import type {
	AppNode,
	AppEdge,
	AudioNodeMap,
	PlayerAudioEntry,
	MasterOutputAudioEntry,
	OscillatorAudioEntry,
	GainAudioEntry,
	NoiseAudioEntry,
	DCSignalAudioEntry,
	SceneInputAudioEntry,
	StubKind,
} from './dawTypes';

const { nSamples } = DEFAULT_AUDIO_SETTINGS;

export const MASTER_NODE_ID    = 'master-output';
export const DEFAULT_PLAYER_ID = 'player-default';
export const SCENE_INPUT_ID    = 'scene-input';
export const DEBUG_NODE_ID     = 'debug-default';

// ─── Module-level audio node registry ────────────────────────────────────────

const _audioNodes: AudioNodeMap = new Map();

// ─── Master output chain (lazy init) ─────────────────────────────────────────

let _masterEntry: MasterOutputAudioEntry | null = null;

function getMasterEntry(): MasterOutputAudioEntry {
	if (_masterEntry) return _masterEntry;

	const inputGainX = new Gain();
	const inputGainY = new Gain();
	const inputGainR = new Gain();
	const inputGainG = new Gain();
	const inputGainB = new Gain();
	const inputGainA = new Gain();
	const merge      = new Merge(6);
	const xAnalyser  = new Analyser('waveform', nSamples);
	const yAnalyser  = new Analyser('waveform', nSamples);
	const rAnalyser  = new Analyser('waveform', nSamples);
	const gAnalyser  = new Analyser('waveform', nSamples);
	const bAnalyser  = new Analyser('waveform', nSamples);
	const aAnalyser  = new Analyser('waveform', nSamples);

	// connect(destination, outputNumber, inputNumber)
	inputGainX.connect(merge, 0, 0); inputGainX.connect(xAnalyser);
	inputGainY.connect(merge, 0, 1); inputGainY.connect(yAnalyser);
	inputGainR.connect(merge, 0, 2); inputGainR.connect(rAnalyser);
	inputGainG.connect(merge, 0, 3); inputGainG.connect(gAnalyser);
	inputGainB.connect(merge, 0, 4); inputGainB.connect(bAnalyser);
	inputGainA.connect(merge, 0, 5); inputGainA.connect(aAnalyser);

	merge.toDestination();

	_masterEntry = {
		kind: 'masterOutput',
		inputGainX, inputGainY, inputGainR, inputGainG, inputGainB, inputGainA,
		merge,
		xAnalyser, yAnalyser, rAnalyser, gAnalyser, bAnalyser, aAnalyser,
	};
	_audioNodes.set(MASTER_NODE_ID, _masterEntry);
	return _masterEntry;
}

// ─── getWaveformData — for the oscilloscope ───────────────────────────────────

/**
 * Returns the current waveform snapshot for both channels.
 * CONTRACT: do not hold references across async boundaries.
 * Copy the arrays if you need to retain the data.
 */
export function getWaveformData(): {
	x: Float32Array; y: Float32Array;
	r: Float32Array; g: Float32Array; b: Float32Array; a: Float32Array;
} {
	const entry = getMasterEntry();
	return {
		x: entry.xAnalyser.getValue() as Float32Array,
		y: entry.yAnalyser.getValue() as Float32Array,
		r: entry.rAnalyser.getValue() as Float32Array,
		g: entry.gAnalyser.getValue() as Float32Array,
		b: entry.bAnalyser.getValue() as Float32Array,
		a: entry.aAnalyser.getValue() as Float32Array,
	};
}

/**
 * Replaces all six analysers with new instances at the given size.
 * Existing gain→analyser connections are restored; gain→merge connections are untouched.
 */
export function setAnalyserSize(newSize: number): void {
	if (!_masterEntry) return;
	const { inputGainX, inputGainY, inputGainR, inputGainG, inputGainB, inputGainA } = _masterEntry;

	const pairs: [Gain, 'xAnalyser' | 'yAnalyser' | 'rAnalyser' | 'gAnalyser' | 'bAnalyser' | 'aAnalyser'][] = [
		[inputGainX, 'xAnalyser'],
		[inputGainY, 'yAnalyser'],
		[inputGainR, 'rAnalyser'],
		[inputGainG, 'gAnalyser'],
		[inputGainB, 'bAnalyser'],
		[inputGainA, 'aAnalyser'],
	];

	for (const [gain, key] of pairs) {
		gain.disconnect(_masterEntry[key]);
		_masterEntry[key].dispose();
		const fresh = new Analyser('waveform', newSize);
		gain.connect(fresh);
		_masterEntry[key] = fresh;
	}
}

export function getSampleRate(): number {
	return getContext().rawContext.sampleRate;
}

export function getAudioCurrentTime(): number {
	return getContext().rawContext.currentTime;
}

// ─── Scene-input phase register (SharedArrayBuffer) ──────────────────────────
// The worklet writes its _index (0–1 scan phase) here every process() block.
// Reading this on the main thread gives exact phase with no currentTime uncertainty.

const _phaseSAB  = new SharedArrayBuffer(4);
const _phaseView = new Float32Array(_phaseSAB);

export function getSceneInputPhase(): number {
	return _phaseView[0];
}

// ─── Waveform capture (SharedArrayBuffer push model) ─────────────────────────
// Layout: [writeIndex:Uint32(4B)] + [ch0..ch5: Float32[N] each]
// Worklet writes complete N-sample frames then Atomics.add(writeIndex, 1).
// Main thread Atomics.load(writeIndex) acts as an acquire fence; all preceding
// channel writes from the audio thread are visible after the counter changes.

const CAPTURE_CH = 6;
let _captureSAB:         SharedArrayBuffer | null = null;
let _captureWriteView:   Uint32Array       | null = null;
let _captureChannels:    Float32Array[]           = [];
let _captureNSamples: number                      = nSamples;
let _waveformCaptureNode: AudioWorkletNode | null = null;

function _allocCaptureSAB(n: number): void {
	_captureNSamples  = n;
	_captureSAB       = new SharedArrayBuffer(4 + CAPTURE_CH * n * 4);
	_captureWriteView = new Uint32Array(_captureSAB, 0, 1);
	_captureChannels  = [];
	for (let ch = 0; ch < CAPTURE_CH; ch++) {
		_captureChannels.push(new Float32Array(_captureSAB, 4 + ch * n * 4, n));
	}
}

export function getWaveformWriteIndex(): number {
	if (!_captureWriteView) return 0;
	return Atomics.load(_captureWriteView, 0);
}

export function getWaveformDataFromSAB(): {
	x: Float32Array; y: Float32Array;
	r: Float32Array; g: Float32Array; b: Float32Array; a: Float32Array;
} | null {
	if (_captureChannels.length < 6) return null;
	return {
		x: _captureChannels[0],
		y: _captureChannels[1],
		r: _captureChannels[2],
		g: _captureChannels[3],
		b: _captureChannels[4],
		a: _captureChannels[5],
	};
}

export function getWaveformNSamples(): number {
	return _captureNSamples;
}

export function setWaveformCaptureSize(newSize: number): void {
	if (newSize === _captureNSamples && _captureSAB) return;
	_allocCaptureSAB(newSize);
	if (_waveformCaptureNode) {
		_waveformCaptureNode.port.postMessage({
			type: 'resize', buffer: _captureSAB!, nSamples: newSize,
		});
	}
}

// ─── Audio routing helpers ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToneInputNode = any;

/** Returns the Tone.js input node for a given target handle. */
function _getTargetToneNode(
	tgt: NonNullable<ReturnType<typeof _audioNodes.get>> | MasterOutputAudioEntry,
	targetHandle: string,
): ToneInputNode | null {
	if (tgt.kind === 'masterOutput') {
		if (targetHandle === 'in-0') return tgt.inputGainX;
		if (targetHandle === 'in-1') return tgt.inputGainY;
		if (targetHandle === 'in-2') return tgt.inputGainR;
		if (targetHandle === 'in-3') return tgt.inputGainG;
		if (targetHandle === 'in-4') return tgt.inputGainB;
		if (targetHandle === 'in-5') return tgt.inputGainA;
		return null;
	}
	if (tgt.kind === 'gain') return tgt.toneNode;
	if (tgt.kind === 'noise') return tgt.toneNode;
	return null;
}

function connectAudioNodes(
	sourceId:     string,
	sourceHandle: string,
	targetId:     string,
	targetHandle: string,
): void {
	const src = _audioNodes.get(sourceId);
	const tgt = targetId === MASTER_NODE_ID
		? getMasterEntry()
		: _audioNodes.get(targetId);
	if (!src || !tgt) return;

	const destNode = _getTargetToneNode(tgt, targetHandle);
	if (!destNode) return;

	try {
		if (src.kind === 'player') {
			const outputIndex = sourceHandle === 'out-1' ? 1 : 0;
			src.split.connect(destNode, outputIndex, 0);
		} else if (src.kind === 'sceneInput') {
			const outputIndex = parseInt(sourceHandle.replace('out-', ''), 10);
			// split.output is the underlying ChannelSplitterNode (std-audio-context);
			// destNode.input is the underlying GainNode — both live in the same context.
			src.split.output.connect(destNode.input, outputIndex, 0);
		} else if (src.kind === 'oscillator' || src.kind === 'gain' || src.kind === 'noise' || src.kind === 'dcSignal') {
			src.toneNode.connect(destNode);
		}
	} catch {
		// Already connected — ignore
	}
}

function disconnectAudioNodes(
	sourceId:     string,
	sourceHandle: string,
	targetId:     string,
	targetHandle: string,
): void {
	const src = _audioNodes.get(sourceId);
	const tgt = _audioNodes.get(targetId) ??
		(targetId === MASTER_NODE_ID ? getMasterEntry() : undefined);
	if (!src || !tgt) return;

	const destNode = _getTargetToneNode(tgt, targetHandle);
	if (!destNode) return;

	try {
		if (src.kind === 'player') {
			const outputIndex = sourceHandle === 'out-1' ? 1 : 0;
			src.split.disconnect(destNode, outputIndex);
		} else if (src.kind === 'sceneInput') {
			const outputIndex = parseInt(sourceHandle.replace('out-', ''), 10);
			src.split.output.disconnect(destNode.input, outputIndex, 0);
		} else if (src.kind === 'oscillator' || src.kind === 'gain' || src.kind === 'noise' || src.kind === 'dcSignal') {
			src.toneNode.disconnect(destNode);
		}
	} catch {
		// Not connected — ignore
	}
}

// ─── Player audio node lifecycle ─────────────────────────────────────────────

function createPlayerEntry(id: string): PlayerAudioEntry {
	const toneNode = new Player();
	const split    = new Split(2);
	toneNode.connect(split);
	const entry: PlayerAudioEntry = {
		kind:           'player',
		toneNode,
		split,
		startOffset:    0,
		currentRate:    1,
		isExplicitStop: false,
		isPlaying:      false,
		playbackEndCb:  null,
	};

	toneNode.onstop = () => {
		if (entry.isExplicitStop) {
			entry.isExplicitStop = false;
			return;
		}
		// Natural end of track
		getTransport().stop();
		entry.startOffset = 0;
		entry.isPlaying   = false;
		entry.playbackEndCb?.();
	};

	_audioNodes.set(id, entry);
	return entry;
}

// ─── Oscillator audio node lifecycle ─────────────────────────────────────────

function createOscillatorEntry(id: string): OscillatorAudioEntry {
	const toneNode = new Oscillator(440, 'sine');
	const entry: OscillatorAudioEntry = { kind: 'oscillator', toneNode };
	_audioNodes.set(id, entry);
	return entry;
}

/**
 * Re-connects all edges where this node is the source.
 * Called after recreating a source node (e.g. Oscillator/Noise after .stop()).
 */
function _reconnectSourceEdges(id: string): void {
	const edges = useDawStore.getState().edges;
	for (const edge of edges) {
		if (edge.source === id && edge.sourceHandle && edge.targetHandle) {
			connectAudioNodes(id, edge.sourceHandle, edge.target, edge.targetHandle);
		}
	}
}

export async function startOscillator(id: string): Promise<void> {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'oscillator') return;

	await toneStart();

	// Tone.Oscillator cannot be restarted after stop() — recreate if needed.
	if (entry.toneNode.state === 'stopped') {
		const freq = entry.toneNode.frequency.value as number;
		const type = entry.toneNode.type;
		entry.toneNode.dispose();
		entry.toneNode = new Oscillator(freq, type);
		_reconnectSourceEdges(id);
	}

	if (entry.toneNode.state !== 'started') {
		entry.toneNode.start();
	}
}

export function stopOscillator(id: string): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'oscillator') return;
	if (entry.toneNode.state === 'started') {
		entry.toneNode.stop();
	}
}

export function setOscillatorFrequency(id: string, freq: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'oscillator') return;
	entry.toneNode.frequency.value = freq;
}

export function setOscillatorType(
	id:   string,
	type: 'sine' | 'square' | 'triangle' | 'sawtooth',
): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'oscillator') return;
	entry.toneNode.type = type;
}

// ─── Gain audio node lifecycle ────────────────────────────────────────────────

function createGainEntry(id: string, gainValue = 1): GainAudioEntry {
	const toneNode = new Gain(gainValue);
	const entry: GainAudioEntry = { kind: 'gain', toneNode };
	_audioNodes.set(id, entry);
	return entry;
}

export function setGainValue(id: string, gain: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'gain') return;
	entry.toneNode.gain.value = gain;
}

// ─── Noise audio node lifecycle ───────────────────────────────────────────────

function createNoiseEntry(
	id:        string,
	noiseType: 'white' | 'pink' | 'brown' = 'white',
	vol:       number = -6,
): NoiseAudioEntry {
	const toneNode = new Noise(noiseType);
	toneNode.volume.value = vol;
	const entry: NoiseAudioEntry = { kind: 'noise', toneNode };
	_audioNodes.set(id, entry);
	return entry;
}

export async function startNoise(id: string): Promise<void> {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'noise') return;

	await toneStart();

	// Tone.Noise cannot be restarted after stop() — recreate if needed.
	if (entry.toneNode.state === 'stopped') {
		const vol  = entry.toneNode.volume.value;
		const type = entry.toneNode.type;
		entry.toneNode.dispose();
		entry.toneNode = new Noise(type);
		entry.toneNode.volume.value = vol;
		_reconnectSourceEdges(id);
	}

	if (entry.toneNode.state !== 'started') {
		entry.toneNode.start();
	}
}

export function stopNoise(id: string): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'noise') return;
	if (entry.toneNode.state === 'started') {
		entry.toneNode.stop();
	}
}

export function setNoiseType(id: string, type: 'white' | 'pink' | 'brown'): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'noise') return;
	entry.toneNode.type = type;
}

export function setNoiseVolume(id: string, db: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'noise') return;
	entry.toneNode.volume.value = db;
}

// ─── DC Signal audio node lifecycle ──────────────────────────────────────────

function createDCSignalEntry(id: string, value = 1): DCSignalAudioEntry {
	const toneNode = new Signal<'audioRange'>(value, 'audioRange');
	const entry: DCSignalAudioEntry = { kind: 'dcSignal', toneNode };
	_audioNodes.set(id, entry);
	return entry;
}

export function setDCSignalValue(id: string, value: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'dcSignal') return;
	entry.toneNode.value = value;
}

// ─── Scene Input audio node lifecycle ────────────────────────────────────────

// Console styling for SceneInput store lifecycle events.
const _DAW_INFO = [
	'%c DAW / SceneInput %c',
	'background:#004d40;color:#80cbc4;font-weight:bold;padding:2px 6px;border-radius:3px',
	'color:inherit',
] as const;
const _DAW_OK = [
	'%c DAW / SceneInput %c',
	'background:#1b5e20;color:#a5d6a7;font-weight:bold;padding:2px 6px;border-radius:3px',
	'color:inherit',
] as const;

async function initSceneInput(): Promise<void> {
	// Tone.js v15 uses standardized-audio-context internally, so rawContext is NOT
	// a native BaseAudioContext. Use Tone's own methods to create the AudioWorklet
	// node — they handle standardized-audio-context correctly.
	console.log(..._DAW_INFO, 'initSceneInput() — loading AudioWorklet module…');
	const toneCtx    = getContext();
	const sampleRate = toneCtx.rawContext.sampleRate;

	await toneCtx.addAudioWorkletModule('/sceneInputProcessor.worklet.js');
	console.log(..._DAW_INFO, 'AudioWorklet module loaded — creating node…');

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
		..._DAW_OK,
		`initSceneInput() complete — sampleRate: ${sampleRate} Hz, mode: coordinate-streaming`,
	);
}

async function initWaveformCapture(): Promise<void> {
	console.log(..._DAW_INFO, 'initWaveformCapture() — loading AudioWorklet module…');
	const toneCtx = getContext();

	// Tone.js caches a single worklet promise per context (addAudioWorkletModule
	// short-circuits on the second call), so we go directly to the
	// standardized-audio-context audioWorklet.addModule() which handles
	// per-URL deduplication and the blob-wrapper correctly.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	await (toneCtx.rawContext as any).audioWorklet.addModule('/waveformCaptureProcessor.worklet.js');
	console.log(..._DAW_INFO, 'waveformCapture module loaded — creating node…');

	const workletNode = toneCtx.createAudioWorkletNode('waveform-capture', {
		numberOfInputs:   1,
		numberOfOutputs:  0,
		channelCount:     6,
		channelCountMode: 'explicit' as ChannelCountMode,
		processorOptions: { nSamples: _captureNSamples },
	});
	_waveformCaptureNode = workletNode as unknown as AudioWorkletNode;

	const master       = getMasterEntry();
	const captureMerge = new Merge(6);

	master.inputGainX.connect(captureMerge, 0, 0);
	master.inputGainY.connect(captureMerge, 0, 1);
	master.inputGainR.connect(captureMerge, 0, 2);
	master.inputGainG.connect(captureMerge, 0, 3);
	master.inputGainB.connect(captureMerge, 0, 4);
	master.inputGainA.connect(captureMerge, 0, 5);

	// captureMerge.output is the underlying standardized-audio-context
	// ChannelMergerNode; workletNode lives in the same context.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(captureMerge as any).output.connect(workletNode as any, 0, 0);

	_allocCaptureSAB(_captureNSamples);
	(workletNode as unknown as AudioWorkletNode).port.postMessage({
		type: 'sabBuffer', buffer: _captureSAB!, nSamples: _captureNSamples,
	});

	console.log(..._DAW_OK, 'initWaveformCapture() complete');
}

let _sceneRunning = false;

export async function startSceneInput(): Promise<void> {
	await toneStart();
	_sceneRunning = true;
	console.log(..._DAW_OK, 'startSceneInput() — scene audio running');
}

export function stopSceneInput(): void {
	_sceneRunning = false;
	// Clear the worklet's coord buffer so the oscilloscope goes silent immediately
	// rather than continuing to cycle through the last received frame.
	const entry = _audioNodes.get(SCENE_INPUT_ID);
	if (entry && entry.kind === 'sceneInput') {
		(entry.workletNode as AudioWorkletNode).port.postMessage({ type: 'clear' });
	}
	console.log(..._DAW_INFO, 'stopSceneInput() — scene audio stopped');
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

export function getSceneRunning(): boolean {
	return _sceneRunning;
}

// ─── Generic node disposal ────────────────────────────────────────────────────

function disposeAudioNode(id: string): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind === 'masterOutput') return;

	if (entry.kind === 'player') {
		if (entry.toneNode.state === 'started') {
			entry.isExplicitStop = true;
			entry.toneNode.stop();
		}
		entry.toneNode.dispose();
		entry.split.dispose();
	} else if (entry.kind === 'oscillator') {
		if (entry.toneNode.state === 'started') {
			entry.toneNode.stop();
		}
		entry.toneNode.dispose();
	} else if (entry.kind === 'gain') {
		entry.toneNode.dispose();
	} else if (entry.kind === 'noise') {
		if (entry.toneNode.state === 'started') {
			entry.toneNode.stop();
		}
		entry.toneNode.dispose();
	} else if (entry.kind === 'dcSignal') {
		entry.toneNode.dispose();
	} else if (entry.kind === 'sceneInput') {
		try { entry.workletNode.disconnect(); } catch {}
		entry.split.dispose();
	}

	_audioNodes.delete(id);
}

// ─── Per-player playback helpers (public API) ─────────────────────────────────

export async function playNode(id: string): Promise<void> {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'player') return;

	const transport = getTransport();
	await toneStart();
	transport.stop();
	transport.seconds = 0;
	entry.toneNode.start('+0.01', entry.startOffset);
	transport.start('+0.01');
	entry.isPlaying = true;
}

export function pauseNode(id: string): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'player') return;

	const transport = getTransport();
	entry.startOffset    = getNodePosition(id);
	entry.isExplicitStop = true;
	entry.toneNode.stop();
	transport.stop();
	entry.isPlaying = false;
}

export function seekNode(id: string, seconds: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'player') return;

	const transport  = getTransport();
	const wasPlaying = entry.toneNode.state === 'started';
	entry.startOffset = seconds;
	if (wasPlaying) {
		entry.isExplicitStop = true;
		entry.toneNode.stop();
		transport.stop();
		transport.seconds = 0;
		entry.toneNode.start('+0.01', entry.startOffset);
		transport.start('+0.01');
	}
}

export async function loadTrackForNode(id: string, url: string): Promise<void> {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'player') return;

	const transport = getTransport();
	if (entry.toneNode.state === 'started') {
		entry.isExplicitStop = true;
		entry.toneNode.stop();
		transport.stop();
	}
	transport.seconds    = 0;
	entry.startOffset    = 0;
	entry.isPlaying      = false;
	await entry.toneNode.load(url);
}

export function setNodeRate(id: string, rate: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'player') return;

	const transport = getTransport();
	if (entry.toneNode.state === 'started') {
		entry.startOffset = getNodePosition(id);
		transport.stop();
		transport.seconds = 0;
		transport.start('+0.01');
	}
	entry.currentRate          = rate;
	entry.toneNode.playbackRate = rate;
}

export function setNodeMuted(id: string, muted: boolean): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'player') return;
	entry.toneNode.mute = muted;
}

export function getNodePosition(id: string): number {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'player') return 0;
	if (!entry.isPlaying) return entry.startOffset;
	return entry.startOffset + getTransport().seconds * entry.currentRate;
}

export function getNodeDuration(id: string): number {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'player') return 0;
	return entry.toneNode.loaded ? entry.toneNode.buffer.duration : 0;
}

export function getNodeIsLoaded(id: string): boolean {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'player') return false;
	return entry.toneNode.loaded;
}

export function getNodeIsPlaying(id: string): boolean {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'player') return false;
	return entry.isPlaying;
}

export function onNodePlaybackEnd(id: string, cb: () => void): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'player') return;
	entry.playbackEndCb = cb;
}

export function clearNodePlaybackEndCallback(id: string): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'player') return;
	entry.playbackEndCb = null;
}

// ─── Stub labels ──────────────────────────────────────────────────────────────

const STUB_LABELS: Record<StubKind, string> = {
	reverb:         'Reverb',
	delay:          'Delay',
	filter:         'Filter',
	distortion:     'Distortion',
	compressor:     'Compressor',
	noiseGenerator: 'Noise',
	panner:         'Panner',
	split:          'Split',
	merge:          'Merge',
};

// ─── Initial graph setup ──────────────────────────────────────────────────────

// Player nodes are created on demand via addPlayerNode — no default player.

const initialNodes: AppNode[] = [
	{
		id:        MASTER_NODE_ID,
		type:      'masterOutput',
		position:  { x: 288, y: 240 },
		data:      { label: 'Master Output', mode: 'multichannel' as const },
		deletable: false,
	},
	{
		id:        SCENE_INPUT_ID,
		type:      'sceneInput',
		position:  { x: -240, y: 240 },
		data:      { label: 'Scene Input', scanFrequency: 50 },
		deletable: false,
	},
	{
		id:       DEBUG_NODE_ID,
		type:     'debug',
		position: { x: 0, y: -120 },
		data:     { label: 'Debug' },
	},
];

const initialEdges: AppEdge[] = [
	{ id: 'e-scene-x', source: SCENE_INPUT_ID, sourceHandle: 'out-0', target: MASTER_NODE_ID, targetHandle: 'in-0', animated: true, type: 'deletable', style: { stroke: '#22dd22' } },
	{ id: 'e-scene-y', source: SCENE_INPUT_ID, sourceHandle: 'out-1', target: MASTER_NODE_ID, targetHandle: 'in-1', animated: true, type: 'deletable', style: { stroke: '#22dd22' } },
	{ id: 'e-scene-r', source: SCENE_INPUT_ID, sourceHandle: 'out-2', target: MASTER_NODE_ID, targetHandle: 'in-2', animated: true, type: 'deletable', style: { stroke: '#22dd22' } },
	{ id: 'e-scene-g', source: SCENE_INPUT_ID, sourceHandle: 'out-3', target: MASTER_NODE_ID, targetHandle: 'in-3', animated: true, type: 'deletable', style: { stroke: '#22dd22' } },
	{ id: 'e-scene-b', source: SCENE_INPUT_ID, sourceHandle: 'out-4', target: MASTER_NODE_ID, targetHandle: 'in-4', animated: true, type: 'deletable', style: { stroke: '#22dd22' } },
	{ id: 'e-scene-a', source: SCENE_INPUT_ID, sourceHandle: 'out-5', target: MASTER_NODE_ID, targetHandle: 'in-5', animated: true, type: 'deletable', style: { stroke: '#22dd22' } },
];

// ─── Zustand store ────────────────────────────────────────────────────────────

type DawState = {
	nodes:          AppNode[];
	edges:          AppEdge[];
	audioVersion:   number;
	selectedNodeId: string | null;

	onNodesChange:     OnNodesChange<AppNode>;
	onEdgesChange:     OnEdgesChange<AppEdge>;
	onConnect:         OnConnect;
	onReconnect:       (oldEdge: AppEdge, newConnection: Connection) => void;
	addPlayerNode:     (trackUrl: string, position: { x: number; y: number }) => string;
	addOscillatorNode: (position: { x: number; y: number }) => string;
	addGainNode:       (position: { x: number; y: number }) => string;
	addNoiseNode:      (position: { x: number; y: number }) => string;
	addDCSignalNode:   (position: { x: number; y: number }) => string;
	addStubNode:       (kind: StubKind, position: { x: number; y: number }) => string;
	addDebugNode:      (position: { x: number; y: number }) => string;
	updateNodeData:      (id: string, data: Partial<Record<string, unknown>>) => void;
	updateNodePositions: (updatedNodes: AppNode[]) => void;
	setSelectedNodeId:   (id: string | null) => void;
	setMasterMode:       (mode: 'stereo' | 'multichannel') => void;
};

export const useDawStore = create<DawState>((set, get) => ({
	nodes:          initialNodes,
	edges:          initialEdges,
	audioVersion:   0,
	selectedNodeId: null,

	onNodesChange: (changes: NodeChange<AppNode>[]) => {
		// Never allow the master output or scene input nodes to be deleted
		const safeChanges = changes.filter(
			c => !(c.type === 'remove' && (c.id === MASTER_NODE_ID || c.id === SCENE_INPUT_ID)),
		);
		// Dispose audio for removed nodes
		safeChanges
			.filter(c => c.type === 'remove')
			.forEach(c => disposeAudioNode(c.id));

		set({ nodes: applyNodeChanges(safeChanges, get().nodes) });
	},

	updateNodePositions: (updatedNodes: AppNode[]) => {
		const posMap = new Map(updatedNodes.map(n => [n.id, n.position]));
		set({
			nodes: get().nodes.map(n =>
				posMap.has(n.id) ? { ...n, position: posMap.get(n.id)! } : n,
			),
		});
	},

	onEdgesChange: (changes) => {
		const currentEdges = get().edges;
		changes
			.filter(c => c.type === 'remove')
			.forEach(c => {
				const edge = currentEdges.find(e => e.id === c.id);
				if (edge?.sourceHandle && edge?.targetHandle) {
					disconnectAudioNodes(
						edge.source, edge.sourceHandle,
						edge.target, edge.targetHandle,
					);
				}
			});
		set({ edges: applyEdgeChanges(changes, get().edges) });
	},

	onConnect: (connection) => {
		if (!connection.source || !connection.target) return;
		if (!connection.sourceHandle || !connection.targetHandle) return;
		connectAudioNodes(
			connection.source, connection.sourceHandle,
			connection.target, connection.targetHandle,
		);
		set({
			edges: addEdge(
				{
					...connection,
					animated: true,
					type:     'deletable',
					style:    { stroke: '#22dd22' },
				},
				get().edges,
			),
			audioVersion: get().audioVersion + 1,
		});
	},

	onReconnect: (oldEdge, newConnection) => {
		// Disconnect the old audio path
		if (oldEdge.sourceHandle && oldEdge.targetHandle) {
			disconnectAudioNodes(
				oldEdge.source, oldEdge.sourceHandle,
				oldEdge.target, oldEdge.targetHandle,
			);
		}
		// Connect the new audio path
		if (newConnection.source && newConnection.target &&
			newConnection.sourceHandle && newConnection.targetHandle) {
			connectAudioNodes(
				newConnection.source, newConnection.sourceHandle,
				newConnection.target, newConnection.targetHandle,
			);
		}
		set({
			edges:        reconnectEdge(oldEdge, newConnection, get().edges),
			audioVersion: get().audioVersion + 1,
		});
	},

	addPlayerNode: (trackUrl, position) => {
		const id = `player-${Date.now()}`;
		createPlayerEntry(id);
		const newNode: AppNode = {
			id,
			type:     'player',
			position,
			data:     { trackUrl, label: 'Player' },
		};
		set({
			nodes:        [...get().nodes, newNode],
			audioVersion: get().audioVersion + 1,
		});
		return id;
	},

	addOscillatorNode: (position) => {
		const id = `oscillator-${Date.now()}`;
		createOscillatorEntry(id);
		const newNode: AppNode = {
			id,
			type:     'oscillator',
			position,
			data:     { label: 'Oscillator', frequency: 440, type: 'sine' },
		};
		set({
			nodes:        [...get().nodes, newNode],
			audioVersion: get().audioVersion + 1,
		});
		return id;
	},

	addGainNode: (position) => {
		const id = `gain-${Date.now()}`;
		createGainEntry(id, 1);
		const newNode: AppNode = {
			id,
			type:     'gain',
			position,
			data:     { label: 'Gain', gain: 1.0 },
		};
		set({
			nodes:        [...get().nodes, newNode],
			audioVersion: get().audioVersion + 1,
		});
		return id;
	},

	addNoiseNode: (position) => {
		const id = `noiseGenerator-${Date.now()}`;
		createNoiseEntry(id);
		const newNode: AppNode = {
			id,
			type:     'noiseGenerator',
			position,
			data:     { label: 'Noise', noiseType: 'white', volume: -6 },
		};
		set({
			nodes:        [...get().nodes, newNode],
			audioVersion: get().audioVersion + 1,
		});
		return id;
	},

	addDCSignalNode: (position) => {
		const id = `dcSignal-${Date.now()}`;
		createDCSignalEntry(id, 1);
		const newNode: AppNode = {
			id,
			type:     'dcSignal',
			position,
			data:     { label: 'DC Signal', value: 1 },
		};
		set({
			nodes:        [...get().nodes, newNode],
			audioVersion: get().audioVersion + 1,
		});
		return id;
	},

	addDebugNode: (position) => {
		const id = `debug-${Date.now()}`;
		const newNode: AppNode = {
			id,
			type:     'debug',
			position,
			data:     { label: 'Debug' },
		};
		set({ nodes: [...get().nodes, newNode] });
		return id;
	},

	addStubNode: (kind, position) => {
		const id = `${kind}-${Date.now()}`;
		// Stubs have no audio entry — they are UI-only for now
		const newNode: AppNode = {
			id,
			type:     'stub',
			position,
			data:     { label: STUB_LABELS[kind], kind },
		};
		set({ nodes: [...get().nodes, newNode] });
		return id;
	},

	updateNodeData: (id, data) => {
		set({
			nodes: get().nodes.map(n =>
				n.id === id ? ({ ...n, data: { ...n.data, ...data } } as AppNode) : n,
			),
		});
	},

	setSelectedNodeId: (id) => set({ selectedNodeId: id }),

	setMasterMode: (mode) => {
		const validHandles = mode === 'stereo'
			? new Set(['in-0', 'in-1'])
			: new Set(['in-0', 'in-1', 'in-2', 'in-3', 'in-4', 'in-5']);

		const currentEdges = get().edges;
		const staleEdges = currentEdges.filter(
			e => e.target === MASTER_NODE_ID && !validHandles.has(e.targetHandle ?? ''),
		);
		for (const e of staleEdges) {
			disconnectAudioNodes(e.source, e.sourceHandle!, e.target, e.targetHandle!);
		}
		const staleIds = new Set(staleEdges.map(e => e.id));

		set({
			nodes: get().nodes.map(n =>
				n.id === MASTER_NODE_ID
					? ({ ...n, data: { ...n.data, mode } } as AppNode)
					: n,
			),
			edges: currentEdges.filter(e => !staleIds.has(e.id)),
		});
	},
}));

// Initialise the scene input AudioWorklet (async); wire its default connections once ready.
// writeSceneAudio() guards against the entry not existing, so early writes are silently dropped.
initSceneInput().then(() => {
	connectAudioNodes(SCENE_INPUT_ID, 'out-0', MASTER_NODE_ID, 'in-0');
	connectAudioNodes(SCENE_INPUT_ID, 'out-1', MASTER_NODE_ID, 'in-1');
	connectAudioNodes(SCENE_INPUT_ID, 'out-2', MASTER_NODE_ID, 'in-2');
	connectAudioNodes(SCENE_INPUT_ID, 'out-3', MASTER_NODE_ID, 'in-3');
	connectAudioNodes(SCENE_INPUT_ID, 'out-4', MASTER_NODE_ID, 'in-4');
	connectAudioNodes(SCENE_INPUT_ID, 'out-5', MASTER_NODE_ID, 'in-5');
	return initWaveformCapture();
}).catch(console.error);

// ─── Cleanup on page unload ───────────────────────────────────────────────────

window.addEventListener(
	'beforeunload',
	() => {
		for (const [, entry] of _audioNodes) {
			if (entry.kind === 'player') {
				if (entry.toneNode.state === 'started') {
					entry.isExplicitStop = true;
					entry.toneNode.stop();
				}
				entry.toneNode.dispose();
				entry.split.dispose();
			} else if (entry.kind === 'oscillator') {
				if (entry.toneNode.state === 'started') {
					entry.toneNode.stop();
				}
				entry.toneNode.dispose();
			} else if (entry.kind === 'gain') {
				entry.toneNode.dispose();
			} else if (entry.kind === 'noise') {
				if (entry.toneNode.state === 'started') {
					entry.toneNode.stop();
				}
				entry.toneNode.dispose();
			} else if (entry.kind === 'dcSignal') {
				entry.toneNode.dispose();
			} else if (entry.kind === 'masterOutput') {
				entry.inputGainX.dispose();
				entry.inputGainY.dispose();
				entry.inputGainR.dispose();
				entry.inputGainG.dispose();
				entry.inputGainB.dispose();
				entry.inputGainA.dispose();
				entry.merge.dispose();
				entry.xAnalyser.dispose();
				entry.yAnalyser.dispose();
				entry.rAnalyser.dispose();
				entry.gAnalyser.dispose();
				entry.bAnalyser.dispose();
				entry.aAnalyser.dispose();
			} else if (entry.kind === 'sceneInput') {
				try { entry.workletNode.disconnect(); } catch {}
				entry.split.dispose();
			}
		}
		_audioNodes.clear();
	},
	{ once: true },
);
