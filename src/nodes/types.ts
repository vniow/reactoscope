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

// Position logger node for floating handles demonstration
export interface PositionLoggerNodeData extends BaseNodeData {
	label?: string;
}

// Static node for testing mixed floating/static scenarios
export interface StaticNodeData extends BaseNodeData {
	label?: string;
}

export type DebugNode = Node<DebugNodeData, 'debug'>;
export type PositionLoggerNode = Node<
	PositionLoggerNodeData,
	'position-logger'
>;
export type StaticNode = Node<StaticNodeData, 'static'>;
export type OscillatorNode = Node<BaseNodeData & AudioNodeData, 'oscillator'>;
export type GainNode = Node<BaseNodeData & AudioNodeData, 'gain'>;
export type VisualizerNode = Node<BaseNodeData & AudioNodeData, 'visualizer'>;
export type DestinationNode = Node<BaseNodeData, 'destination'>;
export type AppNode =
	| BuiltInNode
	| DebugNode
	| PositionLoggerNode
	| StaticNode
	| OscillatorNode
	| GainNode
	| VisualizerNode
	| DestinationNode;
