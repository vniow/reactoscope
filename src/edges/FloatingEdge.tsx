import { useCallback } from 'react';
import {
	useStore,
	getSmoothStepPath,
	BaseEdge,
	type EdgeProps,
	type Node,
} from '@xyflow/react';

import { getNodeHandlePositions } from '../utils/handlePositioning';
import { getHandleCoordinates } from '../utils/handleCoordinates';

// Custom edge that recalculates its path based on dynamic handle positions
export function FloatingEdge({
	id,
	source,
	target,
	sourcePosition,
	targetPosition,
	style = {},
	markerEnd,
}: EdgeProps) {
	// Get all nodes and edges from the store first (before any early returns)
	const sourceNode = useStore(
		useCallback((store) => store.nodeLookup.get(source), [source])
	);
	const targetNode = useStore(
		useCallback((store) => store.nodeLookup.get(target), [target])
	);
	const nodes = useStore(
		useCallback((store) => Array.from(store.nodeLookup.values()), [])
	);
	const edges = useStore(useCallback((store) => store.edges, []));

	if (!sourceNode || !targetNode) {
		return null;
	}

	// Calculate dynamic handle positions
	const sourceHandlePositions = getNodeHandlePositions(
		source,
		nodes as Node[],
		edges
	);
	const targetHandlePositions = getNodeHandlePositions(
		target,
		nodes as Node[],
		edges
	);

	// Find the specific handle positions for this edge
	const edge = edges.find((e) => e.id === id);
	const sourceHandleId = edge?.sourceHandle || 'source';
	const targetHandleId = edge?.targetHandle || 'target';

	const dynamicSourcePosition =
		sourceHandlePositions[sourceHandleId] || sourcePosition;
	const dynamicTargetPosition =
		targetHandlePositions[targetHandleId] || targetPosition;

	// ADD DEBUGGING - This will help you see what's happening
	// console.log(`Edge ${id} update:`, {
	// 	sourceHandleId,
	// 	targetHandleId,
	// 	originalCoords: { sourceX, sourceY, targetX, targetY },
	// 	dynamicSourcePosition,
	// 	dynamicTargetPosition,
	// 	sourceHandlePositions,
	// 	targetHandlePositions,
	// });

	// Calculate actual coordinates based on dynamic handle positions
	const sourceCoords = getHandleCoordinates(
		sourceNode,
		dynamicSourcePosition
		// sourceHandleId
	);
	const targetCoords = getHandleCoordinates(
		targetNode,
		dynamicTargetPosition
		// targetHandleId
	);

	// Use the calculated coordinates instead of React Flow's defaults
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

	return (
		<BaseEdge
			path={edgePath}
			markerEnd={markerEnd}
			style={style}
		/>
	);
}
