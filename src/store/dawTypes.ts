import type { Node, Edge, BuiltInNode } from '@xyflow/react';
import type { Player, Gain, Analyser, Oscillator, Merge, Split, Noise, Signal, LFO, FMOscillator, AMOscillator, FatOscillator, PulseOscillator, PWMOscillator, GrainPlayer, UserMedia } from 'tone';

export type OscType = 'sine' | 'square' | 'triangle' | 'sawtooth';

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
	label:         string;
	speakersMuted: boolean;
};

export type OscillatorNodeData = {
	label:     string;
	frequency: number;
	type:      OscType;
	detune:    number;   // cents, -1200–1200, default 0
	phase:     number;   // degrees, 0–360, default 0
};

export type GainNodeData = {
	label: string;
	gain: number;  // 0–2, default 1.0
};

export type StubKind =
	// — existing —
	| 'reverb' | 'delay' | 'filter' | 'distortion' | 'compressor' | 'noiseGenerator' | 'panner' | 'split' | 'merge'
	// — Source / Instrument —
	| 'omniOscillator'
	| 'players' | 'userMedia'
	| 'synth' | 'monoSynth' | 'polySynth' | 'fmSynth' | 'amSynth' | 'duoSynth'
	| 'membraneSynth' | 'metalSynth' | 'noiseSynth' | 'pluckSynth' | 'sampler'
	// — Effect —
	| 'jcReverb' | 'freeverb' | 'feedbackDelay' | 'pingPongDelay'
	| 'chorus' | 'phaser' | 'tremolo' | 'vibrato' | 'chebyshev' | 'bitCrusher'
	| 'autoFilter' | 'autoPanner' | 'autoWah' | 'frequencyShifter' | 'pitchShift' | 'stereoWidener'
	// — Dynamics —
	| 'limiter' | 'gate' | 'midSideCompressor' | 'multibandCompressor'
	// — Processing —
	| 'biquadFilter' | 'eq3' | 'channel' | 'panVol' | 'panner3d' | 'crossFade'
	| 'mono' | 'multibandSplit' | 'solo' | 'volume' | 'convolver'
	// — Analysis —
	| 'analyser' | 'fft' | 'meter' | 'dcMeter' | 'waveform' | 'follower' | 'recorder'
	| 'amplitudeEnvelope' | 'frequencyEnvelope'
	// — Signal —
	| 'signal' | 'waveShaper' | 'scale' | 'scaleExp' | 'abs' | 'add' | 'multiply'
	| 'negate' | 'greaterThan' | 'audioToGain' | 'gainToAudio'
	// — Event —
	| 'loop' | 'sequence' | 'pattern' | 'part' | 'toneEvent';

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

export type LFONodeData = {
	label:     string;
	frequency: number;   // 0.1–20 Hz, default 1
	type:      OscType;
	min:       number;   // default -1
	max:       number;   // default 1
	phase:     number;   // degrees, 0–360, default 0
};
export type LFOFlowNode = Node<LFONodeData, 'lfo'>;

export type FMOscillatorNodeData = {
	label:           string;
	frequency:       number;   // 20–4000 Hz, default 440
	type:            OscType;
	modulationType:  OscType;
	modulationIndex: number;   // 0–50, default 10
	harmonicity:     number;   // 0–20, default 3
	detune:          number;   // cents, default 0
	phase:           number;   // degrees, default 0
};
export type FMOscillatorFlowNode = Node<FMOscillatorNodeData, 'fmOscillator'>;

export type AMOscillatorNodeData = {
	label:          string;
	frequency:      number;   // 20–4000 Hz, default 440
	type:           OscType;
	modulationType: OscType;
	harmonicity:    number;   // 0–20, default 3
	detune:         number;   // cents, default 0
	phase:          number;   // degrees, default 0
};
export type AMOscillatorFlowNode = Node<AMOscillatorNodeData, 'amOscillator'>;

export type FatOscillatorNodeData = {
	label:     string;
	frequency: number;   // 20–4000 Hz, default 440
	type:      OscType;
	count:     number;   // 1–5 unison voices, default 3
	spread:    number;   // 0–100 cents per-voice detuning, default 20
	detune:    number;   // master detune cents, default 0
	phase:     number;   // degrees, default 0
};
export type FatOscillatorFlowNode = Node<FatOscillatorNodeData, 'fatOscillator'>;

export type PulseOscillatorNodeData = {
	label:     string;
	frequency: number;   // 20–4000 Hz, default 440
	width:     number;   // 0–1 duty cycle, default 0.5
	detune:    number;   // cents, default 0
	phase:     number;   // degrees, default 0
};
export type PulseOscillatorFlowNode = Node<PulseOscillatorNodeData, 'pulseOscillator'>;

export type PWMOscillatorNodeData = {
	label:               string;
	frequency:           number;   // 20–4000 Hz, default 440
	modulationFrequency: number;   // 0.1–20 Hz, default 0.4
	detune:              number;   // cents, default 0
	phase:               number;   // degrees, default 0
};
export type PWMOscillatorFlowNode = Node<PWMOscillatorNodeData, 'pwmOscillator'>;

