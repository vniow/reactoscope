import type { Node, Edge, BuiltInNode } from '@xyflow/react';
import type { Player, Gain, Analyser, Oscillator, Merge, Split, Noise, Signal, LFO, FMOscillator, AMOscillator, FatOscillator, PulseOscillator, PWMOscillator, GrainPlayer, UserMedia, Reverb, JCReverb, Freeverb, FeedbackDelay, PingPongDelay, Distortion, Chebyshev, BitCrusher, FrequencyShifter, PitchShift, StereoWidener, Chorus, Phaser, Tremolo, Vibrato, AutoFilter, AutoPanner, AutoWah, Limiter, Gate, BiquadFilter, PanVol, Mono, Volume, FFT, Meter, DCMeter, Waveform, Scale, ScaleExp, Abs, Negate, AudioToGain, GainToAudio, Compressor, Filter, EQ3, MultibandSplit, Follower, Solo, CrossFade, Panner, MidSideCompressor, MultibandCompressor, Panner3D, WaveShaper, Recorder, Channel } from 'tone';

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
	| 'noiseGenerator'
	// — Source / Instrument —
	| 'omniOscillator'
	| 'players' | 'userMedia'
	| 'synth' | 'monoSynth' | 'polySynth' | 'fmSynth' | 'amSynth' | 'duoSynth'
	| 'membraneSynth' | 'metalSynth' | 'noiseSynth' | 'pluckSynth' | 'sampler'
	// — Processing —
	| 'convolver'
	// — Analysis —
	| 'amplitudeEnvelope' | 'frequencyEnvelope'
	// — Signal —
	| 'add' | 'multiply' | 'greaterThan'
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

// ─── Dynamics node data types ─────────────────────────────────────────────────

export type LimiterNodeData = {
	label:     string;
	threshold: number;   // dB, -60–0, default -12
};
export type LimiterFlowNode = Node<LimiterNodeData, 'limiter'>;

export type GateNodeData = {
	label:     string;
	threshold: number;   // dB, -100–0, default -40
	smoothing: number;   // seconds, 0–1, default 0.1
};
export type GateFlowNode = Node<GateNodeData, 'gate'>;

// Shared by every node with a real Compressor band — standalone Compressor,
// and MidSideCompressor's/MultibandCompressor's mid/side/low/high children
// (see CompressorControls, docs/adr/0004-nested-param-panel-layout.md).
export type CompressorBandData = {
	threshold: number;   // dB, -100–0, default -24
	ratio:     number;   // 1–20, default 12
	attack:    number;   // seconds, 0–1, default 0.003
	release:   number;   // seconds, 0–1, default 0.25
	knee:      number;   // dB, 0–40, default 30
};

export type CompressorNodeData = { label: string } & CompressorBandData;
export type CompressorFlowNode = Node<CompressorNodeData, 'compressor'>;

// Requires a genuinely stereo input — mid/side encoding is meaningless on
// mono, flagged in the node's UI (docs/node-roadmap.md).
export type MidSideCompressorNodeData = {
	label: string;
	mid:   CompressorBandData;
	side:  CompressorBandData;
};
export type MidSideCompressorFlowNode = Node<MidSideCompressorNodeData, 'midSideCompressor'>;

// v1 UI exposes only threshold+ratio per band via CompressorControls' `params`
// prop (docs/node-roadmap.md: 17 live controls is too heavy) — attack/release/
// knee still live on each band's data, just defaulted and not user-editable yet.
export type MultibandCompressorNodeData = {
	label:         string;
	lowFrequency:  number;   // Hz, 20–2000, default 250
	highFrequency: number;   // Hz, 200–20000, default 2000
	low:           CompressorBandData;
	mid:           CompressorBandData;
	high:          CompressorBandData;
};
export type MultibandCompressorFlowNode = Node<MultibandCompressorNodeData, 'multibandCompressor'>;

// ─── Processing node data types ───────────────────────────────────────────────

export type BiquadFilterType = 'lowpass' | 'highpass' | 'bandpass' | 'lowshelf' | 'highshelf' | 'notch' | 'allpass' | 'peaking';
export const FILTER_ROLLOFF_OPTIONS = [-12, -24, -48, -96] as const;
export type FilterRolloff = typeof FILTER_ROLLOFF_OPTIONS[number];

