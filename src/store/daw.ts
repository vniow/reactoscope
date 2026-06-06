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
	Reverb,
	JCReverb,
	Freeverb,
	Delay,
	FeedbackDelay,
	PingPongDelay,
	Distortion,
	Chebyshev,
	BitCrusher,
	FrequencyShifter,
	PitchShift,
	StereoWidener,
	Chorus,
	Phaser,
	Tremolo,
	Vibrato,
	AutoFilter,
	AutoPanner,
	AutoWah,
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
	ReverbAudioEntry,
	JCReverbAudioEntry,
	FreeverbAudioEntry,
	DelayAudioEntry,
	FeedbackDelayAudioEntry,
	PingPongDelayAudioEntry,
	DistortionAudioEntry,
	ChebyshevAudioEntry,
	BitCrusherAudioEntry,
	FrequencyShifterAudioEntry,
	PitchShiftAudioEntry,
	StereoWidenerAudioEntry,
	ChorusAudioEntry,
	PhaserAudioEntry,
	TremoloAudioEntry,
	VibratoAudioEntry,
	AutoFilterAudioEntry,
	AutoPannerAudioEntry,
	AutoWahAudioEntry,
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
	ReverbNodeData,
	JCReverbNodeData,
	FreeverbNodeData,
	DelayNodeData,
	FeedbackDelayNodeData,
	PingPongDelayNodeData,
	DistortionNodeData,
	ChebyshevNodeData,
	BitCrusherNodeData,
	FrequencyShifterNodeData,
	PitchShiftNodeData,
	StereoWidenerNodeData,
	ChorusNodeData,
	PhaserNodeData,
	TremoloNodeData,
	VibratoNodeData,
	AutoFilterNodeData,
	AutoPannerNodeData,
	AutoWahNodeData,
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
	if ('toneNode' in tgt) return (tgt as { toneNode: ToneInputNode }).toneNode;
	return null;
}

// Follow the Tone.js .input chain to the underlying raw AudioNode that accepts signal.
// Raw Web Audio API nodes don't carry a Tone.js .input property, so the loop terminates there.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _resolveInput(node: ToneInputNode): any {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let n: any = node;
	for (let i = 0; i < 16 && n?.input !== undefined; i++) n = n.input;
	return n;
}

// Follow the Tone.js .output chain to the underlying raw AudioNode that produces signal.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _resolveOutput(node: ToneInputNode): any {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let n: any = node;
	for (let i = 0; i < 16 && n?.output !== undefined; i++) n = n.output;
	return n;
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

	const outputIndex = sourceHandle === 'out-1' ? 1 : 0;

	// Pre-resolve destination to the raw AudioNode that accepts signal.
	// This works for any ToneAudioNode destination (Gain, Effect, masterOutput gains, etc.)
	// and avoids relying on Tone.js instanceof checks inside its connect() standalone fn.
	const destAudio = _resolveInput(destNode);

	try {
		if (src.kind === 'player' || src.kind === 'grainPlayer') {
			// split.output is the raw ChannelSplitterNode; connect its channel to destAudio.
			_resolveOutput(src.split as unknown as ToneInputNode).connect(destAudio, outputIndex, 0);
		} else if (src.kind === 'sceneInput') {
			const chanIndex = parseInt(sourceHandle.replace('out-', ''), 10);
			// split.output is the underlying ChannelSplitterNode (std-audio-context).
			src.split.output.connect(destAudio, chanIndex, 0);
		} else if ('toneNode' in src) {
			// Resolve source to its raw output AudioNode and connect directly.
			// Explicit raw-node-to-raw-node connection works for all Tone.js node types.
			_resolveOutput((src as { toneNode: ToneInputNode }).toneNode).connect(destAudio, outputIndex, 0);
		}
	} catch (e) {
		if ((e as Error)?.message?.includes('already connected') ||
			(e as Error)?.message?.includes('InvalidStateError')) return;
		console.error('[audio] connectAudioNodes error', { sourceId, targetId, srcKind: src.kind, error: e });
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

	const outputIndex = sourceHandle === 'out-1' ? 1 : 0;
	const destAudio   = _resolveInput(destNode);

	try {
		if (src.kind === 'player' || src.kind === 'grainPlayer') {
			_resolveOutput(src.split as unknown as ToneInputNode).disconnect(destAudio, outputIndex);
		} else if (src.kind === 'sceneInput') {
			const chanIndex = parseInt(sourceHandle.replace('out-', ''), 10);
			src.split.output.disconnect(destAudio, chanIndex, 0);
		} else if ('toneNode' in src) {
			// Use exact same resolution as connectAudioNodes so disconnect is targeted —
			// prevents Tone.js disconnect-all fallback from severing unrelated connections.
			_resolveOutput((src as { toneNode: ToneInputNode }).toneNode).disconnect(destAudio, outputIndex);
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

// ─── Effect audio node lifecycle ─────────────────────────────────────────────

function createReverbEntry(id: string, d: ReverbNodeData): ReverbAudioEntry {
	// Reverb.generate() is called automatically by the Tone.js v15 constructor — don't call it again.
	const toneNode = new Reverb({ decay: d.decay, preDelay: d.preDelay, wet: d.wet });
	const entry: ReverbAudioEntry = { kind: 'reverb', toneNode };
	_audioNodes.set(id, entry);
	return entry;
}
export function setReverbDecay(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'reverb') return;
	e.toneNode.decay = v;
}
export function setReverbPreDelay(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'reverb') return;
	e.toneNode.preDelay = v;
}
export function setReverbWet(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'reverb') return;
	e.toneNode.wet.value = v;
}

