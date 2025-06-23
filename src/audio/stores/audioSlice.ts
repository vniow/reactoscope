import type { StateCreator } from 'zustand';
import type { Connection, Edge } from '@xyflow/react';
import * as Tone from 'tone';
import type { AppState, AudioSlice, CustomNode } from '../../shared/types';
import audioNodeRegistry from '../AudioRegistry';
import type { ToneNoiseGenerator } from '../worklets/ToneNoiseGenerator';

// The audio slice now only contains the methods to interact with the registry.
// The state itself is managed in the flow slice.
export const createAudioSlice: StateCreator<AppState, [], [], AudioSlice> = (
	set,
	get
) => ({
	addAudioNode: async (node: CustomNode) => {
		console.log('Adding audio node:', { id: node.id, type: node.type });

		let audioNode: Tone.ToneAudioNode | undefined;
		// Node creation logic based on type
		switch (node.type) {
			case 'oscillator': {
				// Create oscillator without automatically connecting to destination
				audioNode = new Tone.Oscillator(440, 'sine');
				console.log('Created oscillator:', audioNode.constructor.name);
				break;
			}
			case 'destination': {
				// Create a gain node that connects to the browser's audio output
				audioNode = new Tone.Gain(0.7);
				audioNode.connect(Tone.getDestination());
				console.log('Created destination gain:', audioNode.constructor.name);
				break;
			}
			case 'gain': {
				audioNode = new Tone.Gain();
				break;
			}
			case 'multioscillator': {
				// For multi-oscillator, we'll store an array of oscillators
				const oscillators = [
					new Tone.Oscillator(220, 'sine'),
					new Tone.Oscillator(440, 'square'),
					new Tone.Oscillator(880, 'sawtooth'),
				];
				// Store the array in the registry - we'll type this properly
				audioNodeRegistry.set(
					node.id,
					oscillators as unknown as Tone.ToneAudioNode
				);
				console.log('Created multi-oscillator with 3 oscillators');
				return; // Early return since we handle storage above
			}
			case 'oscilloscope': {
				// Create an analyzer for the oscilloscope
				const analyzer = createAudioAnalyzer(node.id);
				// Store the analyzer in the registry
				audioNodeRegistry.set(
					node.id,
					analyzer as unknown as Tone.ToneAudioNode
				);
				console.log('Created oscilloscope analyzer');
				return;
			}
			case 'simpleosc': {
				// Create an analyzer for the simple oscilloscope
				const analyzer = createAudioAnalyzer(node.id);
				// Store the analyzer in the registry
				audioNodeRegistry.set(
					node.id,
					analyzer as unknown as Tone.ToneAudioNode
				);
				console.log('Created simple oscilloscope analyzer');
				return;
			}
			case 'simplexy': {
				// Create two analyzers for the XY scope (X and Y inputs)
				const xAnalyzer = createAudioAnalyzer(`${node.id}-x`);
				const yAnalyzer = createAudioAnalyzer(`${node.id}-y`);

				// Store both analyzers in the registry with special keys
				audioNodeRegistry.set(
					`${node.id}-x`,
					xAnalyzer as unknown as Tone.ToneAudioNode
				);
				audioNodeRegistry.set(
					`${node.id}-y`,
					yAnalyzer as unknown as Tone.ToneAudioNode
				);
				console.log('Created XY scope analyzers (X and Y)');
				return;
			}
			case 'noisegen': {
				try {
					// Make sure Tone.js is fully started first
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
					const { ToneNoiseGenerator } = await import('../worklets');

					// Create a new instance
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
							if (retryCount > 0) {
								console.log(`Retry attempt ${retryCount}/${maxRetries}...`);
								// Add increasing delay between retries
								await new Promise((resolve) =>
									setTimeout(resolve, 500 * retryCount)
								);
							}

							await noiseGen.initialize();
							console.log('Noise generator worklet successfully initialized');

							// Store the fully initialized node in the registry
							audioNodeRegistry.set(
								node.id,
								noiseGen as unknown as Tone.ToneAudioNode
							);
							console.log(`Noise generator registered with ID: ${node.id}`);

							// Mark success to exit retry loop
							success = true;
						} catch (initError) {
							console.error(
								`Initialization attempt ${retryCount + 1} failed:`,
								initError
							);
							retryCount++;

							// On last retry, rethrow the error
							if (retryCount > maxRetries) {
								throw initError;
							}
						}
					}
				} catch (error) {
					console.error(
						'Fatal error creating and initializing noise generator:',
						error
					);
				}
				return;
			}
			default: {
				// For custom nodes or types without direct audio representation
				console.log('Unknown node type, skipping:', node.type);
			}
		}

		// Store audio node in registry if it was created
		if (audioNode) {
			audioNodeRegistry.set(node.id, audioNode);
			console.log(
				`✓ Stored in registry: {id: '${node.id}', type: '${node.type}', registrySize: ${audioNodeRegistry.size}}`
			);
		}
	},
	removeAudioNode: (nodeId: string) => {
		const audioNode = audioNodeRegistry.get(nodeId);
		if (audioNode) {
			// Handle multi-oscillator cleanup
			if (Array.isArray(audioNode)) {
				audioNode.forEach((osc) => osc.dispose());
			} else {
				audioNode.dispose();
			}
			audioNodeRegistry.delete(nodeId);
		}

		// Also clean up analyzer if it exists
		const analyzer = audioAnalyzerRegistry.get(nodeId);
		if (analyzer) {
			analyzer.dispose();
			audioAnalyzerRegistry.delete(nodeId);
		}

		// Clean up XY scope analyzers if they exist
		const xAnalyzer = audioAnalyzerRegistry.get(`${nodeId}-x`);
		if (xAnalyzer) {
			xAnalyzer.dispose();
			audioAnalyzerRegistry.delete(`${nodeId}-x`);
		}
		const yAnalyzer = audioAnalyzerRegistry.get(`${nodeId}-y`);
		if (yAnalyzer) {
			yAnalyzer.dispose();
			audioAnalyzerRegistry.delete(`${nodeId}-y`);
		}
	},
	connect: (connection: Connection) => {
		const { source, target, sourceHandle, targetHandle } = connection;
		if (!source || !target) return;

		const sourceNode = audioNodeRegistry.get(source);
		let targetNode = audioNodeRegistry.get(target);

		// Special handling for XY scope connections
		if (targetHandle === 'audio-in-x') {
			targetNode = audioNodeRegistry.get(`${target}-x`);
		} else if (targetHandle === 'audio-in-y') {
			targetNode = audioNodeRegistry.get(`${target}-y`);
		}

		console.log('Connecting audio nodes:', {
			source,
			target,
			sourceHandle,
			targetHandle,
			sourceNode: Array.isArray(sourceNode)
				? 'MultiOscillator'
				: sourceNode?.constructor.name,
			targetNode: targetNode?.constructor.name,
		});
		if (sourceNode && targetNode) {
			try {
				// Handle multi-oscillator connections
				if (Array.isArray(sourceNode)) {
					// Extract channel index from sourceHandle (e.g., "audio-out-0" -> 0)
					const channelMatch = sourceHandle?.match(/audio-out-(\d+)/);
					const channelIndex = channelMatch ? parseInt(channelMatch[1]) : 0;

					if (sourceNode[channelIndex]) {
						sourceNode[channelIndex].connect(targetNode);
						console.log(`Multi-oscillator channel ${channelIndex} connected`);
					}
				} else if (targetNode instanceof Tone.Analyser) {
					// Connect to oscilloscope analyzer
					sourceNode.connect(targetNode);
					console.log('Connected to oscilloscope analyzer');
				} else {
					// Basic connection for single nodes
					sourceNode.connect(targetNode);
					console.log('Audio connection successful');
				}
			} catch (error) {
				console.error('Audio connection failed:', error);
			}
		} else {
			console.warn('Audio nodes not found for connection:', { source, target });
		}
	},
	disconnect: (edge: Edge) => {
		const { source, target, sourceHandle } = edge;
		const sourceNode = audioNodeRegistry.get(source);
		const targetNode = audioNodeRegistry.get(target);

		if (sourceNode && targetNode) {
			try {
				// Handle multi-oscillator disconnections
				if (Array.isArray(sourceNode)) {
					const channelMatch = sourceHandle?.match(/audio-out-(\d+)/);
					const channelIndex = channelMatch ? parseInt(channelMatch[1]) : 0;

					if (sourceNode[channelIndex]) {
						sourceNode[channelIndex].disconnect(targetNode);
					}
				} else {
					sourceNode.disconnect(targetNode);
				}
			} catch (error) {
				console.warn('Disconnection failed:', error);
			}
		}
	},
});

