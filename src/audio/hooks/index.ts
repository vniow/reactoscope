/**
 * Audio Hooks
 *
 * React hooks for managing audio worklets and effects
 */

// Worklet hooks
export { useNoiseWorklet } from './useNoiseWorklet';
export { useReactoscopeAudioProcessor } from './useReactoscopeAudioProcessor';

// Analyzer hooks
export { useXYRGBAnalyzers } from './useXYRGBAnalyzers';
export type {
	XYRGBAnalyzerData,
	UseXYRGBAnalyzersOptions,
} from './useXYRGBAnalyzers';

// Connection hooks
export { useAudioConnections } from './useAudioConnections';
export type {
	AudioInput,
	UseAudioConnectionsOptions,
} from './useAudioConnections';

// TODO: Additional worklet hooks to be implemented
// export { useSpectralFilterWorklet } from './useSpectralFilterWorklet';
// export { useGranularDelayWorklet } from './useGranularDelayWorklet';
