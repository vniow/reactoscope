import type { Edge, EdgeTypes } from '@xyflow/react';
import { FloatingEdge } from './FloatingEdge';

export const initialEdges: Edge[] = [
	{
		id: 'a->c',
		source: 'a',
		target: 'c',
		animated: true,
		type: 'floating',
		sourceHandle: 'source',
		targetHandle: 'target',
	},
	{
		id: 'b->d',
		source: 'b',
		target: 'd',
		type: 'floating',
		sourceHandle: 'source',
		targetHandle: 'target',
	},
	{
		id: 'c->d',
		source: 'c',
		target: 'd',
		animated: true,
		type: 'floating',
		sourceHandle: 'source',
		targetHandle: 'target',
	},
];

export const edgeTypes = {
	floating: FloatingEdge,
} satisfies EdgeTypes;
