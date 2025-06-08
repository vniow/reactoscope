import type { Edge, EdgeTypes } from '@xyflow/react';
import { FloatingEdge } from './FloatingEdge';

export const initialEdges: Edge[] = [
	// Connection: Floating Node 1 → Floating Node 2
	{
		id: 'edge-1-to-2',
		source: 'floating-node-1',
		sourceHandle: 'floating-node-1-source',
		target: 'floating-node-2',
		targetHandle: 'floating-node-2-target',
		type: 'floating',
		label: 'Float → Float',
		reconnectable: true, // Enable reconnection from both ends
		data: {
			showLabel: true,
			showDebug: true,
		},
	},

	// Connection: Floating Node 2 → Debug Node
	{
		id: 'edge-2-to-debug',
		source: 'floating-node-2',
		sourceHandle: 'floating-node-2-source',
		target: 'debug-node-1',
		targetHandle: 'debug-node-1-target',
		type: 'floating',
		label: 'Float → Debug',
		reconnectable: true, // Enable reconnection from both ends
		data: {
			showLabel: true,
			showDebug: true,
		},
	},

	// Connection: Floating Node 1 → Static Node
	{
		id: 'edge-1-to-static',
		source: 'floating-node-1',
		sourceHandle: 'floating-node-1-source',
		target: 'static-node-1',
		targetHandle: 'static-node-1-target',
		type: 'floating',
		label: 'Float → Static',
		reconnectable: true, // Enable reconnection from both ends
		data: {
			showLabel: true,
			showDebug: true,
		},
	},
];

export const edgeTypes = {
	floating: FloatingEdge,
} satisfies EdgeTypes;
