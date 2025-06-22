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
