import type { NodeTypes } from '@xyflow/react';

import { DebugNode } from './DebugNode';
import { PositionLoggerNode } from './PositionLoggerNode';
import { StaticNode } from './StaticNode';
import { OscillatorNode } from './OscillatorNode';
import { GainNode } from './GainNode';
import { VisualizerNode } from './VisualizerNode';
import { DestinationNode } from './DestinationNode';

import { GRID_UNIT } from '../config/grid';

import type { AppNode } from './types';

export const initialNodes: AppNode[] = [
	// Floating Handle Node 1 - Source node with open source handle
	{
		id: 'floating-node-1',
		type: 'position-logger',
		position: { x: GRID_UNIT, y: GRID_UNIT * 8 },
		data: { label: 'Floating Node 1' },
	} as AppNode,

	// Floating Handle Node 2 - Middle node (all handles connected)
	{
		id: 'floating-node-2',
		type: 'position-logger',
		position: { x: GRID_UNIT * 12, y: GRID_UNIT * 8 },
		data: { label: 'Floating Node 2' },
	} as AppNode,

	// Debug Node - Target node with open target handle
	{
		id: 'debug-node-1',
		type: 'debug',
		position: { x: GRID_UNIT * 6, y: GRID_UNIT * -2 },
		data: { label: 'Debug Node' },
	} as AppNode,

	// Static Node - Static handle positioning for comparison
	{
		id: 'static-node-1',
		type: 'static',
		position: { x: GRID_UNIT * -18, y: GRID_UNIT * 8 },
		data: { label: 'Static Node' },
	} as AppNode,
];

export const nodeTypes = {
	debug: DebugNode,
	'position-logger': PositionLoggerNode,
	static: StaticNode,
	oscillator: OscillatorNode,
	gain: GainNode,
	visualizer: VisualizerNode,
	destination: DestinationNode,
	// Add any of your custom nodes here!
} as NodeTypes;