// Utility functions to access the audio node registry
export const getAudioNode = (
	nodeId: string
): Tone.ToneAudioNode | undefined => {
	return audioNodeRegistry.get(nodeId);
};

export const updateOscillatorParams = (
	nodeId: string,
	params: {
		frequency?: number;
		type?: Tone.ToneOscillatorType;
	}
) => {
	const node = audioNodeRegistry.get(nodeId);
	if (node && node instanceof Tone.Oscillator) {
		if (params.frequency !== undefined) {
			node.frequency.value = params.frequency;
		}
		if (params.type !== undefined) {
			node.type = params.type;
		}
	}
};

export const toggleOscillator = async (nodeId: string) => {
	console.log('Toggle oscillator called with ID:', nodeId);
	console.log('Current registry keys:', Array.from(audioNodeRegistry.keys()));

	// Start audio context if needed (required by modern browsers)
	if (Tone.getContext().state !== 'running') {
		await Tone.start();
		console.log('Audio context started');
	}

	const node = audioNodeRegistry.get(nodeId);
	console.log('Retrieved node from registry:', {
		nodeId,
		node: node?.constructor.name,
		state: node instanceof Tone.Oscillator ? node.state : 'unknown',
	});

	if (node && node instanceof Tone.Oscillator) {
		if (node.state === 'started') {
			node.stop();
			console.log('Oscillator stopped');
		} else {
			node.start();
			console.log('Oscillator started');
		}
	} else {
		console.error('Oscillator node not found or invalid:', {
			nodeId,
			registrySize: audioNodeRegistry.size,
			allKeys: Array.from(audioNodeRegistry.keys()),
			nodeExists: audioNodeRegistry.has(nodeId),
			nodeType: node?.constructor.name || 'undefined',
		});
	}
};

