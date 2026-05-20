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
	LFO,
	FMOscillator,
	AMOscillator,
	FatOscillator,
	PulseOscillator,
	PWMOscillator,
	GrainPlayer,
	UserMedia,
	getTransport,
	getContext,
	start as toneStart,
} from 'tone';
import { DEFAULT_AUDIO_SETTINGS } from '../config';
import { NODE_COLORS } from '../daw/nodes/nodeColors';

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
	sceneInput:      NODE_COLORS.scene,
	ildaFrame:       NODE_COLORS.scene,
	debug:           NODE_COLORS.debug,
	stub:            NODE_COLORS.processor,
};

function edgeColorForSource(sourceId: string, nodes: AppNode[]): string {
	const node = nodes.find(n => n.id === sourceId);
	return NODE_TYPE_EDGE_COLOR[node?.type ?? ''] ?? NODE_COLORS.output;
}
import type {
	AppNode,
	AppEdge,
	AudioNodeMap,
	OscType,
	PlayerAudioEntry,
	MasterOutputAudioEntry,
	OscillatorAudioEntry,
	GainAudioEntry,
	NoiseAudioEntry,
	DCSignalAudioEntry,
	LFOAudioEntry,
	FMOscillatorAudioEntry,
	AMOscillatorAudioEntry,
	FatOscillatorAudioEntry,
	PulseOscillatorAudioEntry,
	PWMOscillatorAudioEntry,
	GrainPlayerAudioEntry,
	MicInputAudioEntry,
	SceneInputAudioEntry,
	StubKind,
	PatchFile,
	MasterOutputNodeData,
	OscillatorNodeData,
	GainNodeData,
	NoiseNodeData,
	DCSignalNodeData,
	LFONodeData,
	FMOscillatorNodeData,
	AMOscillatorNodeData,
	FatOscillatorNodeData,
	PulseOscillatorNodeData,
	PWMOscillatorNodeData,
	GrainPlayerNodeData,
	IldaFrameAudioEntry,
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
		if (src.kind === 'player' || src.kind === 'grainPlayer') {
			const outputIndex = sourceHandle === 'out-1' ? 1 : 0;
			src.split.connect(destNode, outputIndex, 0);
		} else if (src.kind === 'sceneInput' || src.kind === 'ildaFrame') {
			const outputIndex = parseInt(sourceHandle.replace('out-', ''), 10);
			// split.output is the underlying ChannelSplitterNode (std-audio-context);
			// destNode.input is the underlying GainNode — both live in the same context.
			src.split.output.connect(destNode.input, outputIndex, 0);
		} else if (
			src.kind === 'oscillator' || src.kind === 'gain' || src.kind === 'noise' || src.kind === 'dcSignal' ||
			src.kind === 'lfo' || src.kind === 'fmOscillator' || src.kind === 'amOscillator' ||
			src.kind === 'fatOscillator' || src.kind === 'pulseOscillator' || src.kind === 'pwmOscillator' ||
			src.kind === 'micInput'
		) {
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
		if (src.kind === 'player' || src.kind === 'grainPlayer') {
			const outputIndex = sourceHandle === 'out-1' ? 1 : 0;
			src.split.disconnect(destNode, outputIndex);
		} else if (src.kind === 'sceneInput' || src.kind === 'ildaFrame') {
			const outputIndex = parseInt(sourceHandle.replace('out-', ''), 10);
			src.split.output.disconnect(destNode.input, outputIndex, 0);
		} else if (
			src.kind === 'oscillator' || src.kind === 'gain' || src.kind === 'noise' || src.kind === 'dcSignal' ||
			src.kind === 'lfo' || src.kind === 'fmOscillator' || src.kind === 'amOscillator' ||
			src.kind === 'fatOscillator' || src.kind === 'pulseOscillator' || src.kind === 'pwmOscillator' ||
			src.kind === 'micInput'
		) {
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
		const freq   = entry.toneNode.frequency.value as number;
		const type   = entry.toneNode.type;
		const detune = entry.toneNode.detune.value as number;
		const phase  = entry.toneNode.phase;
		entry.toneNode.dispose();
		entry.toneNode = new Oscillator(freq, type);
		entry.toneNode.detune.value = detune;
		entry.toneNode.phase = phase;
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

export function setOscillatorDetune(id: string, cents: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'oscillator') return;
	entry.toneNode.detune.value = cents;
}

export function setOscillatorPhase(id: string, degrees: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'oscillator') return;
	entry.toneNode.phase = degrees;
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

// ─── LFO audio node lifecycle ─────────────────────────────────────────────────

function createLFOEntry(id: string, data?: Partial<LFONodeData>): LFOAudioEntry {
	const toneNode = new LFO({
		frequency: data?.frequency ?? 1,
		type:      data?.type      ?? 'sine',
		min:       data?.min       ?? -1,
		max:       data?.max       ?? 1,
	});
	const entry: LFOAudioEntry = { kind: 'lfo', toneNode };
	_audioNodes.set(id, entry);
	return entry;
}

export async function startLFO(id: string): Promise<void> {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'lfo') return;
	await toneStart();
	if (entry.toneNode.state === 'stopped') {
		const { frequency, type, min, max, phase } = entry.toneNode;
		entry.toneNode.dispose();
		entry.toneNode = new LFO({ frequency: frequency.value as number, type, min, max, phase });
		_reconnectSourceEdges(id);
	}
	if (entry.toneNode.state !== 'started') entry.toneNode.start();
}

export function stopLFO(id: string): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'lfo') return;
	if (entry.toneNode.state === 'started') entry.toneNode.stop();
}

