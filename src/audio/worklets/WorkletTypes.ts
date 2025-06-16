/**
 * TypeScript interfaces and types for AudioWorklet integration in Reactoscope
 */

import type * as Tone from 'tone';

/**
 * Base options for worklet nodes
 */
export interface WorkletBaseOptions extends Tone.ToneAudioNodeOptions {
	/**
	 * Additional options for the AudioWorkletNode
	 */
	workletOptions?: Partial<AudioWorkletNodeOptions>;

	/**
	 * Enables additional debug logging
	 * @default false
	 */
	debug?: boolean;
}

/**
 * Worklet registry interface for tracking different types of worklet code
 */
export interface WorkletRegistry {
	baseClasses: Set<string>;
	processors: Set<string>;
	utilities: Set<string>;
	registrations: Map<string, string>;
}

/**
 * Worklet processor message types for communication between main thread and worklet
 */
export interface WorkletMessage {
	type: 'start' | 'stop' | 'dispose' | 'param-update' | 'custom';
	data?: Record<string, unknown>;
}

/**
 * Parameter descriptor for worklet processors
 */
export interface WorkletParameterDescriptor {
	name: string;
	defaultValue: number;
	minValue?: number;
	maxValue?: number;
	automationRate?: 'a-rate' | 'k-rate';
}

/**
 * Base interface for all worklet parameter types
 */
export interface BaseWorkletParams {
	[key: string]: number | boolean | string;
}

/**
 * Noise generator worklet parameters
 */
export interface NoiseWorkletParams extends BaseWorkletParams {
	isPlaying: boolean;
	volume: number;
}

/**
 * Three worklet generator worklet parameters
 */
export interface ThreeWorkletParams extends BaseWorkletParams {
	isPlaying: boolean;
	volume: number;
}

/**
 * Bit crusher worklet parameters
 */
export interface BitCrusherWorkletParams extends BaseWorkletParams {
	bits: number;
	wet: number;
}

/**
 * Delay worklet parameters
 */
export interface DelayWorkletParams extends BaseWorkletParams {
	delayTime: number;
	feedback: number;
	wet: number;
}

/**
 * Union type for all worklet parameters
 */
export type WorkletParams =
	| NoiseWorkletParams
	| ThreeWorkletParams
	| BitCrusherWorkletParams
	| DelayWorkletParams;

/**
 * Worklet node types
 */
export type WorkletNodeType =
	| 'noise-worklet'
	| 'three-worklet'
	| 'bitcrusher-worklet'
	| 'delay-worklet';

/**
 * Error handler type for worklet processor errors
 */
export type WorkletErrorHandler = (error: ErrorEvent) => void;

/**
 * Worklet initialization state
 */
export interface WorkletState {
	isInitialized: boolean;
	isReady: boolean;
	error?: Error;
}
