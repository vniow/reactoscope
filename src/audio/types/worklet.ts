/**
 * Worklet-specific type definitions for Reactoscope
 *
 * Defines types used specifically for AudioWorklet integration,
 * parameter descriptors, and worklet-specific node configurations.
 */

import type { AudioNodeType } from './index';

/**
 * Worklet-specific audio node types
 */
export type WorkletAudioNodeType =
	| 'bitcrusher'
	| 'spectralfilter'
	| 'granulardelay'
	| 'advancedoscillator'
	| 'noisegenerator'
	| 'vocoder'
	| 'pitchshifter'
	| 'granularsynthesis';

/**
 * Check if a node type is a worklet-based type
 */
export function isWorkletNodeType(nodeType: AudioNodeType): boolean {
	const workletTypes: AudioNodeType[] = [
		'bitcrusher',
		'spectralfilter',
		'granulardelay',
		'advancedoscillator',
		'noisegenerator',
		'vocoder',
		'pitchshifter',
		'granularsynthesis',
	];
	return workletTypes.includes(nodeType);
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
	description?: string;
}

/**
 * Worklet processor configuration
 */
export interface WorkletProcessorConfig {
	name: string;
	className: string;
	nodeType: AudioNodeType;
	description: string;
	parameterDescriptors: WorkletParameterDescriptor[];
	channels: {
		inputs: number;
		outputs: number;
	};
	features?: string[];
}

/**
 * Performance monitoring data from worklet processors
 */
export interface WorkletPerformanceData {
	avgTime: number;
	maxTime: number;
	lastTime: number;
	blockCount: number;
	timestamp: number;
}

/**
 * Message types for worklet communication
 */
export type WorkletMessageType =
	| 'dispose'
	| 'setDebug'
	| 'performance'
	| 'error'
	| 'parameterChange'
	| 'custom';

/**
 * Base structure for worklet messages
 */
export interface WorkletMessage {
	type: WorkletMessageType;
	data?: unknown;
	timestamp?: number;
}

/**
 * Performance message from worklet to main thread
 */
export interface WorkletPerformanceMessage extends WorkletMessage {
	type: 'performance';
	data: WorkletPerformanceData;
}

/**
 * Error message from worklet to main thread
 */
export interface WorkletErrorMessage extends WorkletMessage {
	type: 'error';
	data: {
		message: string;
		stack?: string;
		processorName: string;
	};
}

/**
 * Debug message from main thread to worklet
 */
export interface WorkletDebugMessage extends WorkletMessage {
	type: 'setDebug';
	data: {
		value: boolean;
	};
}

/**
 * Parameter change message (can be bidirectional)
 */
export interface WorkletParameterMessage extends WorkletMessage {
	type: 'parameterChange';
	data: {
		parameterName: string;
		value: number;
		timestamp: number;
	};
}

/**
 * Factory function type for creating worklet nodes
 */
export type WorkletNodeFactory<T = Record<string, unknown>> = (
	options?: T
) => Promise<unknown>;

/**
 * Registry of worklet node factories by type
 */
export type WorkletNodeFactoryRegistry = {
	[K in WorkletAudioNodeType]?: WorkletNodeFactory;
};

/**
 * Worklet initialization options
 */
export interface WorkletInitializationOptions {
	debug?: boolean;
	enablePerformanceMonitoring?: boolean;
	maxPolyphony?: number;
	bufferSize?: number;
	sampleRate?: number;
}
