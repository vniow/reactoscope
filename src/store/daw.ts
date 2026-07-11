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
	Gain,
	Merge,
	Analyser,
	Split,
	getContext,
	start as toneStart,
} from 'tone';
import { DEFAULT_AUDIO_SETTINGS } from '../config';
import { NODE_COLORS } from '../daw/nodes/shared/nodeColors';

const NODE_TYPE_EDGE_COLOR: Record<string, string> = {
	masterOutput:    NODE_COLORS.output,
	gain:            NODE_COLORS.processor,
	player:          NODE_COLORS.source,
	oscillator:      NODE_COLORS.source,
	noiseGenerator:  NODE_COLORS.source,
	dcSignal:        NODE_COLORS.source,
	lfo:             NODE_COLORS.source,
	fmOscillator:    NODE_COLORS.source,
	amOscillator:    NODE_COLORS.source,
	fatOscillator:   NODE_COLORS.source,
	pulseOscillator: NODE_COLORS.source,
	pwmOscillator:   NODE_COLORS.source,
	grainPlayer:     NODE_COLORS.source,
	micInput:        NODE_COLORS.source,
	sceneInput:        NODE_COLORS.scene,
	debug:             NODE_COLORS.debug,
	stub:              NODE_COLORS.processor,
	reverb:            NODE_COLORS.effects,
	jcReverb:          NODE_COLORS.effects,
	freeverb:          NODE_COLORS.effects,
	delay:             NODE_COLORS.effects,
	feedbackDelay:     NODE_COLORS.effects,
	pingPongDelay:     NODE_COLORS.effects,
	distortion:        NODE_COLORS.effects,
	chebyshev:         NODE_COLORS.effects,
	bitCrusher:        NODE_COLORS.effects,
	frequencyShifter:  NODE_COLORS.effects,
	pitchShift:        NODE_COLORS.effects,
	stereoWidener:     NODE_COLORS.effects,
	chorus:            NODE_COLORS.effects,
	phaser:            NODE_COLORS.effects,
	tremolo:           NODE_COLORS.effects,
	vibrato:           NODE_COLORS.effects,
	autoFilter:        NODE_COLORS.effects,
	autoPanner:        NODE_COLORS.effects,
	autoWah:           NODE_COLORS.effects,
};

function edgeColorForSource(sourceId: string, nodes: AppNode[]): string {
	const node = nodes.find(n => n.id === sourceId);
	return NODE_TYPE_EDGE_COLOR[node?.type ?? ''] ?? NODE_COLORS.output;
}
import {
	_audioNodes, connectAudioNodes, disconnectAudioNodes, reconnectSourceEdges,
	MASTER_NODE_ID, SCENE_INPUT_ID,
} from './audioCore';
import { nodeRegistry } from './nodeRegistry';
import { loadTrackForGrainPlayer } from './nodes/grainPlayer';
import type {
	AppNode,
	AppEdge,
	MasterOutputAudioEntry,
	SceneInputAudioEntry,
	StubKind,
	PatchFile,
	MasterOutputNodeData,
} from './dawTypes';

const { nSamples } = DEFAULT_AUDIO_SETTINGS;

export { MASTER_NODE_ID, SCENE_INPUT_ID };
export const DEFAULT_PLAYER_ID = 'player-default';
export const DEBUG_NODE_ID     = 'debug-default';

// ─── Node-type operations re-exported from their handler modules ─────────────

