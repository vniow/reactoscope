import { useCallback } from 'react';
import {
	useStore,
	getSmoothStepPath,
	BaseEdge,
	type EdgeProps,
} from '@xyflow/react';

import { getHandleCoordinates } from '../utils/handleCoordinates';
import { useEdgeHandlePositions } from '../hooks/useHandlePositions';

// Custom edge that recalculates its path based on dynamic handle positions
export function FloatingEdge({
	id,
	source,
	target,
	style = {},
	markerEnd,
}: EdgeProps) {
	console.log(`[FloatingEdge ${id}] Component render started`);

	// Get source and target nodes from React Flow store
	const sourceNode = useStore(
		useCallback((store) => store.nodeLookup.get(source), [source])
	);
	const targetNode = useStore(
		useCallback((store) => store.nodeLookup.get(target), [target])
	);

	// Get the edge to find handle IDs
	const edge = useStore(
		useCallback((store) => store.edges.find((e) => e.id === id), [id])
	);

	// 🚀 OPTIMIZATION: Use store-based handle positions instead of calculating each time
	const sourceHandleId = edge?.sourceHandle || 'source';
	const targetHandleId = edge?.targetHandle || 'target';

	const {
		sourcePosition: dynamicSourcePosition,
		targetPosition: dynamicTargetPosition,
	} = useEdgeHandlePositions(source, target, sourceHandleId, targetHandleId);

	console.log(`[FloatingEdge ${id}] Hook returned positions:`, {
		dynamicSourcePosition,
		dynamicTargetPosition,
		sourceNode: sourceNode
			? { id: sourceNode.id, position: sourceNode.position }
			: null,
		targetNode: targetNode
			? { id: targetNode.id, position: targetNode.position }
			: null,
	});

	if (!sourceNode || !targetNode) {
		console.log(
			`[FloatingEdge ${id}] Missing nodes - sourceNode:`,
			!!sourceNode,
			'targetNode:',
			!!targetNode
		);
		return null;
	}

	// Debug logging (disabled for performance - enable via debug panel)
	// console.log(`🚀 Edge ${id} optimized update:`, {
	// 	sourceHandleId,
	// 	targetHandleId,
	// 	dynamicSourcePosition,
	// 	dynamicTargetPosition,
	// 	source,
	// 	target,
	// });
	console.log(`🚀 Edge ${id} optimized update:`, {
		sourceHandleId,
		targetHandleId,
		dynamicSourcePosition,
		dynamicTargetPosition,
		source,
		target,
	});

	// Calculate actual coordinates based on optimized handle positions from store
	const sourceCoords = getHandleCoordinates(sourceNode, dynamicSourcePosition);
	const targetCoords = getHandleCoordinates(targetNode, dynamicTargetPosition);

	console.log(`[FloatingEdge ${id}] Calculated coordinates:`, {
		sourceCoords,
		targetCoords,
		sourcePosition: dynamicSourcePosition,
		targetPosition: dynamicTargetPosition,
	});

	// Use the calculated coordinates for smooth step path
	const [edgePath] = getSmoothStepPath({
		sourceX: sourceCoords.x,
		sourceY: sourceCoords.y,
		sourcePosition: dynamicSourcePosition,
		targetX: targetCoords.x,
		targetY: targetCoords.y,
		targetPosition: dynamicTargetPosition,
		offset: 16,
		borderRadius: 8, // Smooth corners
	});

	console.log(`[FloatingEdge ${id}] Generated path:`, edgePath);

	return (
		<BaseEdge
			path={edgePath}
			markerEnd={markerEnd}
			style={style}
		/>
	);
}
