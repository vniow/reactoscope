import type { NodeTypes } from '@xyflow/react';

import { DebugNode } from './DebugNode';
import { PositionLoggerNode } from './PositionLoggerNode';
import { StaticNode } from './StaticNode';
import { OscillatorNode } from './OscillatorNode';
import { GainNode } from './GainNode';
import { VisualizerNode } from './VisualizerNode';
import { DestinationNode } from './DestinationNode';

import type { AppNode } from './types';

export const initialNodes: AppNode[] = [
	// Demo: Position Logger Node with floating handles
	{
		id: 'floating-demo-1',
		type: 'position-logger',
		position: { x: 100, y: 50 },
		data: { label: 'Floating Node 1' },
	} as AppNode,

	// Demo: Second Position Logger Node
	{
		id: 'floating-demo-2',
		type: 'position-logger',
		position: { x: 400, y: 150 },
		data: { label: 'Floating Node 2' },
	} as AppNode,

	// Demo: Static Node for comparison
	{
		id: 'static-demo-1',
		type: 'static',
		position: { x: 250, y: 300 },
		data: { label: 'Static Node' },
	} as AppNode,

	// Test debug node to check handle rendering
	{
		id: 'test-debug-1',
		type: 'debug',
		position: { x: 200, y: 100 },
		data: { label: 'Test Debug Node' },
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