export type BiquadFilterNodeData = {
	label:     string;
	frequency: number;           // Hz, 20–20000, default 350
	type:      BiquadFilterType; // default 'lowpass'
	Q:         number;           // 0.001–100, default 1
	detune:    number;           // cents, -1200–1200, default 0
	gain:      number;           // dB, -40–40, default 0 (lowshelf/highshelf/peaking only)
};
export type BiquadFilterFlowNode = Node<BiquadFilterNodeData, 'biquadFilter'>;

export type FilterNodeData = {
	label:     string;
	frequency: number;           // Hz, 20–20000, default 350
	type:      BiquadFilterType; // default 'lowpass'
	rolloff:   FilterRolloff;    // default -12
	Q:         number;           // 0.001–100, default 1
	detune:    number;           // cents, -1200–1200, default 0
	gain:      number;           // dB, -40–40, default 0 (lowshelf/highshelf/peaking only)
};
export type FilterFlowNode = Node<FilterNodeData, 'filter'>;

export type EQ3NodeData = {
	label:         string;
	low:           number;   // dB, -40–40, default 0
	mid:           number;   // dB, -40–40, default 0
	high:          number;   // dB, -40–40, default 0
	lowFrequency:  number;   // Hz, 20–2000, default 400
	highFrequency: number;   // Hz, 200–20000, default 2500
};
export type EQ3FlowNode = Node<EQ3NodeData, 'eq3'>;

export type PanVolNodeData = {
	label:  string;
	pan:    number;    // -1–1, default 0
	volume: number;    // dB, -60–6, default 0
	mute:   boolean;   // default false
};
export type PanVolFlowNode = Node<PanVolNodeData, 'panVol'>;

// Channel is PanVol + Solo internally composed (docs/node-roadmap.md) — solo
// state is deliberately NOT a field here, same reasoning as SoloNodeData:
// it's store-driven (daw.ts's soloedNodeId, ADR-0003) since Channel and Solo
// share Tone's own static solo registry. send/receive bus routing is
// permanently out of scope (docs/adr/0007-channel-send-receive-out-of-scope.md).
export type ChannelNodeData = {
	label:  string;
	volume: number;    // dB, -60–6, default 0
	pan:    number;    // -1–1, default 0
	mute:   boolean;   // default false
};
export type ChannelFlowNode = Node<ChannelNodeData, 'channel'>;

export type SplitNodeData = { label: string };
export type SplitFlowNode = Node<SplitNodeData, 'split'>;

export type MergeNodeData = { label: string };
export type MergeFlowNode = Node<MergeNodeData, 'merge'>;

export type MonoNodeData = { label: string };
export type MonoFlowNode = Node<MonoNodeData, 'mono'>;

export type VolumeNodeData = {
	label:  string;
	volume: number;    // dB, -60–6, default 0
	mute:   boolean;   // default false
};
export type VolumeFlowNode = Node<VolumeNodeData, 'volume'>;

export type MultibandSplitNodeData = {
	label:         string;
	lowFrequency:  number;   // Hz, 20–2000, default 400
	highFrequency: number;   // Hz, 200–20000, default 2500
	Q:             number;   // 0.1–10, default 1
};
export type MultibandSplitFlowNode = Node<MultibandSplitNodeData, 'multibandSplit'>;

// Whether this instance is soloed is store-driven (daw.ts's soloedNodeId,
// ADR-0003), not a field here — only one instance can be soloed at a time,
// so a per-node boolean would just duplicate the store's own truth.
export type SoloNodeData = { label: string };
export type SoloFlowNode = Node<SoloNodeData, 'solo'>;

// Panner wraps a single stereo StereoPannerNode — it has no native separate
// L/R outputs. out-0/out-1 are a reactoscope design choice, satisfied by an
// internal Split(2) the handler wires the panner's output into.
export type PannerNodeData = {
	label: string;
	pan:   number;   // -1–1, default 0
};
export type PannerFlowNode = Node<PannerNodeData, 'panner'>;

// CrossFade has no single `.input` — in-0/in-1 wire directly to toneNode.a/.b.
export type CrossFadeNodeData = {
	label: string;
	fade:  number;   // 0–1, default 0.5
};
export type CrossFadeFlowNode = Node<CrossFadeNodeData, 'crossFade'>;

