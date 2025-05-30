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

	if (!sourceNode || !targetNode) {
		console.log(
			`[FloatingEdge ${id}] Missing nodes - sourceNode:`,
			!!sourceNode,
			'targetNode:',
			!!targetNode
		);
		return null;
	}

	// Calculate actual coordinates using improved handle positioning
	const sourceCoords = getHandleCoordinates(sourceNode, dynamicSourcePosition);
	const targetCoords = getHandleCoordinates(targetNode, dynamicTargetPosition);

	// Use the calculated coordinates for smooth step path
	const [edgePath] = getSmoothStepPath({
		sourceX: sourceCoords.x,
		sourceY: sourceCoords.y,
		sourcePosition: dynamicSourcePosition,
		targetX: targetCoords.x,
		targetY: targetCoords.y,
		targetPosition: dynamicTargetPosition,
		offset: 20, // Slightly increased for better visual spacing
		borderRadius: 8,
	});

	// Enhanced styling for reconnectable edges
	const reconnectableStyle = {
		strokeWidth: 5,
		stroke: '#6366f1', // indigo color
		...style,
	};

	return (
		<BaseEdge
			path={edgePath}
			markerEnd={markerEnd}
			style={reconnectableStyle}
			className='hover:!stroke-blue-500 transition-colors cursor-pointer'
		/>
	);
}
