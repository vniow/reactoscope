/**
 * XYRGBMerge node for merging 5 mono channels (X,Y,R,G,B) into a single 5-channel output
 */
export type XYRGBMergeNode = Node<PlaceholderNodeData, 'component-xyrgb-merge'>;
import type { Node, BuiltInNode, Position } from '@xyflow/react';
import type { ComponentVariant } from '../../shared/types/ui';
import type { AudioNodeParams } from '../../audio/types';
import type { NodeRegistryEntry } from './nodeRegistry';

export interface BaseNodeData extends Record<string, unknown> {
	label?: string;
	handlePositions?: { [handleId: string]: Position };
	variant?: ComponentVariant; // Add variant to node data for React Flow access
	audioParams?: AudioNodeParams; // Add audio parameters
}

export interface DebugNodeData extends BaseNodeData {
	label?: string;
}

export interface PlaceholderNodeData extends BaseNodeData {
	label?: string;
	description?: string;
}

export type DebugNode = Node<DebugNodeData, 'debug'>;
/**
 * Simple debug node with unstyled output
 */
export type DebugSimpleNode = Node<DebugNodeData, 'debug-simple'>;
// SignalNode for Tone.Signal
import type { SignalParams } from '../../audio/types';
export interface SignalNodeData extends BaseNodeData {
	value?: number;
	min?: number;
	max?: number;
	units?: string;
	audioParams?: SignalParams;
}
export type SignalNode = Node<SignalNodeData, 'signal'>;
export type Signal3DNode = Node<PlaceholderNodeData, 'signal-3d'>;
/**
 * XYscope node for dual-input Lissajous visualization
 */
export type SignalXYNode = Node<PlaceholderNodeData, 'signal-xy'>;
/**
 * XYRGBScope node for 5-channel audio-visual mapping (X,Y,R,G,B)
 */
export type ReactoscopeViewerNode = Node<PlaceholderNodeData, 'source'>;
export type EventNode = Node<PlaceholderNodeData, 'event'>;
export type UtilityNode = Node<PlaceholderNodeData, 'unit'>;

export type AppNodeData = DebugNodeData;

export type AppNode = BuiltInNode | Node<any, NodeRegistryEntry['type']>;
