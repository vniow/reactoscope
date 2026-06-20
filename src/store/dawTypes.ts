import type { Node, Edge, BuiltInNode } from '@xyflow/react';
import type { Player, Gain, Analyser, Oscillator, Merge, Split, Noise, Signal, LFO, FMOscillator, AMOscillator, FatOscillator, PulseOscillator, PWMOscillator, GrainPlayer, UserMedia, Reverb, JCReverb, Freeverb, Delay, FeedbackDelay, PingPongDelay, Distortion, Chebyshev, BitCrusher, FrequencyShifter, PitchShift, StereoWidener, Chorus, Phaser, Tremolo, Vibrato, AutoFilter, AutoPanner, AutoWah } from 'tone';

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
	// — existing processing stubs (not yet implemented) —
	| 'filter' | 'compressor' | 'noiseGenerator' | 'panner' | 'split' | 'merge'
	// — Source / Instrument —
	| 'omniOscillator'
	| 'players' | 'userMedia'
	| 'synth' | 'monoSynth' | 'polySynth' | 'fmSynth' | 'amSynth' | 'duoSynth'
	| 'membraneSynth' | 'metalSynth' | 'noiseSynth' | 'pluckSynth' | 'sampler'
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

// ─── Effect node data types ───────────────────────────────────────────────────

export type ReverbNodeData = {
	label:    string;
	decay:    number;   // seconds, 0.1–10, default 1.5
	preDelay: number;   // seconds, 0–0.5, default 0.01
	wet:      number;   // 0–1, default 0.5
};
export type ReverbFlowNode = Node<ReverbNodeData, 'reverb'>;

export type JCReverbNodeData = {
	label:    string;
	roomSize: number;   // 0–1, default 0.5
	wet:      number;   // 0–1, default 0.5
};
export type JCReverbFlowNode = Node<JCReverbNodeData, 'jcReverb'>;

export type FreeverbNodeData = {
	label:      string;
	roomSize:   number;   // 0–1, default 0.7
	dampening:  number;   // Hz, 100–8000, default 3000
	wet:        number;   // 0–1, default 0.5
};
export type FreeverbFlowNode = Node<FreeverbNodeData, 'freeverb'>;

export type DelayNodeData = {
	label:     string;
	delayTime: number;   // seconds, 0–1, default 0.25
	wet:       number;   // 0–1, default 1
};
export type DelayFlowNode = Node<DelayNodeData, 'delay'>;

export type FeedbackDelayNodeData = {
	label:     string;
	delayTime: number;   // seconds, 0–1, default 0.25
	feedback:  number;   // 0–1, default 0.5
	wet:       number;   // 0–1, default 0.5
};
export type FeedbackDelayFlowNode = Node<FeedbackDelayNodeData, 'feedbackDelay'>;

export type PingPongDelayNodeData = {
	label:     string;
	delayTime: number;   // seconds, 0–1, default 0.25
	feedback:  number;   // 0–1, default 0.5
	wet:       number;   // 0–1, default 0.5
};
export type PingPongDelayFlowNode = Node<PingPongDelayNodeData, 'pingPongDelay'>;

export type DistortionNodeData = {
	label:      string;
	distortion: number;                   // 0–1, default 0.4
	oversample: 'none' | '2x' | '4x';    // default 'none'
	wet:        number;                   // 0–1, default 1
};
export type DistortionFlowNode = Node<DistortionNodeData, 'distortion'>;

export type ChebyshevNodeData = {
	label: string;
	order: number;   // 1–100, default 50
	wet:   number;   // 0–1, default 1
};
export type ChebyshevFlowNode = Node<ChebyshevNodeData, 'chebyshev'>;

export type BitCrusherNodeData = {
	label: string;
	bits:  number;   // 1–16 int, default 4
	wet:   number;   // 0–1, default 1
};
export type BitCrusherFlowNode = Node<BitCrusherNodeData, 'bitCrusher'>;

export type FrequencyShifterNodeData = {
	label:     string;
	frequency: number;   // Hz, −1000–1000, default 0
	wet:       number;   // 0–1, default 1
};
export type FrequencyShifterFlowNode = Node<FrequencyShifterNodeData, 'frequencyShifter'>;

export type PitchShiftNodeData = {
	label:      string;
	pitch:      number;   // semitones, −12–12, default 0
	windowSize: number;   // seconds, 0.03–0.1, default 0.1
	feedback:   number;   // 0–1, default 0
	wet:        number;   // 0–1, default 1
};
export type PitchShiftFlowNode = Node<PitchShiftNodeData, 'pitchShift'>;

export type StereoWidenerNodeData = {
	label: string;
	width: number;   // 0–1, default 0.5
	wet:   number;   // 0–1, default 1
};
export type StereoWidenerFlowNode = Node<StereoWidenerNodeData, 'stereoWidener'>;

export type ChorusNodeData = {
	label:     string;
	frequency: number;   // Hz, 0.1–10, default 1.5
	delayTime: number;   // ms, 0–20, default 3.5
	depth:     number;   // 0–1, default 0.7
	wet:       number;   // 0–1, default 0.5
};
export type ChorusFlowNode = Node<ChorusNodeData, 'chorus'>;

export type PhaserNodeData = {
	label:         string;
	frequency:     number;   // Hz, 0.1–10, default 0.5
	octaves:       number;   // 1–8, default 3
	baseFrequency: number;   // Hz, 200–1000, default 350
	wet:           number;   // 0–1, default 0.5
};
export type PhaserFlowNode = Node<PhaserNodeData, 'phaser'>;