// v1 UI exposes only position + panningModel (docs/node-roadmap.md) — the
// listener-cone/distance-falloff params (orientationX/Y/Z, distanceModel,
// refDistance, maxDistance, rolloffFactor, coneInnerAngle/OuterAngle/
// OuterGain) stay at their Tone.js defaults, ~14 controls is too heavy for v1.
export type Panner3DPanningModel = 'equalpower' | 'HRTF';
export type Panner3DNodeData = {
	label:        string;
	positionX:    number;   // default 0
	positionY:    number;   // default 0
	positionZ:    number;   // default 0
	panningModel: Panner3DPanningModel; // default 'equalpower'
};
export type Panner3DFlowNode = Node<Panner3DNodeData, 'panner3d'>;

// ─── Analysis node data types ─────────────────────────────────────────────────
// Analyser-family "tap" nodes: pass audio through unchanged (in-0 → out-0) and
// separately expose a live-polled readout via engine.ts getters — see
// getFFTValue/getMeterValue/getDCMeterValue/getWaveformValue/getAnalyserValue.

export const ANALYSIS_SIZE_OPTIONS = [16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384] as const;
export type AnalysisSize = typeof ANALYSIS_SIZE_OPTIONS[number];

export type FFTNodeData = {
	label:       string;
	size:        AnalysisSize; // power of two, default 1024
	smoothing:   number;       // 0–1, default 0.8
	normalRange: boolean;      // default false (dB output when false)
};
export type FFTFlowNode = Node<FFTNodeData, 'fft'>;

export type MeterNodeData = {
	label:       string;
	smoothing:   number;    // 0–1, default 0.8
	normalRange: boolean;   // default false (dB output when false)
};
export type MeterFlowNode = Node<MeterNodeData, 'meter'>;

export type DCMeterNodeData = { label: string };
export type DCMeterFlowNode = Node<DCMeterNodeData, 'dcMeter'>;

export type WaveformNodeData = {
	label: string;
	size:  AnalysisSize;   // power of two, default 1024
};
export type WaveformFlowNode = Node<WaveformNodeData, 'waveform'>;

export type AnalyserType = 'fft' | 'waveform';

export type AnalyserNodeData = {
	label:     string;
	size:      AnalysisSize;   // power of two, default 1024
	type:      AnalyserType;   // default 'fft'
	smoothing: number;         // 0–1, default 0.8
};
export type AnalyserFlowNode = Node<AnalyserNodeData, 'analyser'>;

// Follower is not a tap despite living in the Analysis catalogue bucket — it's
// a real processor (in-0 → out-0, no readout): see docs/node-roadmap.md.
export type FollowerNodeData = {
	label:     string;
	smoothing: number;   // seconds, 0.001–1, default 0.05
};
export type FollowerFlowNode = Node<FollowerNodeData, 'follower'>;

// Sink — in-0 only, no output, cannot chain further downstream. No live params
// (mimeType is constructor-only on Tone's Recorder — see ADR-0006); recording
// state/blob live in the audio entry and component-local UI state, driven by
// recorder.ts's own start/pause/stop functions, not setAudioParam.
export type RecorderNodeData = { label: string };
export type RecorderFlowNode = Node<RecorderNodeData, 'recorder'>;

// ─── Signal node data types ────────────────────────────────────────────────────

export type SignalNodeData = {
	label: string;
	value: number;   // default 0, range -1000–1000
};
export type SignalFlowNode = Node<SignalNodeData, 'signal'>;

export type ScaleNodeData = {
	label: string;
	min:   number;   // default 0, range -100–100
	max:   number;   // default 1, range -100–100
};
export type ScaleFlowNode = Node<ScaleNodeData, 'scale'>;

export type ScaleExpNodeData = {
	label:    string;
	min:      number;   // default 0, range -100–100
	max:      number;   // default 1, range -100–100
	exponent: number;   // default 1, range 0.1–8
};
export type ScaleExpFlowNode = Node<ScaleExpNodeData, 'scaleExp'>;

export type AbsNodeData = { label: string };
export type AbsFlowNode = Node<AbsNodeData, 'abs'>;

export type NegateNodeData = { label: string };
export type NegateFlowNode = Node<NegateNodeData, 'negate'>;

export type AudioToGainNodeData = { label: string };
export type AudioToGainFlowNode = Node<AudioToGainNodeData, 'audioToGain'>;

export type GainToAudioNodeData = { label: string };
export type GainToAudioFlowNode = Node<GainToAudioNodeData, 'gainToAudio'>;