function createJCReverbEntry(id: string, d: JCReverbNodeData): JCReverbAudioEntry {
	const toneNode = new JCReverb({ roomSize: d.roomSize, wet: d.wet });
	const entry: JCReverbAudioEntry = { kind: 'jcReverb', toneNode };
	_audioNodes.set(id, entry);
	return entry;
}
export function setJCReverbRoomSize(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'jcReverb') return;
	e.toneNode.roomSize.value = v;
}
export function setJCReverbWet(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'jcReverb') return;
	e.toneNode.wet.value = v;
}

function createFreeverbEntry(id: string, d: FreeverbNodeData): FreeverbAudioEntry {
	const toneNode = new Freeverb({ roomSize: d.roomSize, dampening: d.dampening, wet: d.wet });
	const entry: FreeverbAudioEntry = { kind: 'freeverb', toneNode };
	_audioNodes.set(id, entry);
	return entry;
}
export function setFreeverbRoomSize(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'freeverb') return;
	e.toneNode.roomSize.value = v;
}
export function setFreeverbDampening(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'freeverb') return;
	e.toneNode.dampening.value = v;
}
export function setFreeverbWet(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'freeverb') return;
	e.toneNode.wet.value = v;
}

function createDelayEntry(id: string, d: DelayNodeData): DelayAudioEntry {
	const toneNode = new Delay(d.delayTime);
	const entry: DelayAudioEntry = { kind: 'delay', toneNode };
	_audioNodes.set(id, entry);
	return entry;
}
export function setDelayTime(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'delay') return;
	e.toneNode.delayTime.value = v;
}

function createFeedbackDelayEntry(id: string, d: FeedbackDelayNodeData): FeedbackDelayAudioEntry {
	const toneNode = new FeedbackDelay({ delayTime: d.delayTime, feedback: d.feedback, wet: d.wet });
	const entry: FeedbackDelayAudioEntry = { kind: 'feedbackDelay', toneNode };
	_audioNodes.set(id, entry);
	return entry;
}
export function setFeedbackDelayTime(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'feedbackDelay') return;
	e.toneNode.delayTime.value = v;
}
export function setFeedbackDelayFeedback(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'feedbackDelay') return;
	e.toneNode.feedback.value = v;
}
export function setFeedbackDelayWet(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'feedbackDelay') return;
	e.toneNode.wet.value = v;
}

