/**
 * Simple test for the AudioWorklet system
 *
 * This file can be used to verify that the worklet infrastructure is working correctly.
 * Run this in a browser environment with AudioWorklet support.
 */

import * as Tone from 'tone';
import { NoiseWorkletNode, getRegistryStats } from './index';

/**
 * Test the noise worklet functionality
 */
export async function testNoiseWorklet(): Promise<void> {
	console.log('🧪 Testing AudioWorklet system...');

	// Check registry stats
	const stats = getRegistryStats();
	console.log('📊 Worklet registry stats:', stats);

	try {
		// Start Tone.js audio context
		await Tone.start();
		console.log('✅ Tone.js audio context started');

		// Create a noise worklet node
		const noiseNode = new NoiseWorkletNode({
			debug: true,
			volume: 0.1, // Low volume for testing
		});

		// Create a gain node for output control
		const gainNode = new Tone.Gain(0.5).toDestination();

		// Connect nodes
		noiseNode.connect(gainNode);

		// Wait for worklet to be ready
		console.log('⏳ Waiting for worklet to initialize...');
		await noiseNode.ready;
		console.log('✅ Worklet ready!');

		// Test starting noise
		console.log('▶️ Starting noise generation...');
		noiseNode.start();

		// Let it run for 2 seconds
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// Test volume change
		console.log('🔊 Changing volume...');
		noiseNode.setVolume(0.05);

		// Let it run for another second
		await new Promise((resolve) => setTimeout(resolve, 1000));

		// Stop noise
		console.log('⏹️ Stopping noise generation...');
		noiseNode.stop();

		// Clean up
		console.log('🧹 Cleaning up...');
		noiseNode.dispose();
		gainNode.dispose();

		console.log('✅ Test completed successfully!');
	} catch (error) {
		console.error('❌ Test failed:', error);
		throw error;
	}
}

// Export for use in browser console or other test environments
if (typeof window !== 'undefined') {
	(window as unknown as Record<string, unknown>).testNoiseWorklet =
		testNoiseWorklet;
	console.log('🎛️ Test function available as window.testNoiseWorklet()');
}