export function setLFOFrequency(id: string, freq: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'lfo') return;
	entry.toneNode.frequency.value = freq;
}

export function setLFOType(id: string, type: OscType): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'lfo') return;
	entry.toneNode.type = type;
}

export function setLFOMin(id: string, min: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'lfo') return;
	if (min >= entry.toneNode.max) return;
	entry.toneNode.min = min;
}

export function setLFOMax(id: string, max: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'lfo') return;
	if (max <= entry.toneNode.min) return;
	entry.toneNode.max = max;
}

export function setLFOPhase(id: string, degrees: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'lfo') return;
	entry.toneNode.phase = degrees;
}

// ─── FMOscillator audio node lifecycle ───────────────────────────────────────

function createFMOscillatorEntry(id: string, data?: Partial<FMOscillatorNodeData>): FMOscillatorAudioEntry {
	const toneNode = new FMOscillator({
		frequency:       data?.frequency       ?? 440,
		type:            data?.type            ?? 'sine',
		modulationType:  data?.modulationType  ?? 'square',
		modulationIndex: data?.modulationIndex ?? 10,
		harmonicity:     data?.harmonicity     ?? 3,
		detune:          data?.detune          ?? 0,
		phase:           data?.phase           ?? 0,
	});
	const entry: FMOscillatorAudioEntry = { kind: 'fmOscillator', toneNode };
	_audioNodes.set(id, entry);
	return entry;
}

export async function startFMOscillator(id: string): Promise<void> {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'fmOscillator') return;
	await toneStart();
	if (entry.toneNode.state === 'stopped') {
		const frequency       = entry.toneNode.frequency.value as number;
		const type            = entry.toneNode.type as OscType;
		const modulationType  = entry.toneNode.modulationType as OscType;
		const modulationIndex = entry.toneNode.modulationIndex.value as number;
		const harmonicity     = entry.toneNode.harmonicity.value as number;
		const detune          = entry.toneNode.detune.value as number;
		const phase           = entry.toneNode.phase;
		entry.toneNode.dispose();
		entry.toneNode = new FMOscillator({ frequency, type, modulationType, modulationIndex, harmonicity, detune, phase });
		_reconnectSourceEdges(id);
	}
	if (entry.toneNode.state !== 'started') entry.toneNode.start();
}

export function stopFMOscillator(id: string): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'fmOscillator') return;
	if (entry.toneNode.state === 'started') entry.toneNode.stop();
}

export function setFMOscillatorFrequency(id: string, freq: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'fmOscillator') return;
	entry.toneNode.frequency.value = freq;
}

export function setFMOscillatorType(id: string, type: OscType): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'fmOscillator') return;
	entry.toneNode.type = type;
}

export function setFMOscillatorModulationType(id: string, type: OscType): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'fmOscillator') return;
	entry.toneNode.modulationType = type;
}

export function setFMOscillatorModulationIndex(id: string, value: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'fmOscillator') return;
	entry.toneNode.modulationIndex.value = value;
}

export function setFMOscillatorHarmonicity(id: string, value: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'fmOscillator') return;
	entry.toneNode.harmonicity.value = value;
}

export function setFMOscillatorDetune(id: string, cents: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'fmOscillator') return;
	entry.toneNode.detune.value = cents;
}

export function setFMOscillatorPhase(id: string, degrees: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'fmOscillator') return;
	entry.toneNode.phase = degrees;
}

// ─── AMOscillator audio node lifecycle ───────────────────────────────────────