function createPingPongDelayEntry(id: string, d: PingPongDelayNodeData): PingPongDelayAudioEntry {
	const toneNode = new PingPongDelay({ delayTime: d.delayTime, feedback: d.feedback, wet: d.wet });
	const entry: PingPongDelayAudioEntry = { kind: 'pingPongDelay', toneNode };
	_audioNodes.set(id, entry);
	return entry;
}
export function setPingPongDelayTime(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'pingPongDelay') return;
	e.toneNode.delayTime.value = v;
}
export function setPingPongDelayFeedback(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'pingPongDelay') return;
	e.toneNode.feedback.value = v;
}
export function setPingPongDelayWet(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'pingPongDelay') return;
	e.toneNode.wet.value = v;
}

function createDistortionEntry(id: string, d: DistortionNodeData): DistortionAudioEntry {
	const toneNode = new Distortion({ distortion: d.distortion, oversample: d.oversample, wet: d.wet });
	const entry: DistortionAudioEntry = { kind: 'distortion', toneNode };
	_audioNodes.set(id, entry);
	return entry;
}
export function setDistortionAmount(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'distortion') return;
	e.toneNode.distortion = v;
}
export function setDistortionOversample(id: string, v: 'none' | '2x' | '4x'): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'distortion') return;
	e.toneNode.oversample = v;
}
export function setDistortionWet(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'distortion') return;
	e.toneNode.wet.value = v;
}

function createChebyshevEntry(id: string, d: ChebyshevNodeData): ChebyshevAudioEntry {
	const toneNode = new Chebyshev({ order: d.order, wet: d.wet });
	const entry: ChebyshevAudioEntry = { kind: 'chebyshev', toneNode };
	_audioNodes.set(id, entry);
	return entry;
}
export function setChebyshevOrder(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'chebyshev') return;
	e.toneNode.order = Math.round(v);
}
export function setChebyshevWet(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'chebyshev') return;
	e.toneNode.wet.value = v;
}

function createBitCrusherEntry(id: string, d: BitCrusherNodeData): BitCrusherAudioEntry {
	const toneNode = new BitCrusher({ bits: d.bits, wet: d.wet });
	const entry: BitCrusherAudioEntry = { kind: 'bitCrusher', toneNode };
	_audioNodes.set(id, entry);
	return entry;
}
export function setBitCrusherBits(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'bitCrusher') return;
	e.toneNode.bits.value = Math.round(v);
}
export function setBitCrusherWet(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'bitCrusher') return;
	e.toneNode.wet.value = v;
}

function createFrequencyShifterEntry(id: string, d: FrequencyShifterNodeData): FrequencyShifterAudioEntry {
	const toneNode = new FrequencyShifter({ frequency: d.frequency, wet: d.wet });
	const entry: FrequencyShifterAudioEntry = { kind: 'frequencyShifter', toneNode };
	_audioNodes.set(id, entry);
	return entry;
}
export function setFrequencyShifterFrequency(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'frequencyShifter') return;
	e.toneNode.frequency.value = v;
}
export function setFrequencyShifterWet(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'frequencyShifter') return;
	e.toneNode.wet.value = v;
}

function createPitchShiftEntry(id: string, d: PitchShiftNodeData): PitchShiftAudioEntry {
	const toneNode = new PitchShift({ pitch: d.pitch, windowSize: d.windowSize, feedback: d.feedback, wet: d.wet });
	const entry: PitchShiftAudioEntry = { kind: 'pitchShift', toneNode };
	_audioNodes.set(id, entry);
	return entry;
}
export function setPitchShiftPitch(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'pitchShift') return;
	e.toneNode.pitch = v;
}
export function setPitchShiftWindowSize(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'pitchShift') return;
	e.toneNode.windowSize = v;
}
export function setPitchShiftFeedback(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'pitchShift') return;
	e.toneNode.feedback.value = v;
}
export function setPitchShiftWet(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'pitchShift') return;
	e.toneNode.wet.value = v;
}

function createStereoWidenerEntry(id: string, d: StereoWidenerNodeData): StereoWidenerAudioEntry {
	const toneNode = new StereoWidener({ width: d.width, wet: d.wet });
	const entry: StereoWidenerAudioEntry = { kind: 'stereoWidener', toneNode };
	_audioNodes.set(id, entry);
	return entry;
}
export function setStereoWidenerWidth(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'stereoWidener') return;
	e.toneNode.width.value = v;
}
export function setStereoWidenerWet(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'stereoWidener') return;
	e.toneNode.wet.value = v;
}