export const updateDestinationGain = (nodeId: string, gain: number) => {
	const node = audioNodeRegistry.get(nodeId);
	if (node && node instanceof Tone.Gain) {
		node.gain.value = gain;
	}
};

export const updateMultiOscillatorParams = (
	nodeId: string,
	oscIndex: number,
	params: {
		frequency?: number;
		type?: Tone.ToneOscillatorType;
	}
) => {
	const nodes = audioNodeRegistry.get(nodeId);
	if (Array.isArray(nodes) && nodes[oscIndex] instanceof Tone.Oscillator) {
		const oscillator = nodes[oscIndex] as Tone.Oscillator;
		if (params.frequency !== undefined) {
			oscillator.frequency.value = params.frequency;
		}
		if (params.type !== undefined) {
			oscillator.type = params.type;
		}
	}
};

export const toggleMultiOscillator = async (
	nodeId: string,
	oscIndex: number
) => {
	console.log('Toggle multi-oscillator called:', { nodeId, oscIndex });

	// Start audio context if needed
	if (Tone.getContext().state !== 'running') {
		await Tone.start();
		console.log('Audio context started');
	}

	const nodes = audioNodeRegistry.get(nodeId);
	if (Array.isArray(nodes) && nodes[oscIndex] instanceof Tone.Oscillator) {
		const oscillator = nodes[oscIndex] as Tone.Oscillator;
		if (oscillator.state === 'started') {
			oscillator.stop();
			console.log(`Multi-oscillator ${oscIndex} stopped`);
		} else {
			oscillator.start();
			console.log(`Multi-oscillator ${oscIndex} started`);
		}
	} else {
		console.error('Multi-oscillator not found:', { nodeId, oscIndex });
	}
};

