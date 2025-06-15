import type { Edge, EdgeTypes } from '@xyflow/react';
import { FloatingEdge } from './FloatingEdge';

export const initialEdges: Edge[] = [
	// Start with no initial edges - users can create connections as needed
	// This prevents handle ID mismatches and other edge creation issues
];

export const edgeTypes = {
	floating: FloatingEdge,
} satisfies EdgeTypes;