function createAMOscillatorEntry(id: string, data?: Partial<AMOscillatorNodeData>): AMOscillatorAudioEntry {
	const toneNode = new AMOscillator({
		frequency:      data?.frequency      ?? 440,
		type:           data?.type           ?? 'sine',
		modulationType: data?.modulationType ?? 'square',
		harmonicity:    data?.harmonicity    ?? 3,
		detune:         data?.detune         ?? 0,
		phase:          data?.phase          ?? 0,
	});
	const entry: AMOscillatorAudioEntry = { kind: 'amOscillator', toneNode };
	_audioNodes.set(id, entry);
	return entry;
}

export async function startAMOscillator(id: string): Promise<void> {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'amOscillator') return;
	await toneStart();
	if (entry.toneNode.state === 'stopped') {
		const frequency      = entry.toneNode.frequency.value as number;
		const type           = entry.toneNode.type as OscType;
		const modulationType = entry.toneNode.modulationType as OscType;
		const harmonicity    = entry.toneNode.harmonicity.value as number;
		const detune         = entry.toneNode.detune.value as number;
		const phase          = entry.toneNode.phase;
		entry.toneNode.dispose();
		entry.toneNode = new AMOscillator({ frequency, type, modulationType, harmonicity, detune, phase });
		_reconnectSourceEdges(id);
	}
	if (entry.toneNode.state !== 'started') entry.toneNode.start();
}

export function stopAMOscillator(id: string): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'amOscillator') return;
	if (entry.toneNode.state === 'started') entry.toneNode.stop();
}

export function setAMOscillatorFrequency(id: string, freq: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'amOscillator') return;
	entry.toneNode.frequency.value = freq;
}

export function setAMOscillatorType(id: string, type: OscType): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'amOscillator') return;
	entry.toneNode.type = type;
}

export function setAMOscillatorModulationType(id: string, type: OscType): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'amOscillator') return;
	entry.toneNode.modulationType = type;
}

export function setAMOscillatorHarmonicity(id: string, value: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'amOscillator') return;
	entry.toneNode.harmonicity.value = value;
}

export function setAMOscillatorDetune(id: string, cents: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'amOscillator') return;
	entry.toneNode.detune.value = cents;
}

export function setAMOscillatorPhase(id: string, degrees: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'amOscillator') return;
	entry.toneNode.phase = degrees;
}

// ─── FatOscillator audio node lifecycle ──────────────────────────────────────

function createFatOscillatorEntry(id: string, data?: Partial<FatOscillatorNodeData>): FatOscillatorAudioEntry {
	const toneNode = new FatOscillator({
		frequency: data?.frequency ?? 440,
		type:      data?.type      ?? 'sawtooth',
		count:     data?.count     ?? 3,
		spread:    data?.spread    ?? 20,
		detune:    data?.detune    ?? 0,
		phase:     data?.phase     ?? 0,
	});
	const entry: FatOscillatorAudioEntry = { kind: 'fatOscillator', toneNode };
	_audioNodes.set(id, entry);
	return entry;
}

export async function startFatOscillator(id: string): Promise<void> {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'fatOscillator') return;
	await toneStart();
	if (entry.toneNode.state === 'stopped') {
		const frequency = entry.toneNode.frequency.value as number;
		const type      = entry.toneNode.type as OscType;
		const count     = entry.toneNode.count;
		const spread    = entry.toneNode.spread;
		const detune    = entry.toneNode.detune.value as number;
		const phase     = entry.toneNode.phase;
		entry.toneNode.dispose();
		entry.toneNode = new FatOscillator({ frequency, type, count, spread, detune, phase });
		_reconnectSourceEdges(id);
	}
	if (entry.toneNode.state !== 'started') entry.toneNode.start();
}

export function stopFatOscillator(id: string): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'fatOscillator') return;
	if (entry.toneNode.state === 'started') entry.toneNode.stop();
}

export function setFatOscillatorFrequency(id: string, freq: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'fatOscillator') return;
	entry.toneNode.frequency.value = freq;
}

export function setFatOscillatorType(id: string, type: OscType): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'fatOscillator') return;
	entry.toneNode.type = type;
}

export function setFatOscillatorCount(id: string, count: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'fatOscillator') return;
	entry.toneNode.count = Math.round(count);
}

export function setFatOscillatorSpread(id: string, spread: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'fatOscillator') return;
	entry.toneNode.spread = spread;
}

export function setFatOscillatorDetune(id: string, cents: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'fatOscillator') return;
	entry.toneNode.detune.value = cents;
}

export function setFatOscillatorPhase(id: string, degrees: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'fatOscillator') return;
	entry.toneNode.phase = degrees;
}

// ─── PulseOscillator audio node lifecycle ────────────────────────────────────

