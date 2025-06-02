import type { Edge, EdgeTypes } from '@xyflow/react';
import { FloatingEdge } from './FloatingEdge';
import { DebugEdge } from './DebugEdge'; // Import the new DebugEdge

export const initialEdges: Edge[] = [];

export const edgeTypes = {
	floating: FloatingEdge,
	debug: DebugEdge, // Add DebugEdge to edgeTypes
} satisfies EdgeTypes;
