import { audioNodeFactory } from './AudioNodeFactory';

// Import all node creators
import {
	OscillatorNodeCreator,
	DestinationNodeCreator,
	GainNodeCreator,
} from './creators/BasicAudioNodeCreators';

import {
	MultiOscillatorNodeCreator,
	OscilloscopeNodeCreator,
	XYScopeNodeCreator,
} from './creators/ComplexAudioNodeCreators';

import { NoiseGeneratorNodeCreator } from './creators/NoiseGeneratorNodeCreator';

/**
 * Register all available audio node creators
 * Following the Registry Pattern for centralized node type management
 *
 * This function should be called once during application initialization
 * to set up all available node types.
 */
export function registerAudioNodeCreators(): void {
	console.log('🎵 Registering audio node creators...');

	// Basic audio nodes
	audioNodeFactory.register('oscillator', new OscillatorNodeCreator());
	audioNodeFactory.register('destination', new DestinationNodeCreator());
	audioNodeFactory.register('gain', new GainNodeCreator());

	// Complex/composite nodes
	audioNodeFactory.register(
		'multioscillator',
		new MultiOscillatorNodeCreator()
	);

	// Visualization nodes
	audioNodeFactory.register('oscilloscope', new OscilloscopeNodeCreator());
	audioNodeFactory.register('simpleosc', new OscilloscopeNodeCreator()); // Same creator
	audioNodeFactory.register('simplexy', new XYScopeNodeCreator());

	// Generator nodes
	audioNodeFactory.register('noisegen', new NoiseGeneratorNodeCreator());

	const supportedTypes = audioNodeFactory.getSupportedTypes();
	console.log(
		`✓ Registered ${supportedTypes.length} audio node creators:`,
		supportedTypes
	);
}

/**
 * Get all supported audio node types
 * Useful for UI components that need to display available node types
 */
export function getSupportedAudioNodeTypes(): string[] {
	return audioNodeFactory.getSupportedTypes();
}

/**
 * Check if a specific audio node type is supported
 */
export function isAudioNodeTypeSupported(nodeType: string): boolean {
	return audioNodeFactory.isSupported(nodeType);
}