// Audio analyzer registry for visualizers
const audioAnalyzerRegistry = new Map<string, Tone.Analyser>();

export const getAudioAnalyzer = (nodeId: string): Tone.Analyser | undefined => {
	return audioAnalyzerRegistry.get(nodeId);
};

export const createAudioAnalyzer = (nodeId: string): Tone.Analyser => {
	const analyzer = new Tone.Analyser('waveform', 1024);
	audioAnalyzerRegistry.set(nodeId, analyzer);
	return analyzer;
};

export const removeAudioAnalyzer = (nodeId: string) => {
	const analyzer = audioAnalyzerRegistry.get(nodeId);
	if (analyzer) {
		analyzer.dispose();
		audioAnalyzerRegistry.delete(nodeId);
	}
};

// Noise Generator specific functions
export const updateNoiseGeneratorParams = (
	nodeId: string,
	params: {
		noiseType?: 'white' | 'pink' | 'brown';
		amplitude?: number;
	}
) => {
	const noiseGen = audioNodeRegistry.get(nodeId) as ToneNoiseGenerator;
	if (noiseGen && 'noiseType' in noiseGen) {
		try {
			if (params.noiseType !== undefined) {
				noiseGen.noiseType = params.noiseType;
			}
			if (params.amplitude !== undefined) {
				noiseGen.amplitude = params.amplitude;
			}
		} catch (error) {
			console.warn(
				'Failed to update noise generator params (worklet may not be ready yet):',
				error
			);
		}
	}
};

export const toggleNoiseGenerator = async (
	nodeId: string,
	playing: boolean
) => {
	console.log(
		`Toggling noise generator ${nodeId} to ${playing ? 'playing' : 'stopped'} state`
	);

	// Make sure Tone.js is started first
	try {
		await Tone.start();
		console.log(`Tone.js context state: ${Tone.getContext().state}`);
	} catch (e) {
		console.error('Error starting Tone.js:', e);
	}

	const node = audioNodeRegistry.get(nodeId);
	console.log('Retrieved node:', {
		exists: !!node,
		nodeType: node?.constructor.name || 'unknown',
		hasStartMethod: node && 'start' in node,
		hasStopMethod: node && 'stop' in node,
	});

	if (!node) {
		console.error(`No node found with ID: ${nodeId}`);
		return;
	}

	// Type guard to check if this is our noise generator
	if (!('start' in node) || !('stop' in node)) {
		console.error('Node does not have start/stop methods:', node);
		return;
	}

	const noiseGen = node as ToneNoiseGenerator;

	try {
		// Check if worklet is ready
		if (!noiseGen.isReady) {
			console.warn(
				'Noise generator worklet is not ready yet, attempting to reinitialize'
			);
			try {
				await noiseGen.initialize();
				console.log('Reinitialized noise generator worklet');
			} catch (initError) {
				console.error('Failed to reinitialize worklet:', initError);
				return;
			}
		}

		// Toggle playback
		if (playing) {
			console.log('Starting noise generator');
			noiseGen.start();
		} else {
			console.log('Stopping noise generator');
			noiseGen.stop();
		}

		console.log('Toggle successful');
	} catch (error) {
		console.error('Failed to toggle noise generator:', error);
	}
};

// Debug utility to check what's in the registry
export const debugAudioRegistry = () => {
	console.log('=== Audio Registry Debug ===');
	console.log('Registry size:', audioNodeRegistry.size);
	console.log('Audio Context State:', Tone.getContext().state);

	if (audioNodeRegistry.size === 0) {
		console.log('Registry is empty!');
		return;
	}

	console.log('Registry Contents:');
	audioNodeRegistry.forEach((node, id) => {
		console.log(`  ${id}: ${node.constructor.name}`, {
			state: node instanceof Tone.Oscillator ? node.state : 'N/A',
			connected: node.numberOfOutputs > 0 ? 'yes' : 'no',
		});
	});
	console.log('=== End Debug ===');
};
