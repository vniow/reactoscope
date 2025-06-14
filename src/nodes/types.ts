import type { Node, BuiltInNode, Position } from '@xyflow/react';
import type { AudioNodeData } from '../stores/slices/audioSlice';
import type { ComponentVariant } from '../types/ui';

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

export type ThreeFiberDemoNode = Node<BaseNodeData, 'threejs-demo'>;

export type AppNode =
	| BuiltInNode
	| DebugNode
	| OscillatorNode
	| GainNode
	| VisualizerNode
	| DestinationNode
	| NoiseWorkletNode
	| BitCrusherWorkletNode
	| DelayWorkletNode
	| ThreeFiberDemoNode;
