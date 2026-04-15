import * as Tone from 'tone';
import type { CustomNode } from '../../../shared/types';
import type { AudioNodeCreator } from '../AudioNodeFactory';

/**
 * Creator for Tone.js Oscillator nodes
 * Following the Strategy Pattern for oscillator-specific creation logic
 */
export class OscillatorNodeCreator implements AudioNodeCreator {
	async create(node: CustomNode): Promise<Tone.ToneAudioNode> {
		// Extract configuration from node data with sensible defaults
		const frequency = (node.data?.frequency as number) || 440;
		const type = (node.data?.type as Tone.ToneOscillatorType) || 'sine';

		// Create oscillator without automatically connecting to destination
		// This follows the principle of explicit connections in the node graph
		const oscillator = new Tone.Oscillator(frequency, type);

		return oscillator;
	}
}

/**
 * Creator for destination (output) nodes
 * These are gain nodes that connect to the browser's audio output
 */
export class DestinationNodeCreator implements AudioNodeCreator {
	async create(node: CustomNode): Promise<Tone.ToneAudioNode> {
		// Extract volume configuration with default
		const volume = (node.data?.volume as number) || 0.7;

		// Create a gain node that connects to the browser's audio output
		const gainNode = new Tone.Gain(volume);
		gainNode.connect(Tone.getDestination());

		return gainNode;
	}
}

/**
 * Creator for gain nodes
 * Simple gain control nodes for volume adjustments
 */
export class GainNodeCreator implements AudioNodeCreator {
	async create(node: CustomNode): Promise<Tone.ToneAudioNode> {
		const gain = (node.data?.gain as number) || 1.0;
		return new Tone.Gain(gain);
	}
}
