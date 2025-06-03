import type { Node, BuiltInNode, Position } from '@xyflow/react';
import type { AudioNodeData } from '../stores/slices/audioSlice';

export interface BaseNodeData extends Record<string, unknown> {
	label?: string;
	gridWidth?: number;
	gridHeight?: number;
	handlePositions?: { [handleId: string]: Position };
}

export interface DebugNodeData extends BaseNodeData {
	label?: string;
}

export type DebugNode = Node<DebugNodeData, 'debug'>;
export type OscillatorNode = Node<BaseNodeData & AudioNodeData, 'oscillator'>;
export type GainNode = Node<BaseNodeData & AudioNodeData, 'gain'>;
export type VisualizerNode = Node<BaseNodeData & AudioNodeData, 'visualizer'>;
export type DestinationNode = Node<BaseNodeData, 'destination'>;
export type AppNode =
	| BuiltInNode
	| DebugNode
	| OscillatorNode
	| GainNode
	| VisualizerNode
	| DestinationNode;
