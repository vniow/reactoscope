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

export type DebugNode = Node<DebugNodeData, 'debug'>;
export type FileLoaderNode = Node<BaseNodeData, 'file-loader'>;

export type AppNode = BuiltInNode | DebugNode | FileLoaderNode;