export {
	playNode, pauseNode, seekNode, loadTrackForNode,
	setNodeRate, setNodeMuted, setNodeLoop,
	getNodePosition, getNodeDuration, getNodeIsLoaded, getNodeIsPlaying,
	onNodePlaybackEnd, clearNodePlaybackEndCallback,
} from './nodes/player';
export {
	startGrainPlayer, stopGrainPlayer, loadTrackForGrainPlayer,
	setGrainPlayerGrainSize, setGrainPlayerOverlap, setGrainPlayerPlaybackRate,
	setGrainPlayerDetune, setGrainPlayerLoop, setGrainPlayerLoopStart,
	setGrainPlayerLoopEnd, setGrainPlayerReverse, setGrainPlayerMuted,
	getGrainPlayerBufferDuration,
} from './nodes/grainPlayer';
export { startMicInput, stopMicInput } from './nodes/micInput';
export { loadIldaForNode, startIldaPlayback, stopIldaPlayback, getIldaFrameInfo } from './nodes/ildaFrame';

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

	const speakerGain = new Gain(0); // muted by default
	merge.connect(speakerGain);
	speakerGain.toDestination();

	_masterEntry = {
		kind: 'masterOutput',
		inputGainX, inputGainY, inputGainR, inputGainG, inputGainB, inputGainA,
		merge, speakerGain,
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
	// Galvo ring keeps a generous window independent of the scope analysis size
	// so render-frame hitches don't lose beam samples. Re-allocate alongside.
	_allocGalvoRing();
	if (_galvoProjectorNode) {
		_galvoProjectorNode.port.postMessage({
			type: 'resize', buffer: _galvoSAB!, ringLen: _galvoRingLen,
		});
	}
}

// ─── Galvo-projector capture (continuous ring buffer) ─────────────────────────
// The worklet writes every post-transducer sample into a circular buffer and
// publishes a monotonic writeCount. In laser mode the visualiser reads the
// samples scanned since its last frame and deposits only that arc with
// wall-clock decay, so rendered brightness/flicker track the real PPS.
//
// SAB layout: [writeCount: Uint32(4B)] + [ch0..ch5: Float32[ringLen] each]

let _galvoSAB:           SharedArrayBuffer | null = null;
let _galvoCountView:     Uint32Array       | null = null;
let _galvoChannels:      Float32Array[]           = [];
let _galvoRingLen:       number                   = 0;
let _galvoProjectorNode: AudioWorkletNode  | null = null;

/** Ring length: ≥ half a second of audio, so even slow render frames recover the full arc. */
function _galvoRingLenFor(): number {
	const sr = (() => { try { return getSampleRate(); } catch { return 48000; } })();
	return Math.max(_captureNSamples, Math.ceil(sr / 2));
}

function _allocGalvoRing(): void {
	_galvoRingLen   = _galvoRingLenFor();
	_galvoSAB       = new SharedArrayBuffer(4 + CAPTURE_CH * _galvoRingLen * 4);
	_galvoCountView = new Uint32Array(_galvoSAB, 0, 1);
	_galvoChannels  = [];
	for (let ch = 0; ch < CAPTURE_CH; ch++) {
		_galvoChannels.push(new Float32Array(_galvoSAB, 4 + ch * _galvoRingLen * 4, _galvoRingLen));
	}
}

/** Total samples the galvo worklet has written so far (monotonic, wraps at 2^32). */
export function getGalvoWriteCount(): number {
	if (!_galvoCountView) return 0;
	return Atomics.load(_galvoCountView, 0);
}

/** The post-galvo ring: six channel views + the ring length. Null until init. */
export function getGalvoRing(): {
	x: Float32Array; y: Float32Array;
	r: Float32Array; g: Float32Array; b: Float32Array; a: Float32Array;
	ringLen: number;
} | null {
	if (_galvoChannels.length < 6) return null;
	return {
		x: _galvoChannels[0],
		y: _galvoChannels[1],
		r: _galvoChannels[2],
		g: _galvoChannels[3],
		b: _galvoChannels[4],
		a: _galvoChannels[5],
		ringLen: _galvoRingLen,
	};
}

