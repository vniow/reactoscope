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
	ThreeWorkletParams,
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
export { ThreeWorkletNode } from './nodes/ThreeWorkletNode';
export type {
	ThreeWorkletNodeOptions,
	CoordinatePoint,
} from './nodes/ThreeWorkletNode';
export { CoordinateAudioWorkletNode } from './nodes/CoordinateAudioWorkletNode';
export type { CoordinateAudioWorkletNodeOptions } from './nodes/CoordinateAudioWorkletNode';
export { SonifierWorkletNode } from './nodes/SonifierWorkletNode';
export type { SonifierWorkletNodeOptions } from './nodes/SonifierWorkletNode';

// Worklet processors (these are imported for side effects to register them)
export { workletName as noiseProcessorName } from './processors/NoiseProcessor.worklet';
export { workletName as threeProcessorName } from './processors/ThreeProcessor.worklet';
export { workletName as sonifierProcessorName } from './processors/SonifierProcessor.worklet';
