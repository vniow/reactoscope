import type { Node, BuiltInNode, Position } from '@xyflow/react';
import type { AudioNodeData } from '../audio/stores/audioSlice';
import type { ComponentVariant } from '../shared/types/ui';

export interface BaseNodeData extends Record<string, unknown> {
	label?: string;
	gridWidth?: number;
	gridHeight?: number;
	handlePositions?: { [handleId: string]: Position };
	variant?: ComponentVariant; // Add variant to node data for React Flow access
}

export interface DebugNodeData extends BaseNodeData {
	label?: string;
}

export type DebugNode = Node<DebugNodeData, 'debug'>;
export type OscillatorNode = Node<BaseNodeData & AudioNodeData, 'oscillator'>;
export type GainNode = Node<BaseNodeData & AudioNodeData, 'gain'>;
export type VisualizerNode = Node<BaseNodeData & AudioNodeData, 'visualizer'>;
export type VisualizerNodeModular = Node<
	BaseNodeData & AudioNodeData,
	'visualizer-modular'
>;
export type DestinationNode = Node<BaseNodeData, 'destination'>;

// Worklet node types
export type NoiseWorkletNode = Node<
	BaseNodeData & AudioNodeData,
	'noise-worklet'
>;

export type BitCrusherWorkletNode = Node<
	BaseNodeData & AudioNodeData,
	'bitcrusher-worklet'
>;
export type DelayWorkletNode = Node<
	BaseNodeData & AudioNodeData,
	'delay-worklet'
>;

export type ThreeWorkletNode = Node<
	BaseNodeData & AudioNodeData,
	'three-worklet'
>;

export type ThreeFiberDemoNode = Node<BaseNodeData, 'threejs-demo'>;
export type FileLoaderNode = Node<BaseNodeData, 'file-loader'>;

export type VertexSonifierNode = Node<BaseNodeData & AudioNodeData, 'sonifier'>;

export type AppNode =
	| BuiltInNode
	| DebugNode
	| OscillatorNode
	| GainNode
	| VisualizerNode
	| VisualizerNodeModular
	| DestinationNode
	| NoiseWorkletNode
	| BitCrusherWorkletNode
	| DelayWorkletNode
	| ThreeWorkletNode
	| ThreeFiberDemoNode
	| FileLoaderNode
	| VertexSonifierNode;
