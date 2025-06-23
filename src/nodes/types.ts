import type { Node } from '@xyflow/react';
import type { CustomNodeData } from '../shared/types';

export interface OscillatorNodeData extends CustomNodeData {
	frequency: number;
	type: 'sine' | 'square' | 'sawtooth' | 'triangle';
	playing: boolean;
	[key: string]: unknown;
}

export interface DestinationNodeData extends CustomNodeData {
	volume: number;
	muted: boolean;
	[key: string]: unknown;
}

export type OscillatorNode = Node<OscillatorNodeData>;
export type DestinationNodeType = Node<DestinationNodeData>;

export interface OscillatorSettings {
	frequency: number;
	type: 'sine' | 'square' | 'sawtooth' | 'triangle';
	playing: boolean;
}

export interface MultiOscillatorNodeData extends CustomNodeData {
	oscillators: [OscillatorSettings, OscillatorSettings, OscillatorSettings];
}

export type MultiOscillatorNode = Node<MultiOscillatorNodeData>;

export interface OscilloscopeNodeData extends CustomNodeData {
	scale: number;
	color: string;
	gridVisible: boolean;
}

export type OscilloscopeNode = Node<OscilloscopeNodeData>;

export interface NoiseGeneratorNodeData extends CustomNodeData {
	noiseType: 'white' | 'pink' | 'brown';
	amplitude: number;
	playing: boolean;
}

export type NoiseGeneratorNode = Node<NoiseGeneratorNodeData>;