// ─── LFO-driven effect lifecycle ─────────────────────────────────────────────

function createChorusEntry(id: string, d: ChorusNodeData): ChorusAudioEntry {
	const toneNode = new Chorus({ frequency: d.frequency, delayTime: d.delayTime, depth: d.depth, wet: d.wet });
	const entry: ChorusAudioEntry = { kind: 'chorus', toneNode };
	_audioNodes.set(id, entry);
	return entry;
}
export async function startChorus(id: string): Promise<void> {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'chorus') return;
	await toneStart(); e.toneNode.start();
}
export function stopChorus(id: string): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'chorus') return;
	if (e.toneNode.state === 'started') e.toneNode.stop();
}
export function setChorusFrequency(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'chorus') return;
	e.toneNode.frequency.value = v;
}
export function setChorusDelayTime(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'chorus') return;
	e.toneNode.delayTime = v;
}
export function setChorusDepth(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'chorus') return;
	e.toneNode.depth = v;
}
export function setChorusWet(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'chorus') return;
	e.toneNode.wet.value = v;
}

function createPhaserEntry(id: string, d: PhaserNodeData): PhaserAudioEntry {
	// Phaser starts its internal LFOs automatically in the constructor — no start() needed.
	const toneNode = new Phaser({ frequency: d.frequency, octaves: d.octaves, baseFrequency: d.baseFrequency, wet: d.wet });
	const entry: PhaserAudioEntry = { kind: 'phaser', toneNode };
	_audioNodes.set(id, entry);
	return entry;
}
export function setPhaserFrequency(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'phaser') return;
	e.toneNode.frequency.value = v;
}
export function setPhaserOctaves(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'phaser') return;
	e.toneNode.octaves = v;
}
export function setPhaserBaseFrequency(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'phaser') return;
	e.toneNode.baseFrequency = v;
}
export function setPhaserWet(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'phaser') return;
	e.toneNode.wet.value = v;
}

function createTremoloEntry(id: string, d: TremoloNodeData): TremoloAudioEntry {
	const toneNode = new Tremolo({ frequency: d.frequency, depth: d.depth, wet: d.wet });
	const entry: TremoloAudioEntry = { kind: 'tremolo', toneNode };
	_audioNodes.set(id, entry);
	return entry;
}
export async function startTremolo(id: string): Promise<void> {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'tremolo') return;
	await toneStart(); e.toneNode.start();
}
export function stopTremolo(id: string): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'tremolo') return;
	if (e.toneNode.state === 'started') e.toneNode.stop();
}
export function setTremoloFrequency(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'tremolo') return;
	e.toneNode.frequency.value = v;
}
export function setTremoloDepth(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'tremolo') return;
	e.toneNode.depth.value = v;
}
export function setTremoloWet(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'tremolo') return;
	e.toneNode.wet.value = v;
}

function createVibratoEntry(id: string, d: VibratoNodeData): VibratoAudioEntry {
	const toneNode = new Vibrato({ frequency: d.frequency, depth: d.depth, wet: d.wet });
	const entry: VibratoAudioEntry = { kind: 'vibrato', toneNode };
	_audioNodes.set(id, entry);
	return entry;
}
export async function startVibrato(id: string): Promise<void> {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'vibrato') return;
	await toneStart(); e.toneNode.start();
}
export function stopVibrato(id: string): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'vibrato') return;
	if (e.toneNode.state === 'started') e.toneNode.stop();
}
export function setVibratoFrequency(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'vibrato') return;
	e.toneNode.frequency.value = v;
}
export function setVibratoDepth(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'vibrato') return;
	e.toneNode.depth.value = v;
}
export function setVibratoWet(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'vibrato') return;
	e.toneNode.wet.value = v;
}