export type GrainPlayerNodeData = {
	label:        string;
	trackUrl:     string;
	grainSize:    number;   // seconds, 0.01–2, default 0.2
	overlap:      number;   // 0–1, default 0.1
	playbackRate: number;   // 0.1–4, default 1
	detune:       number;   // cents, default 0
	loop:         boolean;  // default true
	loopStart:    number;   // seconds into buffer, default 0
	loopEnd:      number;   // seconds into buffer, 0 = buffer end, default 0
	reverse:      boolean;  // play grains reversed, default false
};
export type GrainPlayerFlowNode = Node<GrainPlayerNodeData, 'grainPlayer'>;

export type MicInputNodeData = {
	label: string;
};
export type MicInputFlowNode = Node<MicInputNodeData, 'micInput'>;

export type SceneInputNodeData = {
	label:        string;
	scanFrequency: number;  // Hz — how many full traces per second (default 50)
};

export type SceneInputFlowNode = Node<SceneInputNodeData, 'sceneInput'>;

export type IldaFrameNodeData = {
	label:     string;
	/** Blob URL or remote URL pointing at the loaded .ild file. Session-only when blob. */
	ildUrl:    string;
	/** Original filename for display after blob URL expires on reload. */
	filename:  string;
	/** Static = freeze on frame 0; animated = cycle frames at `fps`. */
	mode:      'static' | 'animated';
	/** Cycle rate when mode = 'animated'. */
	fps:       number;
	isPlaying: boolean;
};

export type IldaFrameFlowNode = Node<IldaFrameNodeData, 'ildaFrame'>;

export type DebugNodeData = { label: string };
export type DebugFlowNode = Node<DebugNodeData, 'debug'>;

export type AppNode =
	| BuiltInNode
	| PlayerFlowNode
	| MasterOutputFlowNode
	| OscillatorFlowNode
	| GainFlowNode
	| StubFlowNode
	| NoiseFlowNode
	| DCSignalFlowNode
	| SceneInputFlowNode
	| DebugFlowNode
	| LFOFlowNode
	| FMOscillatorFlowNode
	| AMOscillatorFlowNode
	| FatOscillatorFlowNode
	| PulseOscillatorFlowNode
	| PWMOscillatorFlowNode
	| GrainPlayerFlowNode
	| MicInputFlowNode
	| IldaFrameFlowNode;

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
	merge:       Merge;    // 6-channel merge → speakerGain
	speakerGain: Gain;    // gates audio to destination; gain=0 when muted
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

export type LFOAudioEntry = {
	kind:     'lfo';
	toneNode: LFO;
};

export type FMOscillatorAudioEntry = {
	kind:     'fmOscillator';
	toneNode: FMOscillator;
};

export type AMOscillatorAudioEntry = {
	kind:     'amOscillator';
	toneNode: AMOscillator;
};

export type FatOscillatorAudioEntry = {
	kind:     'fatOscillator';
	toneNode: FatOscillator;
};

export type PulseOscillatorAudioEntry = {
	kind:     'pulseOscillator';
	toneNode: PulseOscillator;
};

export type PWMOscillatorAudioEntry = {
	kind:     'pwmOscillator';
	toneNode: PWMOscillator;
};

export type GrainPlayerAudioEntry = {
	kind:     'grainPlayer';
	toneNode: GrainPlayer;
	split:    Split;
};

export type MicInputAudioEntry = {
	kind:     'micInput';
	toneNode: UserMedia;
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

export type IldaFrameAudioEntry = {
	kind:        'ildaFrame';
	/** Per-instance scene-input-processor worklet — same worklet class, fresh instance. */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	workletNode: any;
	split:       Split;   // Tone.Split(6) — six handle outputs
	/** Pre-encoded coord buffers (one per ILDA frame), ready to post to the worklet. */
	coordBufs:   { data: Float32Array; nPoints: number }[];
	/** setInterval handle for animated playback; null when static or stopped. */
	frameTimer:  ReturnType<typeof setInterval> | null;
	/** Current animated-mode cursor into coordBufs. */
	frameIdx:    number;
};

// Stubs are NOT in the audio registry — they have no Tone.js instances yet.

export type AudioNodeEntry =
	| PlayerAudioEntry
	| MasterOutputAudioEntry
	| OscillatorAudioEntry
	| GainAudioEntry
	| NoiseAudioEntry
	| DCSignalAudioEntry
	| LFOAudioEntry
	| FMOscillatorAudioEntry
	| AMOscillatorAudioEntry
	| FatOscillatorAudioEntry
	| PulseOscillatorAudioEntry
	| PWMOscillatorAudioEntry
	| GrainPlayerAudioEntry
	| MicInputAudioEntry
	| SceneInputAudioEntry
	| IldaFrameAudioEntry;

export type AudioNodeMap = Map<string, AudioNodeEntry>;

// ─── Patch file (serialised DAW session) ──────────────────────────────────────

export type PatchFile = {
	version:      1;
	savedAt:      string;  // ISO 8601
	name:         string;
	nodes:        AppNode[];
	edges:        AppEdge[];
	edgePathType: 'bezier' | 'straight' | 'step' | 'smoothstep';
};