function createPulseOscillatorEntry(id: string, data?: Partial<PulseOscillatorNodeData>): PulseOscillatorAudioEntry {
	const toneNode = new PulseOscillator({
		frequency: data?.frequency ?? 440,
		width:     data?.width     ?? 0.5,
		detune:    data?.detune    ?? 0,
		phase:     data?.phase     ?? 0,
	});
	const entry: PulseOscillatorAudioEntry = { kind: 'pulseOscillator', toneNode };
	_audioNodes.set(id, entry);
	return entry;
}

export async function startPulseOscillator(id: string): Promise<void> {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'pulseOscillator') return;
	await toneStart();
	if (entry.toneNode.state === 'stopped') {
		const frequency = entry.toneNode.frequency.value as number;
		const width     = entry.toneNode.width.value as number;
		const detune    = entry.toneNode.detune.value as number;
		const phase     = entry.toneNode.phase;
		entry.toneNode.dispose();
		entry.toneNode = new PulseOscillator({ frequency, width, detune, phase });
		_reconnectSourceEdges(id);
	}
	if (entry.toneNode.state !== 'started') entry.toneNode.start();
}

export function stopPulseOscillator(id: string): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'pulseOscillator') return;
	if (entry.toneNode.state === 'started') entry.toneNode.stop();
}

export function setPulseOscillatorFrequency(id: string, freq: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'pulseOscillator') return;
	entry.toneNode.frequency.value = freq;
}

export function setPulseOscillatorWidth(id: string, width: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'pulseOscillator') return;
	entry.toneNode.width.value = width;
}

export function setPulseOscillatorDetune(id: string, cents: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'pulseOscillator') return;
	entry.toneNode.detune.value = cents;
}

export function setPulseOscillatorPhase(id: string, degrees: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'pulseOscillator') return;
	entry.toneNode.phase = degrees;
}

// ─── PWMOscillator audio node lifecycle ──────────────────────────────────────

function createPWMOscillatorEntry(id: string, data?: Partial<PWMOscillatorNodeData>): PWMOscillatorAudioEntry {
	const toneNode = new PWMOscillator({
		frequency:           data?.frequency           ?? 440,
		modulationFrequency: data?.modulationFrequency ?? 0.4,
		detune:              data?.detune              ?? 0,
		phase:               data?.phase               ?? 0,
	});
	const entry: PWMOscillatorAudioEntry = { kind: 'pwmOscillator', toneNode };
	_audioNodes.set(id, entry);
	return entry;
}

export async function startPWMOscillator(id: string): Promise<void> {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'pwmOscillator') return;
	await toneStart();
	if (entry.toneNode.state === 'stopped') {
		const frequency           = entry.toneNode.frequency.value as number;
		const modulationFrequency = entry.toneNode.modulationFrequency.value as number;
		const detune              = entry.toneNode.detune.value as number;
		const phase               = entry.toneNode.phase;
		entry.toneNode.dispose();
		entry.toneNode = new PWMOscillator({ frequency, modulationFrequency, detune, phase });
		_reconnectSourceEdges(id);
	}
	if (entry.toneNode.state !== 'started') entry.toneNode.start();
}

export function stopPWMOscillator(id: string): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'pwmOscillator') return;
	if (entry.toneNode.state === 'started') entry.toneNode.stop();
}

export function setPWMOscillatorFrequency(id: string, freq: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'pwmOscillator') return;
	entry.toneNode.frequency.value = freq;
}

export function setPWMOscillatorModulationFrequency(id: string, modFreq: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'pwmOscillator') return;
	entry.toneNode.modulationFrequency.value = modFreq;
}

export function setPWMOscillatorDetune(id: string, cents: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'pwmOscillator') return;
	entry.toneNode.detune.value = cents;
}

export function setPWMOscillatorPhase(id: string, degrees: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'pwmOscillator') return;
	entry.toneNode.phase = degrees;
}

// ─── GrainPlayer audio node lifecycle ────────────────────────────────────────

function createGrainPlayerEntry(id: string, data?: Partial<GrainPlayerNodeData>): GrainPlayerAudioEntry {
	const toneNode = new GrainPlayer({
		url:          data?.trackUrl     ?? '',
		grainSize:    data?.grainSize    ?? 0.2,
		overlap:      data?.overlap      ?? 0.1,
		playbackRate: data?.playbackRate ?? 1,
		detune:       data?.detune       ?? 0,
		loop:         data?.loop         ?? true,
		loopStart:    data?.loopStart    ?? 0,
		loopEnd:      data?.loopEnd      ?? 0,
		reverse:      data?.reverse      ?? false,
	});
	const split = new Split(2);
	toneNode.connect(split);
	const entry: GrainPlayerAudioEntry = { kind: 'grainPlayer', toneNode, split };
	_audioNodes.set(id, entry);
	return entry;
}