export function setGalvoParams(p: {
	bandwidthHz?:    number;
	dampingRatio?:   number;
	modulatorTauUs?: number;
}): void {
	if (!_galvoProjectorNode) return;
	_galvoProjectorNode.port.postMessage({ type: 'params', ...p });
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

	// Use rawContext.audioWorklet.addModule() directly — toneCtx.addAudioWorkletModule()
	// caches a single _workletPromise, so the first caller blocks Tone.js's own
	// internal worklets (FeedbackCombFilter, BitCrusher, etc.) from ever registering.
	await (toneCtx.rawContext as AudioContext).audioWorklet.addModule('/sceneInputProcessor.worklet.js');
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

async function initGalvoProjector(): Promise<void> {
	console.log(..._DAW_INFO, 'initGalvoProjector() — loading AudioWorklet module…');
	const toneCtx = getContext();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	await (toneCtx.rawContext as any).audioWorklet.addModule('/galvoProjectorProcessor.worklet.js');
	console.log(..._DAW_INFO, 'galvoProjector module loaded — creating node…');

	_allocGalvoRing();
	const workletNode = toneCtx.createAudioWorkletNode('galvo-projector', {
		numberOfInputs:   1,
		numberOfOutputs:  0,
		channelCount:     6,
		channelCountMode: 'explicit' as ChannelCountMode,
		processorOptions: { ringLen: _galvoRingLen },
	});
	_galvoProjectorNode = workletNode as unknown as AudioWorkletNode;

	// Tap the same 6-channel master bus the waveform capture taps. The galvo
	// physics applies in the worklet, so this stream gets read by the visualizer
	// in laser vizMode while the unfiltered waveform SAB drives scope mode.
	const master      = getMasterEntry();
	const galvoMerge  = new Merge(6);
	master.inputGainX.connect(galvoMerge, 0, 0);
	master.inputGainY.connect(galvoMerge, 0, 1);
	master.inputGainR.connect(galvoMerge, 0, 2);
	master.inputGainG.connect(galvoMerge, 0, 3);
	master.inputGainB.connect(galvoMerge, 0, 4);
	master.inputGainA.connect(galvoMerge, 0, 5);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(galvoMerge as any).output.connect(workletNode as any, 0, 0);

	(workletNode as unknown as AudioWorkletNode).port.postMessage({
		type: 'sabBuffer', buffer: _galvoSAB!, ringLen: _galvoRingLen,
	});

	console.log(..._DAW_OK, 'initGalvoProjector() complete');
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

export function getSceneRunning(): boolean {
	return _sceneRunning;
}

// ─── Generic node disposal ────────────────────────────────────────────────────

// Dispatches to the owning handler via the entry's kind. The master output and
// scene input are engine infrastructure, never disposed with graph nodes —
// their teardown happens only in the beforeunload cleanup below.
function disposeAudioNode(id: string): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind === 'masterOutput' || entry.kind === 'sceneInput') return;
	nodeRegistry.getByKind(entry.kind)?.dispose(id);
}

// ─── Stub labels ──────────────────────────────────────────────────────────────

// Only entries that need a display name different from their action key.
// Everything else falls back to capitalising the action string.
const STUB_LABELS: Partial<Record<StubKind, string>> = {
	noiseGenerator:      'Noise',
	midSideCompressor:   'MidSideCompressor',
	multibandCompressor: 'MultibandCompressor',
	biquadFilter:        'BiquadFilter',
	panVol:              'PanVol',
	panner3d:            'Panner3D',
	crossFade:           'CrossFade',
	multibandSplit:      'MultibandSplit',
	dcMeter:             'DCMeter',
	amplitudeEnvelope:   'AmplitudeEnvelope',
	frequencyEnvelope:   'FrequencyEnvelope',
	waveShaper:          'WaveShaper',
	scaleExp:            'ScaleExp',
	greaterThan:         'GreaterThan',
	audioToGain:         'AudioToGain',
	gainToAudio:         'GainToAudio',
	toneEvent:           'ToneEvent',
};

function stubLabel(kind: StubKind): string {
	return STUB_LABELS[kind] ?? (kind.charAt(0).toUpperCase() + kind.slice(1));
}

// ─── Initial graph setup ──────────────────────────────────────────────────────

// Player nodes are created on demand via addPlayerNode — no default player.

