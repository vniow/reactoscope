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
	| 'masterOutput'
	| 'destination'
	| 'meter'
	| 'envelope'
	| 'lfo';

// Mapping between React Flow node types and Tone.js node types
export const NODE_TYPE_MAPPING: Record<string, AudioNodeType> = {
	// Source nodes
	'source.oscillator': 'oscillator',
	'source.player': 'player',
	'source.noise': 'noise',
	'source.microphone': 'microphone',

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
	'signal.meter': 'meter',

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
	| MeterParams
	| EnvelopeParams
	| LFOParams
	| DestinationParams
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
	audioNode: Tone.ToneAudioNode | Tone.ToneAudioNode[];
	parameters: AudioNodeParams;
	connections: {
		inputs: AudioConnection[];
		outputs: AudioConnection[];
	};
	isActive: boolean;
	createdAt: number;
}
