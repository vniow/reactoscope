import type { Node, Edge, BuiltInNode } from '@xyflow/react';
import type { Player, Gain, Analyser, Oscillator, Merge, Split, Noise, Signal } from 'tone';

// ─── Handle ID convention ─────────────────────────────────────────────────────
//   Source handles: 'out-0', 'out-1', ...  (position Bottom)
//   Target handles: 'in-0',  'in-1',  ...  (position Top)
//
//   MasterOutputNode: 'in-0' = Left channel, 'in-1' = Right channel

// ─── React Flow node data ─────────────────────────────────────────────────────

export type PlayerNodeData = {
	trackUrl: string;
	label: string;
};

export type MasterOutputNodeData = {
	label: string;
	mode:  'stereo' | 'multichannel';
};

export type OscillatorNodeData = {
	label: string;
	frequency: number;
	type: 'sine' | 'square' | 'triangle' | 'sawtooth';
};

export type GainNodeData = {
	label: string;
	gain: number;  // 0–2, default 1.0
};

export type StubKind =
	| 'reverb'
	| 'delay'
	| 'filter'
	| 'distortion'
	| 'compressor'
	| 'noiseGenerator'
	| 'panner'
	| 'split'
	| 'merge';

export type StubNodeData = {
	label: string;
	kind: StubKind;
};

// ─── React Flow typed node union ──────────────────────────────────────────────

export type PlayerFlowNode       = Node<PlayerNodeData,       'player'>;
export type MasterOutputFlowNode = Node<MasterOutputNodeData, 'masterOutput'>;
export type OscillatorFlowNode   = Node<OscillatorNodeData,   'oscillator'>;
export type GainFlowNode         = Node<GainNodeData,         'gain'>;
export type StubFlowNode         = Node<StubNodeData,         'stub'>;

export type NoiseNodeData = {
	label:     string;
	noiseType: 'white' | 'pink' | 'brown';
	volume:    number;  // dB, range -40 to 0, default -6
};

export type NoiseFlowNode = Node<NoiseNodeData, 'noiseGenerator'>;

export type DCSignalNodeData = {
	label: string;
	value: number;  // constant output level, -1 to 1, default 1
};

export type DCSignalFlowNode = Node<DCSignalNodeData, 'dcSignal'>;

export type SceneInputNodeData = {
	label:        string;
	scanFrequency: number;  // Hz — how many full traces per second (default 50)
};

export type SceneInputFlowNode = Node<SceneInputNodeData, 'sceneInput'>;

export type AppNode =
	| BuiltInNode
	| PlayerFlowNode
	| MasterOutputFlowNode
	| OscillatorFlowNode
	| GainFlowNode
	| StubFlowNode
	| NoiseFlowNode
	| DCSignalFlowNode
	| SceneInputFlowNode;

export type AppEdge = Edge;

// ─── Audio node registry entries ─────────────────────────────────────────────

export type PlayerAudioEntry = {
	kind:           'player';
	toneNode:       Player;
	split:          Split;    // splits stereo output into L (out-0) and R (out-1)
	startOffset:    number;   // track position (s) at the last play() or seek()
	currentRate:    number;   // mirrors toneNode.playbackRate
	isExplicitStop: boolean;  // true when stop/pause/seek initiated the onstop
	isPlaying:      boolean;
	playbackEndCb:  (() => void) | null;
};

export type MasterOutputAudioEntry = {
	kind:       'masterOutput';
	// XY / stereo channels (always present)
	inputGainX: Gain;     // in-0 = X position / stereo L
	inputGainY: Gain;     // in-1 = Y position / stereo R
	// Colour channels (always created, only wired when in multichannel mode)
	inputGainR: Gain;     // in-2 = Red
	inputGainG: Gain;     // in-3 = Green
	inputGainB: Gain;     // in-4 = Blue
	inputGainA: Gain;     // in-5 = Alpha
	merge:      Merge;    // 6-channel merge → toDestination()
	xAnalyser:  Analyser; // X axis of oscilloscope (stereo L)
	yAnalyser:  Analyser; // Y axis of oscilloscope (stereo R)
	rAnalyser:  Analyser; // Red colour channel
	gAnalyser:  Analyser; // Green colour channel
	bAnalyser:  Analyser; // Blue colour channel
	aAnalyser:  Analyser; // Alpha colour channel
};

export type OscillatorAudioEntry = {
	kind:     'oscillator';
	toneNode: Oscillator;
};

export type GainAudioEntry = {
	kind:     'gain';
	toneNode: Gain;
};

export type NoiseAudioEntry = {
	kind:     'noise';
	toneNode: Noise;
};

export type DCSignalAudioEntry = {
	kind:     'dcSignal';
	toneNode: Signal<'audioRange'>;
};

export type SceneInputAudioEntry = {
	kind:        'sceneInput';
	// workletNode is the standardized-audio-context AudioWorkletNode returned by
	// toneCtx.createAudioWorkletNode() — typed as any to avoid standardized-audio-context
	// type import chain; we only call .connect() / .port.postMessage() on it.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	workletNode: any;
	split:       Split;   // Tone.Split(6) — use split.output.connect(dest, ch, 0) per channel
};

// Stubs are NOT in the audio registry — they have no Tone.js instances yet.

export type AudioNodeEntry =
	| PlayerAudioEntry
	| MasterOutputAudioEntry
	| OscillatorAudioEntry
	| GainAudioEntry
	| NoiseAudioEntry
	| DCSignalAudioEntry
	| SceneInputAudioEntry;

export type AudioNodeMap = Map<string, AudioNodeEntry>;
