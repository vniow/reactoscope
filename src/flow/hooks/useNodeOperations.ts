import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';

/**
 * Custom hook for node operations following the Container/Presenter pattern
 * Separates business logic from presentation components
 */
export function useNodeOperations() {
	const reactFlowInstance = useReactFlow();

	const deleteNode = useCallback(
		(nodeId: string) => {
			reactFlowInstance.setNodes((nodes) =>
				nodes.filter((node) => node.id !== nodeId)
			);
			reactFlowInstance.setEdges((edges) =>
				edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
			);
		},
		[reactFlowInstance]
	);

	const updateNodeData = useCallback(
		(nodeId: string, newData: Record<string, unknown>) => {
			reactFlowInstance.setNodes((nodes) =>
				nodes.map((node) =>
					node.id === nodeId
						? { ...node, data: { ...node.data, ...newData } }
						: node
				)
			);
		},
		[reactFlowInstance]
	);

	const selectNode = useCallback(
		(nodeId: string) => {
			reactFlowInstance.setNodes((nodes) =>
				nodes.map((node) => ({
					...node,
					selected: node.id === nodeId,
				}))
			);
		},
		[reactFlowInstance]
	);

	return {
		deleteNode,
		updateNodeData,
		selectNode,
	};
}
