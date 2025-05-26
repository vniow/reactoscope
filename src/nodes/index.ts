import type { NodeTypes } from '@xyflow/react';

import { PositionLoggerNode } from './PositionLoggerNode';
import { ThemeDebugNode } from './ThemeDebugNode';
import { AppNode } from './types';
import { gridPosition } from '../config/grid';

export const initialNodes: AppNode[] = [
	{
		id: 'a',
		type: 'position-logger',
		position: gridPosition(0, 0),
		data: {
			label: 'wire',
			gridWidth: 3,
			gridHeight: 2,
		},
	},
	{
		id: 'b',
		type: 'position-logger',
		position: gridPosition(0, 2),
		data: {
			label: 'drag me!',
			gridWidth: 3,
			gridHeight: 3,
		},
	},
	{
		id: 'c',
		type: 'position-logger',
		position: gridPosition(4, 0),
		data: {
			label: 'your ideas',
			gridWidth: 3,
			gridHeight: 2,
		},
	},
	{
		id: 'd',
		type: 'position-logger',
		position: gridPosition(4, 2),
		data: {
			label: 'with React Flow',
			gridWidth: 3,
			gridHeight: 2,
		},
	},
	{
		id: 'theme-debug',
		type: 'theme-debug',
		position: gridPosition(8, 0),
		data: {
			label: 'Theme Debug Info',
			gridWidth: 4,
			gridHeight: 4,
		},
	},
];

export const nodeTypes = {
	'position-logger': PositionLoggerNode,
	'theme-debug': ThemeDebugNode,
	// Add any of your custom nodes here!
} satisfies NodeTypes;
