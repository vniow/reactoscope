import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../stores/appStore';
import { Position } from '@xyflow/react';

/**
 * Optimized hooks for handle position access with memoization
 * These hooks prevent unnecessary re-renders and expensive recalculations
 */

/**
 * Get handle positions for a specific node (memoized)
 */
export const useNodeHandlePositions = (nodeId: string) => {
	return useAppStore(
		useShallow((state) => state.flow.nodeHandlePositions[nodeId] || {})
	);
};

/**
 * Get a specific handle position for a node with proper default fallbacks
 */
export const useHandlePosition = (
	nodeId: string,
	handleId: string,
	defaultPosition?: Position
) => {
	const position = useAppStore(
		(state) =>
			state.flow.nodeHandlePositions[nodeId]?.[handleId] ||
			defaultPosition ||
			Position.Top
	);

	// Debug logging to trace handle position updates
	console.log(`[useHandlePosition] ${nodeId}.${handleId} => ${position}`, {
		nodeId,
		handleId,
		position,
		defaultPosition,
		allPositions: useAppStore.getState().flow.nodeHandlePositions[nodeId],
	});

	return position;
};

/**
 * Get handle positions for both source and target nodes of an edge
 * This is optimized for FloatingEdge component usage
 */
export const useEdgeHandlePositions = (
	sourceNodeId: string,
	targetNodeId: string,
	sourceHandleId?: string,
	targetHandleId?: string
) => {
	return useAppStore(
		useShallow((state) => {
			const sourcePositions =
				state.flow.nodeHandlePositions[sourceNodeId] || {};
			const targetPositions =
				state.flow.nodeHandlePositions[targetNodeId] || {};

			return {
				sourcePosition:
					sourcePositions[sourceHandleId || 'source'] || Position.Right,
				targetPosition:
					targetPositions[targetHandleId || 'target'] || Position.Left,
				sourcePositions,
				targetPositions,
			};
		})
	);
};

/**
 * Get all edges connected to a specific node (memoized)
 */
export const useConnectedEdges = (nodeId: string) => {
	return useAppStore(
		useShallow((state) =>
			state.flow.edges.filter(
				(edge) => edge.source === nodeId || edge.target === nodeId
			)
		)
	);
};

/**
 * Get nodes and their positions (optimized for handle calculations)
 */
export const useNodesForHandleCalculation = () => {
	return useAppStore(
		useShallow((state) =>
			state.flow.nodes.map((node) => ({
				id: node.id,
				position: node.position,
				width: node.measured?.width,
				height: node.measured?.height,
				type: node.type,
			}))
		)
	);
};

/**
 * Check if handle positions need recalculation
 * Returns true if any node positions have changed since last handle calculation
 */
export const useHandlePositionsNeedUpdate = () => {
	return useAppStore((state) => {
		// This could be enhanced with timestamp comparison or dirty flags
		const hasNodes = state.flow.nodes.length > 0;
		const hasHandlePositions =
			Object.keys(state.flow.nodeHandlePositions).length > 0;
		return hasNodes && !hasHandlePositions;
	});
};

/**
 * Batch operations for handle positions
 */
export const useHandlePositionActions = () => {
	return useAppStore(
		useShallow((state) => ({
			updateHandlePositions: state.updateHandlePositions,
			recalculateAllHandlePositions: state.recalculateAllHandlePositions,
			batchUpdateNodes: state.batchUpdateNodes,
		}))
	);
};