// WaveShaper's mapping is a JS function/array, not a slider-able value — the
// dropdown's value is a preset *name* stored purely for serialization/redraw;
// selecting one triggers an imperative setMap() rather than a watched param
// (docs/adr/0005-waveshaper-preset-driven.md).
export type WaveShaperPreset = 'identity' | 'softClip' | 'hardClip';
export type WaveShaperNodeData = {
	label:      string;
	preset:     WaveShaperPreset;         // default 'identity'
	oversample: 'none' | '2x' | '4x';     // default 'none'
};
export type WaveShaperFlowNode = Node<WaveShaperNodeData, 'waveShaper'>;

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
	| AutoWahFlowNode
	| LimiterFlowNode
	| GateFlowNode
	| CompressorFlowNode
	| MidSideCompressorFlowNode
	| MultibandCompressorFlowNode
	| BiquadFilterFlowNode
	| FilterFlowNode
	| EQ3FlowNode
	| PanVolFlowNode
	| ChannelFlowNode
	| SplitFlowNode
	| MergeFlowNode
	| MonoFlowNode
	| VolumeFlowNode
	| MultibandSplitFlowNode
	| SoloFlowNode
	| PannerFlowNode
	| CrossFadeFlowNode
	| Panner3DFlowNode
	| FFTFlowNode
	| MeterFlowNode
	| DCMeterFlowNode
	| WaveformFlowNode
	| AnalyserFlowNode
	| FollowerFlowNode
	| RecorderFlowNode
	| SignalFlowNode
	| ScaleFlowNode
	| ScaleExpFlowNode
	| AbsFlowNode
	| NegateFlowNode
	| AudioToGainFlowNode
	| GainToAudioFlowNode
	| WaveShaperFlowNode;

export type AppEdge = Edge;

// ─── Scene geometry sources ────────────────────────────────────────────────────
// Scene-native (not graph nodes — Wayfinder map #39, issue #40): a `sources`
// list separate from the node graph, mirroring the audio-node store-entry /
// runtime-handler split (issue #42) but with a plain React component as the
// "handler" instead of an imperative create/dispose pair, since R3F's own
// mount/unmount already gives lifecycle management for free.

export type GeometrySourceType = 'cube' | 'circle' | 'plane' | 'sphere' | 'svgImport' | 'gltfImport';

export type GeometrySourceTransform = {
	position: [number, number, number];
	rotation: [number, number, number];
	scale:    [number, number, number];
};

export type GeometrySourceData = {
	transform:    GeometrySourceTransform;
	// svgImport / gltfImport only — the imported file's bytes as a self-describing
	// data URI (issue #44), e.g. 'data:model/gltf-binary;base64,...'.
	assetDataUri?: string;
	assetName?:    string; // display name, e.g. "satellite.glb"
};

export type GeometrySourceEntry = {
	id:   string;
	type: GeometrySourceType;
	data: GeometrySourceData;
};

// ─── Audio node registry entries ─────────────────────────────────────────────

