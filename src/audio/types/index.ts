/**
 * Audio Node Types and Parameter Definitions
 *
 * This module defines all audio node types, their parameters, and mappings
 * between React Flow nodes and Tone.js audio nodes.
 */

import * as Tone from 'tone';

// Define all possible audio node types
export type AudioNodeType =
	| 'oscillator'
	| 'player'
	| 'noise'
	| 'microphone'
	| 'filter'
	| 'delay'
	| 'reverb'
	| 'gain'
	| 'dualGain'
	| 'panner'
	| 'compressor'
	| 'distortion'
	| 'analyzer'
	| 'oscilloscope'
	| 'masterOutput'
	| 'destination'
	| 'meter'
	| 'envelope'
	| 'lfo'
	// Worklet-based node types
	| 'bitcrusher'
	| 'spectralfilter'
	| 'granulardelay'
	| 'advancedoscillator'
	| 'noisegenerator'
	| 'vocoder'
	| 'pitchshifter'
	| 'granularsynthesis'
	| 'custom-noise'
	| 'custom-xyrgb';

// Mapping between React Flow node types and Tone.js node types
export const NODE_TYPE_MAPPING: Record<string, AudioNodeType> = {
	// Source nodes
	'source.source': 'oscillator', // Main oscillator source node
	'source.source-player': 'player',
	'source.source-microphone': 'microphone',
	'source.XYRGBGeneratorNode': 'custom-xyrgb',

	// Effect nodes
	'effect.filter': 'filter',
	'effect.delay': 'delay',
	'effect.reverb': 'reverb',
	'effect.compressor': 'compressor',
	'effect.distortion': 'distortion',

	// Component nodes
	'component.gain': 'gain',
	'component.dualGain': 'dualGain',
	'component.panner': 'panner',
	'component.envelope': 'envelope',
	'component.lfo': 'lfo',

	// Signal nodes
	'signal.analyzer': 'analyzer',
	'signal.oscilloscope': 'oscilloscope',
	'signal-3d.oscilloscope': 'oscilloscope', // 3D version uses same audio logic
	'signal.meter': 'meter',
	'signal.XYRGBVisualizerNode': 'analyzer', // XYRGB visualizer uses analyzers

	// Core nodes
	'core.output': 'masterOutput',
};

// Parameter interfaces for each node type
export interface OscillatorParams {
	frequency?: number;
	type?: OscillatorType;
	detune?: number;
	volume?: number;
}

export interface PlayerParams {
	url?: string;
	loop?: boolean;
	volume?: number;
	playbackRate?: number;
}

export interface NoiseParams {
	type?: 'white' | 'brown' | 'pink';
	amplitude?: number;
	volume?: number;
}

export interface FilterParams {
	frequency?: number;
	type?: BiquadFilterType;
	Q?: number;
	gain?: number;
}

export interface DelayParams {
	delayTime?: number;
	feedback?: number;
	wet?: number;
}

export interface ReverbParams {
	decay?: number;
	preDelay?: number;
	wet?: number;
}

export interface GainParams {
	gain?: number;
}

export interface DualGainParams {
	gain1?: number;
	gain2?: number;
}

export interface PannerParams {
	pan?: number;
}

export interface CompressorParams {
	threshold?: number;
	ratio?: number;
	attack?: number;
	release?: number;
	knee?: number;
}

export interface DistortionParams {
	distortion?: number;
	oversample?: OverSampleType;
}

export interface AnalyzerParams {
	type?: 'fft' | 'waveform';
	size?: number;
}

export interface OscilloscopeParams {
	timeWindow?: number; // Time window in seconds
	triggerLevel?: number; // Trigger level for stable display
	resolution?: number; // Number of sample points
}

export interface MeterParams {
	smoothing?: number;
}

export interface EnvelopeParams {
	attack?: number;
	decay?: number;
	sustain?: number;
	release?: number;
}

export interface LFOParams {
	frequency?: number;
	type?: OscillatorType;
	min?: number;
	max?: number;
}

export interface DestinationParams {
	volume?: number;
	mute?: boolean;
}

// Worklet-based node parameter interfaces
export interface BitCrusherParams {
	bits: number;
	sampleRate: number;
	wet: number;
}

export interface SpectralFilterParams {
	cutoff: number;
	resonance: number;
	filterType: 'lowpass' | 'highpass' | 'bandpass' | 'notch';
	fftSize: number;
	wet: number;
}

export interface GranularDelayParams {
	delayTime: number;
	feedback: number;
	grainSize: number;
	grainDensity: number;
	pitch: number;
	wet: number;
}

export interface AdvancedOscillatorParams {
	frequency: number;
	type: 'wavetable' | 'fm' | 'additive' | 'granular';
	harmonics: number;
	modulation: number;
	detune: number;
	volume: number;
}

export interface NoiseGeneratorParams {
	type: 'white' | 'pink' | 'brown' | 'blue' | 'violet';
	filtering: boolean;
	cutoff?: number;
	resonance?: number;
	volume: number;
}

export interface VocoderParams {
	bands: number;
	attack: number;
	release: number;
	carrierGain: number;
	modulatorGain: number;
	wet: number;
}

export interface PitchShifterParams {
	pitch: number;
	windowSize: number;
	overlap: number;
	wet: number;
}

export interface GranularSynthesisParams {
	grainSize: number;
	grainDensity: number;
	position: number;
	randomness: number;
	pitch: number;
	volume: number;
}

// Union type for all possible parameters
export type AudioNodeParams =
	| OscillatorParams
	| PlayerParams
	| NoiseParams
	| FilterParams
	| DelayParams
	| ReverbParams
	| GainParams
	| DualGainParams
	| PannerParams
	| CompressorParams
	| DistortionParams
	| AnalyzerParams
	| OscilloscopeParams
	| MeterParams
	| EnvelopeParams
	| LFOParams
	| DestinationParams
	// Worklet parameter types
	| BitCrusherParams
	| SpectralFilterParams
	| GranularDelayParams
	| AdvancedOscillatorParams
	| NoiseGeneratorParams
	| VocoderParams
	| PitchShifterParams
	| GranularSynthesisParams
	| Record<string, unknown>;

// Audio connection information
export interface AudioConnection {
	sourceId: string;
	targetId: string;
	sourceHandleId?: string;
	targetHandleId?: string;
	sourceOutputIndex?: number;
	targetInputIndex?: number;
}

// Registry entry for an audio node
export interface AudioNodeRegistryEntry {
	id: string;
	type: AudioNodeType;
	audioNode:
		| Tone.ToneAudioNode
		| Tone.ToneAudioNode[]
		| { outputs: Record<string, Tone.ToneAudioNode> };
	parameters: AudioNodeParams;
	connections: {
		inputs: AudioConnection[];
		outputs: AudioConnection[];
	};
	isActive: boolean;
	createdAt: number;
	// Optional: for custom nodes, store the full instance
	customNodeInstance?: unknown;
}
