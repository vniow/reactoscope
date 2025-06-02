import { useNodes, useEdges, useReactFlow, type Edge } from '@xyflow/react';
import type { AppNode } from '../nodes/types';

/**
 * MIGRATION BRIDGE: Transitional hooks to help components migrate from Zustand to React Flow state
 * TODO: Remove these once all components are updated to use React Flow directly
 */

/**
 * @deprecated Use useNodes() from @xyflow/react directly
 */
export const useFlowNodes = () => {
	return useNodes() as AppNode[];
};

/**
 * @deprecated Use useEdges() from @xyflow/react directly
 */
export const useFlowEdges = () => {
	return useEdges();
};

/**
 * @deprecated Use useReactFlow() from @xyflow/react directly
 */
export const useFlowActions = () => {
	const reactFlowInstance = useReactFlow();

	// For compatibility, provide the old interface
	return {
		setNodes: reactFlowInstance.setNodes,
		setEdges: reactFlowInstance.setEdges,
		addNode: (node: AppNode) => {
			reactFlowInstance.setNodes((nodes) => [...nodes, node]);
		},
		updateNode: (nodeId: string, updates: Partial<AppNode>) => {
			reactFlowInstance.setNodes((nodes) =>
				nodes.map((node) =>
					node.id === nodeId ? { ...node, ...updates } : node
				)
			);
		},
		removeNode: (nodeId: string) => {
			reactFlowInstance.setNodes((nodes) =>
				nodes.filter((node) => node.id !== nodeId)
			);
			reactFlowInstance.setEdges((edges) =>
				edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
			);
		},
		addEdge: (edge: Edge) => {
			reactFlowInstance.setEdges((edges) => [...edges, edge]);
		},
		removeEdge: (edgeId: string) => {
			reactFlowInstance.setEdges((edges) =>
				edges.filter((edge) => edge.id !== edgeId)
			);
		},
	};
};
