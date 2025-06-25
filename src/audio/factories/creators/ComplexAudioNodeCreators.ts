import * as Tone from 'tone';
import type { CustomNode } from '../../../shared/types';
import type { AudioNodeCreator } from '../AudioNodeFactory';
import audioNodeRegistry from '../../AudioRegistry';
import { createAudioAnalyzer } from '../../stores/audioSlice';

/**
 * Creator for multi-oscillator nodes
 * Handles creation of multiple oscillators as a composite node
 */
export class MultiOscillatorNodeCreator implements AudioNodeCreator {
	async create(node: CustomNode): Promise<Tone.ToneAudioNode | undefined> {
		// Get oscillator configurations from node data
		const oscillatorConfigs = (node.data?.oscillators as Array<{
			frequency: number;
			type: Tone.ToneOscillatorType;
			playing: boolean;
		}>) || [
			{ frequency: 220, type: 'sine', playing: false },
			{ frequency: 440, type: 'square', playing: false },
			{ frequency: 880, type: 'sawtooth', playing: false },
		];

		// Create array of oscillators
		const oscillators = oscillatorConfigs.map(
			(config) => new Tone.Oscillator(config.frequency, config.type)
		);

		// Store the array in the registry with proper typing
		// Note: This is a special case where we store an array instead of a single node
		audioNodeRegistry.set(
			node.id,
			oscillators as unknown as Tone.ToneAudioNode
		);

		console.log(
			`Created multi-oscillator with ${oscillators.length} oscillators`
		);

		// Return undefined since we handle storage directly
		return undefined;
	}
}

/**
 * Creator for oscilloscope analyzer nodes
 * Creates Tone.Analyser instances for waveform visualization
 */
export class OscilloscopeNodeCreator implements AudioNodeCreator {
	async create(node: CustomNode): Promise<Tone.ToneAudioNode | undefined> {
		// Create an analyzer for the oscilloscope
		const analyzer = createAudioAnalyzer(node.id);

		// Store the analyzer in the registry
		audioNodeRegistry.set(node.id, analyzer as unknown as Tone.ToneAudioNode);

		console.log('Created oscilloscope analyzer');

		// Return undefined since we handle storage directly
		return undefined;
	}
}

/**
 * Creator for XY scope nodes
 * Creates separate analyzers for X and Y inputs
 */
export class XYScopeNodeCreator implements AudioNodeCreator {
	async create(node: CustomNode): Promise<Tone.ToneAudioNode | undefined> {
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

		// Return undefined since we handle storage directly
		return undefined;
	}
}
