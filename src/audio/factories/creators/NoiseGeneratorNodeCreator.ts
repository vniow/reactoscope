import * as Tone from 'tone';
import type { CustomNode } from '../../../shared/types';
import type { AudioNodeCreator } from '../AudioNodeFactory';
import audioNodeRegistry from '../../AudioRegistry';
import type { ToneNoiseGenerator } from '../../worklets/ToneNoiseGenerator';

/**
 * Creator for noise generator nodes
 * Handles async worklet initialization and proper error handling
 */
export class NoiseGeneratorNodeCreator implements AudioNodeCreator {
	async create(node: CustomNode): Promise<Tone.ToneAudioNode | undefined> {
		try {
			// Ensure Tone.js is fully started first
			console.log(
				'Ensuring Tone.js is started before noise generator initialization'
			);
			await Tone.start();

			// Check context state
			const contextState = Tone.getContext().state;
			console.log(`Tone.js context state: ${contextState}`);

			// Resume context if not running
			if (contextState !== 'running') {
				console.log('Attempting to resume Tone.js context...');
				await Tone.getContext().resume();
				console.log(
					`Tone.js context state after resume: ${Tone.getContext().state}`
				);
			}

			// Wait a short moment to ensure context is stable
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Dynamically import the ToneNoiseGenerator class
			console.log('Importing ToneNoiseGenerator');
			const { ToneNoiseGenerator } = await import('../../worklets');

			// Extract configuration from node data
			const noiseType =
				(node.data?.noiseType as 'white' | 'pink' | 'brown') || 'white';
			const amplitude = (node.data?.amplitude as number) ?? 0.5;

			console.log(
				`Creating noise generator with type=${noiseType}, amplitude=${amplitude}`
			);

			const noiseGen = new ToneNoiseGenerator({
				noiseType,
				amplitude,
			});

			// Asynchronously initialize the worklet with proper error handling
			console.log('Initializing noise generator worklet...');

			// Set up max retry count to prevent infinite loops
			const maxRetries = 2;
			let retryCount = 0;
			let success = false;

			while (retryCount <= maxRetries && !success) {
				try {
					await noiseGen.initialize();
					success = true;
					console.log(
						`✓ Noise generator worklet initialized successfully on attempt ${retryCount + 1}`
					);
				} catch (initError) {
					retryCount++;
					console.warn(
						`Noise generator init attempt ${retryCount} failed:`,
						initError
					);

					if (retryCount <= maxRetries) {
						console.log(`Retrying in 200ms... (${retryCount}/${maxRetries})`);
						await new Promise((resolve) => setTimeout(resolve, 200));
					}
				}
			}

			if (!success) {
				console.error('Failed to initialize noise generator after all retries');
				return undefined;
			}

			// Store in registry and return
			audioNodeRegistry.set(node.id, noiseGen as unknown as Tone.ToneAudioNode);
			console.log('✓ Noise generator stored in registry');

			// Return undefined since we handle storage directly
			return undefined;
		} catch (error) {
			console.error('Failed to create noise generator:', error);
			return undefined;
		}
	}

	/**
	 * Custom cleanup for noise generator nodes
	 */
	cleanup(nodeId: string): void {
		const node = audioNodeRegistry.get(nodeId);
		if (node && 'dispose' in node) {
			try {
				(node as ToneNoiseGenerator).dispose();
				console.log(`✓ Disposed noise generator ${nodeId}`);
			} catch (error) {
				console.error(`Failed to dispose noise generator ${nodeId}:`, error);
			}
		}
	}
}
