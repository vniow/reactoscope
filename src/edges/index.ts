import type { Edge, EdgeTypes } from '@xyflow/react';
import { FloatingEdge } from './FloatingEdge';

export const initialEdges: Edge[] = [
	// Demo: Floating edge with label and debug info
	{
		id: 'floating-edge-1',
		source: 'floating-demo-1',
		target: 'floating-demo-2',
		type: 'floating',
		label: 'Connection 1',
		data: {
			showLabel: true,
			showDebug: true,
		},
	},

	// Demo: Floating edge with just debug info (no custom label)
	{
		id: 'floating-edge-2',
		source: 'floating-demo-2',
		target: 'static-demo-1',
		type: 'floating',
		data: {
			showLabel: true,
			showDebug: true,
		},
	},
];

export const edgeTypes = {
	floating: FloatingEdge,
} satisfies EdgeTypes;