export type PlayerAudioEntry = {
	kind:           'player';
	toneNode:       Player;
	split:          Split;    // splits stereo output into L (out-0) and R (out-1)
	startOffset:    number;   // track position (s) as of startedAt
	startedAt:      number;   // AudioContext time (s) playback most recently began; only valid while isPlaying
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
	inputGainZ: Gain;     // in-5 = Z (analog intensity/blanking)
	merge:       Merge;    // 6-channel merge → speakerGain
	speakerGain: Gain;    // gates audio to destination; gain=0 when muted
	xAnalyser:  Analyser; // X axis of oscilloscope (stereo L)
	yAnalyser:  Analyser; // Y axis of oscilloscope (stereo R)
	rAnalyser:  Analyser; // Red colour channel
	gAnalyser:  Analyser; // Green colour channel
	bAnalyser:  Analyser; // Blue colour channel
	zAnalyser:  Analyser; // Z (intensity/blanking) channel
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

// ─── Effect audio entry types ─────────────────────────────────────────────────

export type ReverbAudioEntry          = { kind: 'reverb';           toneNode: Reverb };
export type JCReverbAudioEntry        = { kind: 'jcReverb';         toneNode: JCReverb };
export type FreeverbAudioEntry        = { kind: 'freeverb';         toneNode: Freeverb };
export type DelayAudioEntry           = { kind: 'delay';             toneNode: FeedbackDelay };
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

export type LimiterAudioEntry     = { kind: 'limiter';     toneNode: Limiter };
export type GateAudioEntry        = { kind: 'gate';        toneNode: Gate };
export type CompressorAudioEntry  = { kind: 'compressor';  toneNode: Compressor };
export type MidSideCompressorAudioEntry = { kind: 'midSideCompressor'; toneNode: MidSideCompressor };
export type MultibandCompressorAudioEntry = { kind: 'multibandCompressor'; toneNode: MultibandCompressor };
export type BiquadFilterAudioEntry = { kind: 'biquadFilter'; toneNode: BiquadFilter };
export type FilterAudioEntry      = { kind: 'filter';      toneNode: Filter };
export type EQ3AudioEntry         = { kind: 'eq3';         toneNode: EQ3 };
export type PanVolAudioEntry      = { kind: 'panVol';      toneNode: PanVol };
export type ChannelAudioEntry     = { kind: 'channel';     toneNode: Channel };
export type SplitNodeAudioEntry   = { kind: 'split';       toneNode: Split };
export type MergeNodeAudioEntry   = { kind: 'merge';       toneNode: Merge };
export type MonoAudioEntry        = { kind: 'mono';        toneNode: Mono };
export type VolumeAudioEntry      = { kind: 'volume';      toneNode: Volume };
export type MultibandSplitAudioEntry = { kind: 'multibandSplit'; toneNode: MultibandSplit };
export type SoloAudioEntry        = { kind: 'solo';        toneNode: Solo };
export type PannerAudioEntry      = { kind: 'panner';      toneNode: Panner; split: Split };
export type CrossFadeAudioEntry   = { kind: 'crossFade';   toneNode: CrossFade };
export type Panner3DAudioEntry    = { kind: 'panner3d';    toneNode: Panner3D };
export type FFTAudioEntry         = { kind: 'fft';         toneNode: FFT };
export type MeterAudioEntry       = { kind: 'meter';       toneNode: Meter };
export type DCMeterAudioEntry     = { kind: 'dcMeter';     toneNode: DCMeter };
export type WaveformAudioEntry    = { kind: 'waveform';    toneNode: Waveform };
export type AnalyserAudioEntry    = { kind: 'analyser';    toneNode: Analyser };
export type FollowerAudioEntry    = { kind: 'follower';    toneNode: Follower };
export type RecorderAudioEntry    = { kind: 'recorder';    toneNode: Recorder };
export type SignalNodeAudioEntry  = { kind: 'signal';      toneNode: Signal<'number'> };
export type ScaleAudioEntry       = { kind: 'scale';       toneNode: Scale };
export type ScaleExpAudioEntry    = { kind: 'scaleExp';    toneNode: ScaleExp };
export type AbsAudioEntry         = { kind: 'abs';         toneNode: Abs };
export type NegateAudioEntry      = { kind: 'negate';      toneNode: Negate };
export type AudioToGainAudioEntry = { kind: 'audioToGain'; toneNode: AudioToGain };
export type GainToAudioAudioEntry = { kind: 'gainToAudio'; toneNode: GainToAudio };
export type WaveShaperAudioEntry  = { kind: 'waveShaper';  toneNode: WaveShaper };

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
	| AutoWahAudioEntry
	| LimiterAudioEntry
	| GateAudioEntry
	| CompressorAudioEntry
	| MidSideCompressorAudioEntry
	| MultibandCompressorAudioEntry
	| BiquadFilterAudioEntry
	| FilterAudioEntry
	| EQ3AudioEntry
	| PanVolAudioEntry
	| ChannelAudioEntry
	| SplitNodeAudioEntry
	| MergeNodeAudioEntry
	| MonoAudioEntry
	| VolumeAudioEntry
	| MultibandSplitAudioEntry
	| SoloAudioEntry
	| PannerAudioEntry
	| CrossFadeAudioEntry
	| Panner3DAudioEntry
	| FFTAudioEntry
	| MeterAudioEntry
	| DCMeterAudioEntry
	| WaveformAudioEntry
	| AnalyserAudioEntry
	| FollowerAudioEntry
	| RecorderAudioEntry
	| SignalNodeAudioEntry
	| ScaleAudioEntry
	| ScaleExpAudioEntry
	| AbsAudioEntry
	| NegateAudioEntry
	| AudioToGainAudioEntry
	| GainToAudioAudioEntry
	| WaveShaperAudioEntry;

export type AudioNodeMap = Map<string, AudioNodeEntry>;

// ─── Patch file (serialised DAW session) ──────────────────────────────────────

export type PatchFile = {
	version:      1;
	savedAt:      string;  // ISO 8601
	name:         string;
	nodes:        AppNode[];
	edges:        AppEdge[];
	edgePathType: 'bezier' | 'straight' | 'step' | 'smoothstep';
	sources:      GeometrySourceEntry[];
};