function createAutoFilterEntry(id: string, d: AutoFilterNodeData): AutoFilterAudioEntry {
	const toneNode = new AutoFilter({ frequency: d.frequency, baseFrequency: d.baseFrequency, octaves: d.octaves, wet: d.wet });
	const entry: AutoFilterAudioEntry = { kind: 'autoFilter', toneNode };
	_audioNodes.set(id, entry);
	return entry;
}
export async function startAutoFilter(id: string): Promise<void> {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'autoFilter') return;
	await toneStart(); e.toneNode.start();
}
export function stopAutoFilter(id: string): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'autoFilter') return;
	if (e.toneNode.state === 'started') e.toneNode.stop();
}
export function setAutoFilterFrequency(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'autoFilter') return;
	e.toneNode.frequency.value = v;
}
export function setAutoFilterBaseFrequency(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'autoFilter') return;
	e.toneNode.baseFrequency = v;
}
export function setAutoFilterOctaves(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'autoFilter') return;
	e.toneNode.octaves = v;
}
export function setAutoFilterWet(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'autoFilter') return;
	e.toneNode.wet.value = v;
}

function createAutoPannerEntry(id: string, d: AutoPannerNodeData): AutoPannerAudioEntry {
	const toneNode = new AutoPanner({ frequency: d.frequency, wet: d.wet });
	const entry: AutoPannerAudioEntry = { kind: 'autoPanner', toneNode };
	_audioNodes.set(id, entry);
	return entry;
}
export async function startAutoPanner(id: string): Promise<void> {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'autoPanner') return;
	await toneStart(); e.toneNode.start();
}
export function stopAutoPanner(id: string): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'autoPanner') return;
	if (e.toneNode.state === 'started') e.toneNode.stop();
}
export function setAutoPannerFrequency(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'autoPanner') return;
	e.toneNode.frequency.value = v;
}
export function setAutoPannerWet(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'autoPanner') return;
	e.toneNode.wet.value = v;
}

