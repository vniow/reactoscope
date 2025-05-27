import type { NodeTypes } from '@xyflow/react';

import { PositionLoggerNode } from './PositionLoggerNode';
import { ThemeDebugNode } from './ThemeDebugNode';
import type { AppNode } from './types';

export const initialNodes: AppNode[] = [];

export const nodeTypes = {
	'position-logger': PositionLoggerNode,
	'theme-debug': ThemeDebugNode,
	// Add any of your custom nodes here!
} satisfies NodeTypes;