export async function startGrainPlayer(id: string): Promise<void> {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'grainPlayer') return;
	await toneStart();
	if (entry.toneNode.state !== 'started') entry.toneNode.start();
}

export function stopGrainPlayer(id: string): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'grainPlayer') return;
	if (entry.toneNode.state === 'started') entry.toneNode.stop();
}

export async function loadTrackForGrainPlayer(id: string, url: string): Promise<void> {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'grainPlayer') return;
	if (entry.toneNode.state === 'started') entry.toneNode.stop();
	await entry.toneNode.buffer.load(url);
}

export function setGrainPlayerGrainSize(id: string, seconds: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'grainPlayer') return;
	entry.toneNode.grainSize = seconds;
}

export function setGrainPlayerOverlap(id: string, overlap: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'grainPlayer') return;
	entry.toneNode.overlap = overlap;
}

export function setGrainPlayerPlaybackRate(id: string, rate: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'grainPlayer') return;
	entry.toneNode.playbackRate = rate;
}

export function setGrainPlayerDetune(id: string, cents: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'grainPlayer') return;
	entry.toneNode.detune = cents;
}

export function setGrainPlayerLoop(id: string, loop: boolean): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'grainPlayer') return;
	entry.toneNode.loop = loop;
}

export function getGrainPlayerBufferDuration(id: string): number {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'grainPlayer') return 0;
	return entry.toneNode.buffer.loaded ? entry.toneNode.buffer.duration : 0;
}

export function setGrainPlayerLoopStart(id: string, time: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'grainPlayer') return;
	entry.toneNode.loopStart = time;
}

export function setGrainPlayerLoopEnd(id: string, time: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'grainPlayer') return;
	entry.toneNode.loopEnd = time;
}

export function setGrainPlayerReverse(id: string, reverse: boolean): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'grainPlayer') return;
	entry.toneNode.reverse = reverse;
}

// ─── MicInput audio node lifecycle ───────────────────────────────────────────

function createMicInputEntry(id: string): MicInputAudioEntry {
	const toneNode = new UserMedia();
	const entry: MicInputAudioEntry = { kind: 'micInput', toneNode };
	_audioNodes.set(id, entry);
	return entry;
}

export async function startMicInput(id: string): Promise<void> {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'micInput') return;
	await toneStart();
	await entry.toneNode.open();
}

export function stopMicInput(id: string): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'micInput') return;
	entry.toneNode.close();
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

// ─── IldaFrame audio node lifecycle ──────────────────────────────────────────
//
// Each IldaFrameNode owns a fresh `scene-input-processor` worklet instance —
// the same processor class the singleton SceneInput uses, but with its own
// coord buffer. Multiple ILDA files can coexist as independent sources.
// `audioWorklet.addModule(...)` was already called during initSceneInput()
// and is idempotent, so we can synchronously instantiate further worklets.

function createIldaFrameEntry(id: string): IldaFrameAudioEntry {
	const toneCtx = getContext();
	const workletNode = toneCtx.createAudioWorkletNode('scene-input-processor', {
		numberOfOutputs:    1,
		outputChannelCount: [6],
		processorOptions:   {},
	});
	const split = new Split(6);
	workletNode.connect(split.input);

	const entry: IldaFrameAudioEntry = {
		kind:        'ildaFrame',
		workletNode,
		split,
		coordBufs:   [],
		frameTimer:  null,
		frameIdx:    0,
	};
	_audioNodes.set(id, entry);
	return entry;
}

/**
 * Fetch an .ild file, decode it, and load every frame into the node's audio
 * entry as a precomputed coord buffer. Posts frame[0] to the worklet so the
 * sound starts immediately; the UI layer (IldaFrameNode) is responsible for
 * deciding when to start the animated cycle.
 *
 * Imports the codec lazily so the path doesn't pull it into the main bundle.
 */
export async function loadIldaForNode(id: string, url: string): Promise<{ nFrames: number; nPoints: number }> {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'ildaFrame') throw new Error(`Node ${id} is not an ildaFrame entry`);

	const [{ decodeIldaFile, ildaFrameToCoordBuffer }] = await Promise.all([
		import('../laser/ildaCodec'),
	]);
	const res     = await fetch(url);
	const arrBuf  = await res.arrayBuffer();
	const frames  = decodeIldaFile(arrBuf);
	if (frames.length === 0) throw new Error('ILDA file contained no frames');

	const coordBufs = frames.map(f => ildaFrameToCoordBuffer(f));

	// Stop any running animated cursor before swapping the buffer set.
	if (entry.frameTimer !== null) {
		clearInterval(entry.frameTimer);
		entry.frameTimer = null;
	}
	entry.coordBufs = coordBufs;
	entry.frameIdx  = 0;

	_postIldaCoordBufferToWorklet(entry, 0);

	return { nFrames: frames.length, nPoints: coordBufs[0].nPoints };
}

