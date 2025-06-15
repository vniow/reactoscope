import type { Edge, EdgeTypes } from '@xyflow/react';
import { FloatingEdge } from './FloatingEdge';

export const initialEdges: Edge[] = [
	// Connection: Oscillator → Gain
	{
		id: 'edge-osc-to-gain',
		source: 'osc-1',
		sourceHandle: 'osc-1-source',
		target: 'gain-1',
		targetHandle: 'gain-1-audio-in',
		type: 'floating',
		label: 'Audio Signal',
		reconnectable: true,
		data: {
			// showLabel: true,
			// showDebug: false,
		},
	},

	// Connection: Gain → Destination
	{
		id: 'edge-gain-to-dest',
		source: 'gain-1',
		sourceHandle: 'gain-1-audio-out',
		target: 'dest-1',
		targetHandle: 'dest-1-audio-in',
		type: 'floating',
		label: 'Audio Signal',
		reconnectable: true,
		data: {
			// showLabel: true,
			// showDebug: false,
		},
	},
];

export const edgeTypes = {
	floating: FloatingEdge,
} satisfies EdgeTypes;
