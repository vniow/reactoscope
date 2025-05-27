import type { Edge, EdgeTypes } from '@xyflow/react';
import { FloatingEdge } from './FloatingEdge';

export const initialEdges: Edge[] = [];

export const edgeTypes = {
	floating: FloatingEdge,
} satisfies EdgeTypes;