function _postIldaCoordBufferToWorklet(entry: IldaFrameAudioEntry, idx: number): void {
	const cb = entry.coordBufs[idx];
	if (!cb) return;
	// Caller keeps `entry.coordBufs[idx]` alive; transfer a fresh copy so the
	// worklet owns its own buffer and we can re-post on the next animated tick.
	const copy = cb.data.slice();
	(entry.workletNode as AudioWorkletNode).port.postMessage(
		{ type: 'path', data: copy.buffer, nPoints: cb.nPoints },
		[copy.buffer],
	);
}

export function startIldaPlayback(id: string, mode: 'static' | 'animated', fps: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'ildaFrame') return;
	if (entry.coordBufs.length === 0) return;

	if (entry.frameTimer !== null) {
		clearInterval(entry.frameTimer);
		entry.frameTimer = null;
	}

	// Always (re-)seed the worklet with the current frame so silence resumes
	// turn into sound on the next process() call.
	_postIldaCoordBufferToWorklet(entry, entry.frameIdx);

	if (mode === 'animated' && entry.coordBufs.length > 1) {
		const intervalMs = 1000 / Math.max(1, fps);
		entry.frameTimer = setInterval(() => {
			entry.frameIdx = (entry.frameIdx + 1) % entry.coordBufs.length;
			_postIldaCoordBufferToWorklet(entry, entry.frameIdx);
		}, intervalMs);
	}
}

export function stopIldaPlayback(id: string): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'ildaFrame') return;
	if (entry.frameTimer !== null) {
		clearInterval(entry.frameTimer);
		entry.frameTimer = null;
	}
	(entry.workletNode as AudioWorkletNode).port.postMessage({ type: 'clear' });
}

export function getIldaFrameInfo(id: string): { nFrames: number; nPoints: number; frameIdx: number } | null {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'ildaFrame') return null;
	if (entry.coordBufs.length === 0) return null;
	return {
		nFrames:  entry.coordBufs.length,
		nPoints:  entry.coordBufs[entry.frameIdx]?.nPoints ?? 0,
		frameIdx: entry.frameIdx,
	};
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
	} else if (entry.kind === 'lfo' || entry.kind === 'fmOscillator' || entry.kind === 'amOscillator' ||
	           entry.kind === 'fatOscillator' || entry.kind === 'pulseOscillator' || entry.kind === 'pwmOscillator') {
		if (entry.toneNode.state === 'started') entry.toneNode.stop();
		entry.toneNode.dispose();
	} else if (entry.kind === 'grainPlayer') {
		if (entry.toneNode.state === 'started') entry.toneNode.stop();
		entry.toneNode.dispose();
		entry.split.dispose();
	} else if (entry.kind === 'micInput') {
		try { entry.toneNode.close(); } catch {}
		entry.toneNode.dispose();
	} else if (entry.kind === 'sceneInput') {
		try { entry.workletNode.disconnect(); } catch {}
		entry.split.dispose();
	} else if (entry.kind === 'ildaFrame') {
		if (entry.frameTimer !== null) {
			clearInterval(entry.frameTimer);
			entry.frameTimer = null;
		}
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

export function setNodeLoop(id: string, loop: boolean): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'player') return;
	entry.toneNode.loop = loop;
}

export function setGrainPlayerMuted(id: string, muted: boolean): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'grainPlayer') return;
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

