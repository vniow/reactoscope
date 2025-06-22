import type { StateCreator } from 'zustand';
import type { Connection, Edge } from '@xyflow/react';
import * as Tone from 'tone';
import type { AppState, AudioSlice, CustomNode } from '../../shared/types';
import audioNodeRegistry from '../AudioRegistry';

// The audio slice now only contains the methods to interact with the registry.
// The state itself is managed in the flow slice.
export const createAudioSlice: StateCreator<
	AppState,
	[],
	[],
	AudioSlice
> = () => ({
	addAudioNode: (node: CustomNode) => {
		console.log('Adding audio node:', { id: node.id, type: node.type });

		let audioNode: Tone.ToneAudioNode | undefined;
		// Node creation logic based on type
		switch (node.type) {
			case 'oscillator':
				// Create oscillator without automatically connecting to destination
				audioNode = new Tone.Oscillator(440, 'sine');
				console.log('Created oscillator:', audioNode.constructor.name);
				break;
			case 'destination':
				// Create a gain node that connects to the browser's audio output
				audioNode = new Tone.Gain(0.7);
				audioNode.connect(Tone.getDestination());
				console.log('Created destination gain:', audioNode.constructor.name);
				break;
			case 'gain':
				audioNode = new Tone.Gain();
				break;
			default:
				// For custom nodes or types without direct audio representation
				console.log('Unknown node type, skipping:', node.type);
				return;
		}

		if (audioNode) {
			audioNodeRegistry.set(node.id, audioNode);
			console.log('✓ Stored in registry:', {
				id: node.id,
				type: node.type,
				registrySize: audioNodeRegistry.size,
			});
		} else {
			console.error('No audio node created for:', node.type);
		}
	},
	removeAudioNode: (nodeId: string) => {
		const audioNode = audioNodeRegistry.get(nodeId);
		if (audioNode) {
			audioNode.dispose();
			audioNodeRegistry.delete(nodeId);
		}
	},
	connect: (connection: Connection) => {
		const { source, target } = connection;
		if (!source || !target) return;

		const sourceNode = audioNodeRegistry.get(source);
		const targetNode = audioNodeRegistry.get(target);

		console.log('Connecting audio nodes:', {
			source,
			target,
			sourceNode: sourceNode?.constructor.name,
			targetNode: targetNode?.constructor.name,
		});

		if (sourceNode && targetNode) {
			try {
				// Basic connection, expand for multichannel
				sourceNode.connect(targetNode);
				console.log('Audio connection successful');
			} catch (error) {
				console.error('Audio connection failed:', error);
			}
		} else {
			console.warn('Audio nodes not found for connection:', { source, target });
		}
	},
	disconnect: (edge: Edge) => {
		const { source, target } = edge;
		const sourceNode = audioNodeRegistry.get(source);
		const targetNode = audioNodeRegistry.get(target);

		if (sourceNode && targetNode) {
			try {
				sourceNode.disconnect(targetNode);
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
