import type { Node, BuiltInNode, Position } from '@xyflow/react';

export interface BaseNodeData extends Record<string, unknown> {
	label?: string;
	gridWidth?: number;
	gridHeight?: number;
	handlePositions?: { [handleId: string]: Position };
}

export type PositionLoggerNode = Node<
	BaseNodeData & { label: string },
	'position-logger'
>;
export type ThemeDebugNode = Node<BaseNodeData, 'theme-debug'>;
export type AppNode = BuiltInNode | PositionLoggerNode | ThemeDebugNode;
