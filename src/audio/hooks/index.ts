/**
 * Audio hooks module - React hooks for audio worklet management
 *
 * This module provides React hooks for managing audio worklet nodes
 * within the Reactoscope ecosystem.
 */

// Core audio hooks
export { useNoiseWorklet } from './useNoiseWorklet';
export type { NoiseWorkletControls } from './useNoiseWorklet';
export { useThreeWorklet } from './useThreeWorklet';
export type { ThreeWorkletControls } from './useThreeWorklet';

// Other hooks
export { useCoordinateAudioWorklet } from './useCoordinateAudioWorklet';
export { useSimpleNoiseWorklet } from './useSimpleNoiseWorklet';
export { useSimpleNoiseWorkletStore } from './useSimpleNoiseWorkletStore';
export { useToneAnalyser } from './useToneAnalyser';
export { useToneAnalyserModular } from './useToneAnalyserModular';
export { useToneConnections } from './useToneConnections';
export { useToneConnectionsZustand } from './useToneConnectionsZustand';
export { useToneDestination } from './useToneDestination';
export { useToneGain } from './useToneGain';
export { useToneOscillator } from './useToneOscillator';