const initialNodes: AppNode[] = [
	{
		id:        MASTER_NODE_ID,
		type:      'masterOutput',
		position:  { x: 288, y: 240 },
		data:      { label: 'Master Output', speakersMuted: true },
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
	{ id: 'e-scene-x', source: SCENE_INPUT_ID, sourceHandle: 'out-0', target: MASTER_NODE_ID, targetHandle: 'in-0', animated: false, type: 'deletable', style: { stroke: NODE_COLORS.scene } },
	{ id: 'e-scene-y', source: SCENE_INPUT_ID, sourceHandle: 'out-1', target: MASTER_NODE_ID, targetHandle: 'in-1', animated: false, type: 'deletable', style: { stroke: NODE_COLORS.scene } },
	{ id: 'e-scene-r', source: SCENE_INPUT_ID, sourceHandle: 'out-2', target: MASTER_NODE_ID, targetHandle: 'in-2', animated: false, type: 'deletable', style: { stroke: NODE_COLORS.scene } },
	{ id: 'e-scene-g', source: SCENE_INPUT_ID, sourceHandle: 'out-3', target: MASTER_NODE_ID, targetHandle: 'in-3', animated: false, type: 'deletable', style: { stroke: NODE_COLORS.scene } },
	{ id: 'e-scene-b', source: SCENE_INPUT_ID, sourceHandle: 'out-4', target: MASTER_NODE_ID, targetHandle: 'in-4', animated: false, type: 'deletable', style: { stroke: NODE_COLORS.scene } },
	{ id: 'e-scene-a', source: SCENE_INPUT_ID, sourceHandle: 'out-5', target: MASTER_NODE_ID, targetHandle: 'in-5', animated: false, type: 'deletable', style: { stroke: NODE_COLORS.scene } },
];

// ─── Zustand store ────────────────────────────────────────────────────────────

type DawState = {
	nodes:          AppNode[];
	edges:          AppEdge[];
	audioVersion:   number;
	selectedNodeId: string | null;
	sceneRunning:   boolean;
	playingNodes:   Set<string>;

	onNodesChange:     OnNodesChange<AppNode>;
	onEdgesChange:     OnEdgesChange<AppEdge>;
	onConnect:         OnConnect;
	onReconnect:       (oldEdge: AppEdge, newConnection: Connection) => void;
	addStubNode: (kind: StubKind, position: { x: number; y: number }) => string;
	setNodePlaying:      (id: string, playing: boolean) => void;
	addNode:             (type: string, position: { x: number; y: number }, extraData?: Record<string, unknown>) => string;
	setNodeParam:        (id: string, update: Record<string, unknown>) => void;
	startNode:           (id: string) => Promise<void>;
	stopNode:            (id: string) => void;
	updateNodeData:      (id: string, data: Partial<Record<string, unknown>>) => void;
	updateNodePositions: (updatedNodes: AppNode[]) => void;
	setSelectedNodeId:   (id: string | null) => void;
	setSpeakersMuted:    (muted: boolean) => void;
	edgePathType:        'bezier' | 'straight' | 'step' | 'smoothstep';
	setEdgePathType:     (type: 'bezier' | 'straight' | 'step' | 'smoothstep') => void;
	startScene:          () => Promise<void>;
	stopScene:           () => void;
	loadPatch:           (patch: PatchFile) => void;
};

export const useDawStore = create<DawState>((set, get) => ({
	nodes:          initialNodes,
	edges:          initialEdges,
	audioVersion:   0,
	edgePathType:   'smoothstep',
	setEdgePathType: (type) => set({ edgePathType: type }),
	selectedNodeId: null,
	sceneRunning:   false,
	playingNodes:   new Set<string>(),

	setNodePlaying: (id, playing) => set(state => {
		const next = new Set(state.playingNodes);
		if (playing) next.add(id); else next.delete(id);
		return { playingNodes: next };
	}),
	startScene: async () => {
		await startSceneInput();
		set({ sceneRunning: true });
	},
	stopScene: () => {
		stopSceneInput();
		set({ sceneRunning: false });
	},

	onNodesChange: (changes: NodeChange<AppNode>[]) => {
		// Never allow the master output or scene input nodes to be deleted
		const safeChanges = changes.filter(
			c => !(c.type === 'remove' && (c.id === MASTER_NODE_ID || c.id === SCENE_INPUT_ID)),
		);
		// Dispose audio and clear playing state for removed nodes
		const removed = safeChanges.filter(c => c.type === 'remove').map(c => c.id);
		removed.forEach(id => disposeAudioNode(id));

		if (removed.length > 0) {
			set(state => {
				const next = new Set(state.playingNodes);
				removed.forEach(id => next.delete(id));
				return { nodes: applyNodeChanges(safeChanges, state.nodes), playingNodes: next };
			});
		} else {
			set({ nodes: applyNodeChanges(safeChanges, get().nodes) });
		}
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
					animated: false,
					type:     'deletable',
					style:    { stroke: edgeColorForSource(connection.source, get().nodes) },
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

	addStubNode: (kind, position) => {
		const id = `${kind}-${Date.now()}`;
		// Stubs have no audio entry — they are UI-only for now
		const newNode: AppNode = {
			id,
			type:     'stub',
			position,
			data:     { label: stubLabel(kind), kind },
		};
		set({ nodes: [...get().nodes, newNode] });
		return id;
	},

	addNode: (type, position, extraData) => {
		const id = `${type}-${Date.now()}`;
		const handler = nodeRegistry.get(type);
		if (!handler) {
			console.warn(`[addNode] no handler registered for type "${type}"`);
			return '';
		}
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const data = { ...handler.defaultData, ...extraData } as any;
		handler.create(id, data);
		const newNode: AppNode = { id, type: type as AppNode['type'], position, data };
		set({ nodes: [...get().nodes, newNode], audioVersion: get().audioVersion + 1 });
		return id;
	},

	setNodeParam: (id, update) => {
		const node = get().nodes.find(n => n.id === id);
		if (!node || !node.type) return;
		const handler = nodeRegistry.get(node.type);
		handler?.setAudioParam(id, update);
		set({
			nodes: get().nodes.map(n =>
				n.id === id ? ({ ...n, data: { ...n.data, ...update } } as AppNode) : n,
			),
		});
	},

	startNode: async (id) => {
		const node = get().nodes.find(n => n.id === id);
		if (!node || !node.type) return;
		const handler = nodeRegistry.get(node.type);
		if (!handler?.start) return;
		const recreated = await handler.start(id);
		if (recreated) {
			reconnectSourceEdges(id, get().edges);
		}
		get().setNodePlaying(id, true);
	},

	stopNode: (id) => {
		const node = get().nodes.find(n => n.id === id);
		if (!node || !node.type) return;
		const handler = nodeRegistry.get(node.type);
		handler?.stop?.(id);
		get().setNodePlaying(id, false);
	},

	updateNodeData: (id, data) => {
		set({
			nodes: get().nodes.map(n =>
				n.id === id ? ({ ...n, data: { ...n.data, ...data } } as AppNode) : n,
			),
		});
	},

	setSelectedNodeId: (id) => set({ selectedNodeId: id }),

	setSpeakersMuted: (muted) => {
		getMasterEntry().speakerGain.gain.value = muted ? 0 : 1;
		set({
			nodes: get().nodes.map(n =>
				n.id === MASTER_NODE_ID
					? ({ ...n, data: { ...n.data, speakersMuted: muted } } as AppNode)
					: n,
			),
		});
	},

	loadPatch: (patch) => {
		const { nodes: currentNodes, edges: currentEdges, sceneRunning } = get();

		if (sceneRunning) {
			stopSceneInput();
		}

		// Disconnect every current audio edge
		for (const edge of currentEdges) {
			if (edge.sourceHandle && edge.targetHandle) {
				disconnectAudioNodes(edge.source, edge.sourceHandle, edge.target, edge.targetHandle);
			}
		}

		// Dispose all non-protected audio nodes
		for (const node of currentNodes) {
			if (node.id !== MASTER_NODE_ID && node.id !== SCENE_INPUT_ID) {
				disposeAudioNode(node.id);
			}
		}

		// Apply master output settings from patch
		const patchMaster = patch.nodes.find(n => n.id === MASTER_NODE_ID);
		if (patchMaster?.type === 'masterOutput') {
			const d = patchMaster.data as MasterOutputNodeData;
			getMasterEntry().speakerGain.gain.value = d.speakersMuted ? 0 : 1;
		}

		// Reconstruct audio entries from patch node data
		for (const node of patch.nodes) {
			if (node.id === MASTER_NODE_ID || node.id === SCENE_INPUT_ID) continue;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			nodeRegistry.get(node.type ?? '')?.create(node.id, node.data as any);
		}

		// Wire edges per patch
		for (const edge of patch.edges) {
			if (edge.sourceHandle && edge.targetHandle) {
				connectAudioNodes(edge.source, edge.sourceHandle, edge.target, edge.targetHandle);
			}
		}

		// Ensure protected nodes keep deletable: false
		const restoredNodes = patch.nodes.map(n =>
			(n.id === MASTER_NODE_ID || n.id === SCENE_INPUT_ID)
				? { ...n, deletable: false }
				: n,
		);

		set({
			nodes:          restoredNodes,
			edges:          patch.edges,
			edgePathType:   patch.edgePathType,
			audioVersion:   get().audioVersion + 1,
			sceneRunning:   false,
			selectedNodeId: null,
			playingNodes:   new Set<string>(),
		});
	},

}));

/**
 * Returns true if any of the master output's R/G/B handles (in-2, in-3, in-4)
 * has an inbound edge. Used by the visualiser to decide between per-sample
 * R/G/B colouring and the phosphor hue fallback.
 */
export function isMasterMultichannel(edges: AppEdge[]): boolean {
	return edges.some(e =>
		e.target === MASTER_NODE_ID &&
		(e.targetHandle === 'in-2' || e.targetHandle === 'in-3' || e.targetHandle === 'in-4'),
	);
}

// ─── Patch export helpers ─────────────────────────────────────────────────────

export function exportPatch(name: string): PatchFile {
	const { nodes, edges, edgePathType } = useDawStore.getState();
	return { version: 1, savedAt: new Date().toISOString(), name, nodes, edges, edgePathType };
}

export function downloadPatch(patch: PatchFile, filenameStem?: string): void {
	const stem = filenameStem ?? (patch.name.replace(/[^a-z0-9]/gi, '_') || 'patch');
	const blob = new Blob([JSON.stringify(patch, null, 2)], { type: 'application/json' });
	const url  = URL.createObjectURL(blob);
	const a    = document.createElement('a');
	a.href     = url;
	a.download = `${stem}.reactoscope.json`;
	a.click();
	URL.revokeObjectURL(url);
}

// Initialise the scene input AudioWorklet (async); wire its default connections once ready.
// writeSceneAudio() guards against the entry not existing, so early writes are silently dropped.
// Exported so App.tsx can await full init before loading a default patch.
export const dawInitPromise = initSceneInput().then(() => {
	connectAudioNodes(SCENE_INPUT_ID, 'out-0', MASTER_NODE_ID, 'in-0');
	connectAudioNodes(SCENE_INPUT_ID, 'out-1', MASTER_NODE_ID, 'in-1');
	connectAudioNodes(SCENE_INPUT_ID, 'out-2', MASTER_NODE_ID, 'in-2');
	connectAudioNodes(SCENE_INPUT_ID, 'out-3', MASTER_NODE_ID, 'in-3');
	connectAudioNodes(SCENE_INPUT_ID, 'out-4', MASTER_NODE_ID, 'in-4');
	connectAudioNodes(SCENE_INPUT_ID, 'out-5', MASTER_NODE_ID, 'in-5');
	return initWaveformCapture().then(initGalvoProjector);
}).catch(console.error);

// ─── Dev-only hook: expose store + audio map for memory-leak debugging ────────
if (import.meta.env.DEV) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(window as any).__daw = {
		useDawStore,
		audioNodes: _audioNodes,
		loadTrackForGrainPlayer,
	};
}

// ─── Cleanup on page unload ───────────────────────────────────────────────────

window.addEventListener(
	'beforeunload',
	() => {
		// Graph nodes dispose through their handlers; master output and scene
		// input are engine infrastructure and are torn down explicitly.
		for (const id of [..._audioNodes.keys()]) {
			disposeAudioNode(id);
		}
		const scene = _audioNodes.get(SCENE_INPUT_ID);
		if (scene?.kind === 'sceneInput') {
			try { scene.workletNode.disconnect(); } catch { /* already disconnected */ }
			scene.split.dispose();
		}
		if (_masterEntry) {
			const m = _masterEntry;
			[
				m.inputGainX, m.inputGainY, m.inputGainR, m.inputGainG, m.inputGainB, m.inputGainA,
				m.merge, m.speakerGain,
				m.xAnalyser, m.yAnalyser, m.rAnalyser, m.gAnalyser, m.bAnalyser, m.aAnalyser,
			].forEach(n => n.dispose());
		}
		_audioNodes.clear();
	},
	{ once: true },
);