export type TremoloNodeData = {
	label:     string;
	frequency: number;   // Hz, 0.1–20, default 10
	depth:     number;   // 0–1, default 0.5
	wet:       number;   // 0–1, default 0.5
};
export type TremoloFlowNode = Node<TremoloNodeData, 'tremolo'>;

export type VibratoNodeData = {
	label:     string;
	frequency: number;   // Hz, 0.1–20, default 5
	depth:     number;   // 0–1, default 0.1
	wet:       number;   // 0–1, default 0.5
};
export type VibratoFlowNode = Node<VibratoNodeData, 'vibrato'>;

export type AutoFilterNodeData = {
	label:         string;
	frequency:     number;   // Hz, 0.1–10, default 1
	baseFrequency: number;   // Hz, 20–2000, default 200
	octaves:       number;   // 1–8, default 2.6
	wet:           number;   // 0–1, default 1
};
export type AutoFilterFlowNode = Node<AutoFilterNodeData, 'autoFilter'>;

export type AutoPannerNodeData = {
	label:     string;
	frequency: number;   // Hz, 0.1–10, default 1
	wet:       number;   // 0–1, default 1
};
export type AutoPannerFlowNode = Node<AutoPannerNodeData, 'autoPanner'>;

export type AutoWahNodeData = {
	label:         string;
	baseFrequency: number;   // Hz, 50–500, default 100
	octaves:       number;   // 1–8, default 6
	sensitivity:   number;   // dB, −40–0, default 0
	wet:           number;   // 0–1, default 1
};
export type AutoWahFlowNode = Node<AutoWahNodeData, 'autoWah'>;

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
	| IldaFrameFlowNode
	| ReverbFlowNode
	| JCReverbFlowNode
	| FreeverbFlowNode
	| DelayFlowNode
	| FeedbackDelayFlowNode
	| PingPongDelayFlowNode
	| DistortionFlowNode
	| ChebyshevFlowNode
	| BitCrusherFlowNode
	| FrequencyShifterFlowNode
	| PitchShiftFlowNode
	| StereoWidenerFlowNode
	| ChorusFlowNode
	| PhaserFlowNode
	| TremoloFlowNode
	| VibratoFlowNode
	| AutoFilterFlowNode
	| AutoPannerFlowNode
	| AutoWahFlowNode;

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

export type IldaFrameAudioEntry = {
	kind:        'ildaFrame';
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	workletNode: any;
	coordBufs:   { data: Float32Array; nPoints: number }[];
	frameIdx:    number;
	frameTimer:  ReturnType<typeof setInterval> | null;
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

// ─── Effect audio entry types ─────────────────────────────────────────────────

export type ReverbAudioEntry          = { kind: 'reverb';           toneNode: Reverb };
export type JCReverbAudioEntry        = { kind: 'jcReverb';         toneNode: JCReverb };
export type FreeverbAudioEntry        = { kind: 'freeverb';         toneNode: Freeverb };
export type DelayAudioEntry           = { kind: 'delay'; toneNode: { input: Gain; output: Gain }; _delay: Delay; _dryGain: Gain; _wetGain: Gain };
export type FeedbackDelayAudioEntry   = { kind: 'feedbackDelay';    toneNode: FeedbackDelay };
export type PingPongDelayAudioEntry   = { kind: 'pingPongDelay';    toneNode: PingPongDelay };
export type DistortionAudioEntry      = { kind: 'distortion';       toneNode: Distortion };
export type ChebyshevAudioEntry       = { kind: 'chebyshev';        toneNode: Chebyshev };
export type BitCrusherAudioEntry      = { kind: 'bitCrusher';       toneNode: BitCrusher };
export type FrequencyShifterAudioEntry = { kind: 'frequencyShifter'; toneNode: FrequencyShifter };
export type PitchShiftAudioEntry      = { kind: 'pitchShift';       toneNode: PitchShift };
export type StereoWidenerAudioEntry   = { kind: 'stereoWidener';    toneNode: StereoWidener };
export type ChorusAudioEntry          = { kind: 'chorus';           toneNode: Chorus };
export type PhaserAudioEntry          = { kind: 'phaser';           toneNode: Phaser };
export type TremoloAudioEntry         = { kind: 'tremolo';          toneNode: Tremolo };
export type VibratoAudioEntry         = { kind: 'vibrato';          toneNode: Vibrato };
export type AutoFilterAudioEntry      = { kind: 'autoFilter';       toneNode: AutoFilter };
export type AutoPannerAudioEntry      = { kind: 'autoPanner';       toneNode: AutoPanner };
export type AutoWahAudioEntry         = { kind: 'autoWah';          toneNode: AutoWah };

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
	| IldaFrameAudioEntry
	| SceneInputAudioEntry
	| ReverbAudioEntry
	| JCReverbAudioEntry
	| FreeverbAudioEntry
	| DelayAudioEntry
	| FeedbackDelayAudioEntry
	| PingPongDelayAudioEntry
	| DistortionAudioEntry
	| ChebyshevAudioEntry
	| BitCrusherAudioEntry
	| FrequencyShifterAudioEntry
	| PitchShiftAudioEntry
	| StereoWidenerAudioEntry
	| ChorusAudioEntry
	| PhaserAudioEntry
	| TremoloAudioEntry
	| VibratoAudioEntry
	| AutoFilterAudioEntry
	| AutoPannerAudioEntry
	| AutoWahAudioEntry;

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