function createAutoWahEntry(id: string, d: AutoWahNodeData): AutoWahAudioEntry {
	const toneNode = new AutoWah({ baseFrequency: d.baseFrequency, octaves: d.octaves, sensitivity: d.sensitivity, wet: d.wet });
	const entry: AutoWahAudioEntry = { kind: 'autoWah', toneNode };
	_audioNodes.set(id, entry);
	return entry;
}
export function setAutoWahBaseFrequency(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'autoWah') return;
	e.toneNode.baseFrequency = v;
}
export function setAutoWahOctaves(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'autoWah') return;
	e.toneNode.octaves = v;
}
export function setAutoWahSensitivity(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'autoWah') return;
	e.toneNode.sensitivity = v;
}
export function setAutoWahWet(id: string, v: number): void {
	const e = _audioNodes.get(id); if (!e || e.kind !== 'autoWah') return;
	e.toneNode.wet.value = v;
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
	} else if (
		entry.kind === 'reverb'    || entry.kind === 'jcReverb'        || entry.kind === 'freeverb'     ||
		entry.kind === 'delay'     || entry.kind === 'feedbackDelay'   || entry.kind === 'pingPongDelay' ||
		entry.kind === 'distortion'|| entry.kind === 'chebyshev'       || entry.kind === 'bitCrusher'   ||
		entry.kind === 'frequencyShifter' || entry.kind === 'pitchShift' || entry.kind === 'stereoWidener' ||
		entry.kind === 'phaser'    || entry.kind === 'autoWah'
	) {
		entry.toneNode.dispose();
	} else if (
		entry.kind === 'chorus' || entry.kind === 'tremolo' ||
		entry.kind === 'vibrato'|| entry.kind === 'autoFilter' || entry.kind === 'autoPanner'
	) {
		if (entry.toneNode.state === 'started') entry.toneNode.stop();
		entry.toneNode.dispose();
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
	addStubNode:            (kind: StubKind, position: { x: number; y: number }) => string;
	addDebugNode:           (position: { x: number; y: number }) => string;
	addReverbNode:          (position: { x: number; y: number }) => string;
	addJCReverbNode:        (position: { x: number; y: number }) => string;
	addFreeverbNode:        (position: { x: number; y: number }) => string;
	addDelayNode:           (position: { x: number; y: number }) => string;
	addFeedbackDelayNode:   (position: { x: number; y: number }) => string;
	addPingPongDelayNode:   (position: { x: number; y: number }) => string;
	addDistortionNode:      (position: { x: number; y: number }) => string;
	addChebyshevNode:       (position: { x: number; y: number }) => string;
	addBitCrusherNode:      (position: { x: number; y: number }) => string;
	addFrequencyShifterNode:(position: { x: number; y: number }) => string;
	addPitchShiftNode:      (position: { x: number; y: number }) => string;
	addStereoWidenerNode:   (position: { x: number; y: number }) => string;
	addChorusNode:          (position: { x: number; y: number }) => string;
	addPhaserNode:          (position: { x: number; y: number }) => string;
	addTremoloNode:         (position: { x: number; y: number }) => string;
	addVibratoNode:         (position: { x: number; y: number }) => string;
	addAutoFilterNode:      (position: { x: number; y: number }) => string;
	addAutoPannerNode:      (position: { x: number; y: number }) => string;
	addAutoWahNode:         (position: { x: number; y: number }) => string;
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
			data: { label: 'Grain Player', trackUrl: '', grainSize: 0.2, overlap: 0.1, playbackRate: 1, detune: 0, loop: true },
		};
		set({ nodes: [...get().nodes, newNode], audioVersion: get().audioVersion + 1 });
		return id;
	},

	addMicInputNode: (position) => {
		const id = `micInput-${Date.now()}`;
		createMicInputEntry(id);
		const newNode: AppNode = {
			id, type: 'micInput', position,
			data: { label: 'Mic Input' },
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

	addReverbNode: (position) => {
		const id = `reverb-${Date.now()}`;
		const data: ReverbNodeData = { label: 'Reverb', decay: 1.5, preDelay: 0.01, wet: 0.5 };
		createReverbEntry(id, data);
		set({ nodes: [...get().nodes, { id, type: 'reverb', position, data }], audioVersion: get().audioVersion + 1 });
		return id;
	},

	addJCReverbNode: (position) => {
		const id = `jcReverb-${Date.now()}`;
		const data: JCReverbNodeData = { label: 'JCReverb', roomSize: 0.5, wet: 0.5 };
		createJCReverbEntry(id, data);
		set({ nodes: [...get().nodes, { id, type: 'jcReverb', position, data }], audioVersion: get().audioVersion + 1 });
		return id;
	},

	addFreeverbNode: (position) => {
		const id = `freeverb-${Date.now()}`;
		const data: FreeverbNodeData = { label: 'Freeverb', roomSize: 0.7, dampening: 3000, wet: 0.5 };
		createFreeverbEntry(id, data);
		set({ nodes: [...get().nodes, { id, type: 'freeverb', position, data }], audioVersion: get().audioVersion + 1 });
		return id;
	},

	addDelayNode: (position) => {
		const id = `delay-${Date.now()}`;
		const data: DelayNodeData = { label: 'Delay', delayTime: 0.25 };
		createDelayEntry(id, data);
		set({ nodes: [...get().nodes, { id, type: 'delay', position, data }], audioVersion: get().audioVersion + 1 });
		return id;
	},

	addFeedbackDelayNode: (position) => {
		const id = `feedbackDelay-${Date.now()}`;
		const data: FeedbackDelayNodeData = { label: 'FeedbackDelay', delayTime: 0.25, feedback: 0.5, wet: 0.5 };
		createFeedbackDelayEntry(id, data);
		set({ nodes: [...get().nodes, { id, type: 'feedbackDelay', position, data }], audioVersion: get().audioVersion + 1 });
		return id;
	},

	addPingPongDelayNode: (position) => {
		const id = `pingPongDelay-${Date.now()}`;
		const data: PingPongDelayNodeData = { label: 'PingPongDelay', delayTime: 0.25, feedback: 0.5, wet: 0.5 };
		createPingPongDelayEntry(id, data);
		set({ nodes: [...get().nodes, { id, type: 'pingPongDelay', position, data }], audioVersion: get().audioVersion + 1 });
		return id;
	},

	addDistortionNode: (position) => {
		const id = `distortion-${Date.now()}`;
		const data: DistortionNodeData = { label: 'Distortion', distortion: 0.4, oversample: 'none', wet: 1 };
		createDistortionEntry(id, data);
		set({ nodes: [...get().nodes, { id, type: 'distortion', position, data }], audioVersion: get().audioVersion + 1 });
		return id;
	},

	addChebyshevNode: (position) => {
		const id = `chebyshev-${Date.now()}`;
		const data: ChebyshevNodeData = { label: 'Chebyshev', order: 50, wet: 1 };
		createChebyshevEntry(id, data);
		set({ nodes: [...get().nodes, { id, type: 'chebyshev', position, data }], audioVersion: get().audioVersion + 1 });
		return id;
	},

	addBitCrusherNode: (position) => {
		const id = `bitCrusher-${Date.now()}`;
		const data: BitCrusherNodeData = { label: 'BitCrusher', bits: 4, wet: 1 };
		createBitCrusherEntry(id, data);
		set({ nodes: [...get().nodes, { id, type: 'bitCrusher', position, data }], audioVersion: get().audioVersion + 1 });
		return id;
	},

	addFrequencyShifterNode: (position) => {
		const id = `frequencyShifter-${Date.now()}`;
		const data: FrequencyShifterNodeData = { label: 'FreqShifter', frequency: 0, wet: 1 };
		createFrequencyShifterEntry(id, data);
		set({ nodes: [...get().nodes, { id, type: 'frequencyShifter', position, data }], audioVersion: get().audioVersion + 1 });
		return id;
	},

	addPitchShiftNode: (position) => {
		const id = `pitchShift-${Date.now()}`;
		const data: PitchShiftNodeData = { label: 'PitchShift', pitch: 0, windowSize: 0.1, feedback: 0, wet: 1 };
		createPitchShiftEntry(id, data);
		set({ nodes: [...get().nodes, { id, type: 'pitchShift', position, data }], audioVersion: get().audioVersion + 1 });
		return id;
	},

	addStereoWidenerNode: (position) => {
		const id = `stereoWidener-${Date.now()}`;
		const data: StereoWidenerNodeData = { label: 'StereoWidener', width: 0.5, wet: 1 };
		createStereoWidenerEntry(id, data);
		set({ nodes: [...get().nodes, { id, type: 'stereoWidener', position, data }], audioVersion: get().audioVersion + 1 });
		return id;
	},

	addChorusNode: (position) => {
		const id = `chorus-${Date.now()}`;
		const data: ChorusNodeData = { label: 'Chorus', frequency: 1.5, delayTime: 3.5, depth: 0.7, wet: 0.5 };
		createChorusEntry(id, data);
		set({ nodes: [...get().nodes, { id, type: 'chorus', position, data }], audioVersion: get().audioVersion + 1 });
		return id;
	},

	addPhaserNode: (position) => {
		const id = `phaser-${Date.now()}`;
		const data: PhaserNodeData = { label: 'Phaser', frequency: 0.5, octaves: 3, baseFrequency: 350, wet: 0.5 };
		createPhaserEntry(id, data);
		set({ nodes: [...get().nodes, { id, type: 'phaser', position, data }], audioVersion: get().audioVersion + 1 });
		return id;
	},

	addTremoloNode: (position) => {
		const id = `tremolo-${Date.now()}`;
		const data: TremoloNodeData = { label: 'Tremolo', frequency: 10, depth: 0.5, wet: 0.5 };
		createTremoloEntry(id, data);
		set({ nodes: [...get().nodes, { id, type: 'tremolo', position, data }], audioVersion: get().audioVersion + 1 });
		return id;
	},

	addVibratoNode: (position) => {
		const id = `vibrato-${Date.now()}`;
		const data: VibratoNodeData = { label: 'Vibrato', frequency: 5, depth: 0.1, wet: 0.5 };
		createVibratoEntry(id, data);
		set({ nodes: [...get().nodes, { id, type: 'vibrato', position, data }], audioVersion: get().audioVersion + 1 });
		return id;
	},

	addAutoFilterNode: (position) => {
		const id = `autoFilter-${Date.now()}`;
		const data: AutoFilterNodeData = { label: 'AutoFilter', frequency: 1, baseFrequency: 200, octaves: 2.6, wet: 1 };
		createAutoFilterEntry(id, data);
		set({ nodes: [...get().nodes, { id, type: 'autoFilter', position, data }], audioVersion: get().audioVersion + 1 });
		return id;
	},

	addAutoPannerNode: (position) => {
		const id = `autoPanner-${Date.now()}`;
		const data: AutoPannerNodeData = { label: 'AutoPanner', frequency: 1, wet: 1 };
		createAutoPannerEntry(id, data);
		set({ nodes: [...get().nodes, { id, type: 'autoPanner', position, data }], audioVersion: get().audioVersion + 1 });
		return id;
	},

	addAutoWahNode: (position) => {
		const id = `autoWah-${Date.now()}`;
		const data: AutoWahNodeData = { label: 'AutoWah', baseFrequency: 100, octaves: 6, sensitivity: 0, wet: 1 };
		createAutoWahEntry(id, data);
		set({ nodes: [...get().nodes, { id, type: 'autoWah', position, data }], audioVersion: get().audioVersion + 1 });
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
			} else if (node.type === 'reverb') {
				createReverbEntry(node.id, node.data as ReverbNodeData);
			} else if (node.type === 'jcReverb') {
				createJCReverbEntry(node.id, node.data as JCReverbNodeData);
			} else if (node.type === 'freeverb') {
				createFreeverbEntry(node.id, node.data as FreeverbNodeData);
			} else if (node.type === 'delay') {
				createDelayEntry(node.id, node.data as DelayNodeData);
			} else if (node.type === 'feedbackDelay') {
				createFeedbackDelayEntry(node.id, node.data as FeedbackDelayNodeData);
			} else if (node.type === 'pingPongDelay') {
				createPingPongDelayEntry(node.id, node.data as PingPongDelayNodeData);
			} else if (node.type === 'distortion') {
				createDistortionEntry(node.id, node.data as DistortionNodeData);
			} else if (node.type === 'chebyshev') {
				createChebyshevEntry(node.id, node.data as ChebyshevNodeData);
			} else if (node.type === 'bitCrusher') {
				createBitCrusherEntry(node.id, node.data as BitCrusherNodeData);
			} else if (node.type === 'frequencyShifter') {
				createFrequencyShifterEntry(node.id, node.data as FrequencyShifterNodeData);
			} else if (node.type === 'pitchShift') {
				createPitchShiftEntry(node.id, node.data as PitchShiftNodeData);
			} else if (node.type === 'stereoWidener') {
				createStereoWidenerEntry(node.id, node.data as StereoWidenerNodeData);
			} else if (node.type === 'chorus') {
				createChorusEntry(node.id, node.data as ChorusNodeData);
			} else if (node.type === 'phaser') {
				createPhaserEntry(node.id, node.data as PhaserNodeData);
			} else if (node.type === 'tremolo') {
				createTremoloEntry(node.id, node.data as TremoloNodeData);
			} else if (node.type === 'vibrato') {
				createVibratoEntry(node.id, node.data as VibratoNodeData);
			} else if (node.type === 'autoFilter') {
				createAutoFilterEntry(node.id, node.data as AutoFilterNodeData);
			} else if (node.type === 'autoPanner') {
				createAutoPannerEntry(node.id, node.data as AutoPannerNodeData);
			} else if (node.type === 'autoWah') {
				createAutoWahEntry(node.id, node.data as AutoWahNodeData);
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
			} else if (
				entry.kind === 'lfo' || entry.kind === 'fmOscillator' || entry.kind === 'amOscillator' ||
				entry.kind === 'fatOscillator' || entry.kind === 'pulseOscillator' || entry.kind === 'pwmOscillator'
			) {
				if (entry.toneNode.state === 'started') entry.toneNode.stop();
				entry.toneNode.dispose();
			} else if (entry.kind === 'grainPlayer') {
				if (entry.toneNode.state === 'started') entry.toneNode.stop();
				entry.toneNode.dispose();
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
