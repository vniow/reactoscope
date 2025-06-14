/**
 * Worklets module - AudioWorklet integration for Reactoscope
 *
 * This module provides the core infrastructure for integrating AudioWorklets
 * with Tone.js in the Reactoscope environment.
 */

// Core worklet infrastructure
export { ToneWorkletBase } from './ToneWorkletBase';
export {
	addBaseClass,
	addUtility,
	addProcessor,
	registerProcessor,
	getWorkletGlobalScope,
	isProcessorRegistered,
	getRegisteredProcessors,
	getRegistryStats,
	resetWorkletRegistry,
	createWorkletBlobUrl,
} from './WorkletGlobalScope';

// Types
export type {
	WorkletBaseOptions,
	WorkletRegistry,
	WorkletMessage,
	WorkletParameterDescriptor,
	BaseWorkletParams,
	NoiseWorkletParams,
	BitCrusherWorkletParams,
	DelayWorkletParams,
	WorkletParams,
	WorkletNodeType,
	WorkletErrorHandler,
	WorkletState,
} from './WorkletTypes';

// Worklet nodes
export { NoiseWorkletNode } from './nodes/NoiseWorkletNode';
export type { NoiseWorkletNodeOptions } from './nodes/NoiseWorkletNode';
export { CoordinateAudioWorkletNode } from './nodes/CoordinateAudioWorkletNode';
export type { CoordinateAudioWorkletNodeOptions } from './nodes/CoordinateAudioWorkletNode';

// Worklet processors (these are imported for side effects to register them)
export { workletName as noiseProcessorName } from './processors/NoiseProcessor.worklet';
