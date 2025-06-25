import type { Node, BuiltInNode, Position } from '@xyflow/react';
import type { ComponentVariant } from '../shared/types/ui';

export interface BaseNodeData extends Record<string, unknown> {
	label?: string;
	handlePositions?: { [handleId: string]: Position };
	variant?: ComponentVariant; // Add variant to node data for React Flow access
}

export interface DebugNodeData extends BaseNodeData {
	label?: string;
}

export interface PlaceholderNodeData extends BaseNodeData {
	label?: string;
	description?: string;
}

export type DebugNode = Node<DebugNodeData, 'debug'>;
export type FileLoaderNode = Node<BaseNodeData, 'file-loader'>;

// Placeholder node types for each variant
export type CoreNode = Node<PlaceholderNodeData, 'core'>;
export type SourceNode = Node<PlaceholderNodeData, 'source'>;
export type InstrumentNode = Node<PlaceholderNodeData, 'instrument'>;
export type EffectNode = Node<PlaceholderNodeData, 'effect'>;
export type ComponentNode = Node<PlaceholderNodeData, 'component'>;
export type SignalNode = Node<PlaceholderNodeData, 'signal'>;
export type EventNode = Node<PlaceholderNodeData, 'event'>;
export type UtilityNode = Node<PlaceholderNodeData, 'unit'>;

export type AppNode = 
	| BuiltInNode 
	| DebugNode 
	| FileLoaderNode
	| CoreNode
	| SourceNode
	| InstrumentNode
	| EffectNode
	| ComponentNode
	| SignalNode
	| EventNode
	| UtilityNode;