// Only entries that need a display name different from their action key.
// Everything else falls back to capitalising the action string.
const STUB_LABELS: Partial<Record<StubKind, string>> = {
	noiseGenerator: 'Noise',
	jcReverb:       'JCReverb',
	freeverb:       'Freeverb',
	feedbackDelay:  'FeedbackDelay',
	pingPongDelay:  'PingPongDelay',
	bitCrusher:     'BitCrusher',
	autoFilter:     'AutoFilter',
	autoPanner:     'AutoPanner',
	autoWah:        'AutoWah',
	frequencyShifter: 'FrequencyShifter',
	pitchShift:     'PitchShift',
	stereoWidener:  'StereoWidener',
	midSideCompressor:   'MidSideCompressor',
	multibandCompressor: 'MultibandCompressor',
	biquadFilter:   'BiquadFilter',
	panVol:         'PanVol',
	panner3d:       'Panner3D',
	crossFade:      'CrossFade',
	multibandSplit: 'MultibandSplit',
	dcMeter:        'DCMeter',
	amplitudeEnvelope:  'AmplitudeEnvelope',
	frequencyEnvelope:  'FrequencyEnvelope',
	waveShaper:     'WaveShaper',
	scaleExp:       'ScaleExp',
	greaterThan:    'GreaterThan',
	audioToGain:    'AudioToGain',
	gainToAudio:    'GainToAudio',
	toneEvent:      'ToneEvent',
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

	onNodesChange:     OnNodesChange<AppNode>;
	onEdgesChange:     OnEdgesChange<AppEdge>;
	onConnect:         OnConnect;
	onReconnect:       (oldEdge: AppEdge, newConnection: Connection) => void;
	addPlayerNode:          (trackUrl: string, position: { x: number; y: number }) => string;
	addOscillatorNode:      (position: { x: number; y: number }) => string;
	addGainNode:            (position: { x: number; y: number }) => string;
	addNoiseNode:           (position: { x: number; y: number }) => string;
	addDCSignalNode:        (position: { x: number; y: number }) => string;
	addLFONode:             (position: { x: number; y: number }) => string;
	addFMOscillatorNode:    (position: { x: number; y: number }) => string;
	addAMOscillatorNode:    (position: { x: number; y: number }) => string;
	addFatOscillatorNode:   (position: { x: number; y: number }) => string;
	addPulseOscillatorNode: (position: { x: number; y: number }) => string;
	addPWMOscillatorNode:   (position: { x: number; y: number }) => string;
	addGrainPlayerNode:     (position: { x: number; y: number }) => string;
	addMicInputNode:        (position: { x: number; y: number }) => string;
	addIldaFrameNode:       (position: { x: number; y: number }) => string;
	addStubNode:            (kind: StubKind, position: { x: number; y: number }) => string;
	addDebugNode:           (position: { x: number; y: number }) => string;
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
			data:     { label: 'Oscillator', frequency: 440, type: 'sine', detune: 0, phase: 0 },
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

	addLFONode: (position) => {
		const id = `lfo-${Date.now()}`;
		createLFOEntry(id);
		const newNode: AppNode = {
			id, type: 'lfo', position,
			data: { label: 'LFO', frequency: 1, type: 'sine', min: -1, max: 1, phase: 0 },
		};
		set({ nodes: [...get().nodes, newNode], audioVersion: get().audioVersion + 1 });
		return id;
	},

	addFMOscillatorNode: (position) => {
		const id = `fmOscillator-${Date.now()}`;
		createFMOscillatorEntry(id);
		const newNode: AppNode = {
			id, type: 'fmOscillator', position,
			data: { label: 'FM Osc', frequency: 440, type: 'sine', modulationType: 'square', modulationIndex: 10, harmonicity: 3, detune: 0, phase: 0 },
		};
		set({ nodes: [...get().nodes, newNode], audioVersion: get().audioVersion + 1 });
		return id;
	},

	addAMOscillatorNode: (position) => {
		const id = `amOscillator-${Date.now()}`;
		createAMOscillatorEntry(id);
		const newNode: AppNode = {
			id, type: 'amOscillator', position,
			data: { label: 'AM Osc', frequency: 440, type: 'sine', modulationType: 'square', harmonicity: 3, detune: 0, phase: 0 },
		};
		set({ nodes: [...get().nodes, newNode], audioVersion: get().audioVersion + 1 });
		return id;
	},

	addFatOscillatorNode: (position) => {
		const id = `fatOscillator-${Date.now()}`;
		createFatOscillatorEntry(id);
		const newNode: AppNode = {
			id, type: 'fatOscillator', position,
			data: { label: 'Fat Osc', frequency: 440, type: 'sawtooth', count: 3, spread: 20, detune: 0, phase: 0 },
		};
		set({ nodes: [...get().nodes, newNode], audioVersion: get().audioVersion + 1 });
		return id;
	},

	addPulseOscillatorNode: (position) => {
		const id = `pulseOscillator-${Date.now()}`;
		createPulseOscillatorEntry(id);
		const newNode: AppNode = {
			id, type: 'pulseOscillator', position,
			data: { label: 'Pulse Osc', frequency: 440, width: 0.5, detune: 0, phase: 0 },
		};
		set({ nodes: [...get().nodes, newNode], audioVersion: get().audioVersion + 1 });
		return id;
	},

	addPWMOscillatorNode: (position) => {
		const id = `pwmOscillator-${Date.now()}`;
		createPWMOscillatorEntry(id);
		const newNode: AppNode = {
			id, type: 'pwmOscillator', position,
			data: { label: 'PWM Osc', frequency: 440, modulationFrequency: 0.4, detune: 0, phase: 0 },
		};
		set({ nodes: [...get().nodes, newNode], audioVersion: get().audioVersion + 1 });
		return id;
	},

	addGrainPlayerNode: (position) => {
		const id = `grainPlayer-${Date.now()}`;
		createGrainPlayerEntry(id);
		const newNode: AppNode = {
			id, type: 'grainPlayer', position,
			data: { label: 'Grain Player', trackUrl: '', grainSize: 0.2, overlap: 0.1, playbackRate: 1, detune: 0, loop: true, loopStart: 0, loopEnd: 0, reverse: false },
		};
		set({ nodes: [...get().nodes, newNode], audioVersion: get().audioVersion + 1 });
		return id;
	},

	addMicInputNode: (position) => {
		const id = `micInput-${Date.now()}`;
		createMicInputEntry(id);
		const newNode: AppNode = {
			id, type: 'micInput', position,
			data: { label: 'Mic' },
		};
		set({ nodes: [...get().nodes, newNode], audioVersion: get().audioVersion + 1 });
		return id;
	},

	addIldaFrameNode: (position) => {
		const id = `ildaFrame-${Date.now()}`;
		createIldaFrameEntry(id);
		const newNode: AppNode = {
			id,
			type:     'ildaFrame',
			position,
			data:     {
				label:     'ILDA',
				ildUrl:    '',
				filename:  '',
				mode:      'static',
				fps:       30,
				isPlaying: false,
			},
		};
		set({ nodes: [...get().nodes, newNode], audioVersion: get().audioVersion + 1 });
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
			data:     { label: stubLabel(kind), kind },
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
			if (node.type === 'player') {
				createPlayerEntry(node.id);
			} else if (node.type === 'oscillator') {
				const d = node.data as OscillatorNodeData;
				createOscillatorEntry(node.id);
				setOscillatorFrequency(node.id, d.frequency);
				setOscillatorType(node.id, d.type);
			} else if (node.type === 'gain') {
				const d = node.data as GainNodeData;
				createGainEntry(node.id, d.gain);
			} else if (node.type === 'noiseGenerator') {
				const d = node.data as NoiseNodeData;
				createNoiseEntry(node.id, d.noiseType, d.volume);
			} else if (node.type === 'dcSignal') {
				const d = node.data as DCSignalNodeData;
				createDCSignalEntry(node.id, d.value);
			} else if (node.type === 'lfo') {
				createLFOEntry(node.id, node.data as LFONodeData);
			} else if (node.type === 'fmOscillator') {
				createFMOscillatorEntry(node.id, node.data as FMOscillatorNodeData);
			} else if (node.type === 'amOscillator') {
				createAMOscillatorEntry(node.id, node.data as AMOscillatorNodeData);
			} else if (node.type === 'fatOscillator') {
				createFatOscillatorEntry(node.id, node.data as FatOscillatorNodeData);
			} else if (node.type === 'pulseOscillator') {
				createPulseOscillatorEntry(node.id, node.data as PulseOscillatorNodeData);
			} else if (node.type === 'pwmOscillator') {
				createPWMOscillatorEntry(node.id, node.data as PWMOscillatorNodeData);
			} else if (node.type === 'grainPlayer') {
				createGrainPlayerEntry(node.id, node.data as GrainPlayerNodeData);
			} else if (node.type === 'micInput') {
				createMicInputEntry(node.id);
			} else if (node.type === 'ildaFrame') {
				createIldaFrameEntry(node.id);
				// File contents live behind a blob URL that does not survive a
				// reload — the user re-uploads via the node UI to repopulate
				// coordBufs. Persisted `filename` is shown until they do.
			}
			// debug, stub → no audio entry
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
			} else if (
				entry.kind === 'lfo' || entry.kind === 'fmOscillator' || entry.kind === 'amOscillator' ||
				entry.kind === 'fatOscillator' || entry.kind === 'pulseOscillator' || entry.kind === 'pwmOscillator'
			) {
				if (entry.toneNode.state === 'started') entry.toneNode.stop();
				entry.toneNode.dispose();
			} else if (entry.kind === 'grainPlayer') {
				if (entry.toneNode.state === 'started') entry.toneNode.stop();
				entry.toneNode.dispose();
				entry.split.dispose();
			} else if (entry.kind === 'micInput') {
				try { entry.toneNode.close(); } catch {}
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
