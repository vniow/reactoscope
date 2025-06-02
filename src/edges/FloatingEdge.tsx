import { useCallback } from 'react';
import {
	useStore,
	getSmoothStepPath,
	BaseEdge,
	type EdgeProps,
} from '@xyflow/react';

import { useFloatingEdgePathData } from '../hooks/useHandlePositions';

// Custom edge that recalculates its path based on dynamic handle positions
export function FloatingEdge({
	id,
	source,
	target,
	style = {},
	markerEnd,
}: EdgeProps) {
	// console.log(`[FloatingEdge ${id}] Component render started`);

	// Get source and target nodes from React Flow store (still useful for checks or other data)
	const sourceNode = useStore(
		useCallback((store) => store.nodeLookup.get(source), [source])
	);
	const targetNode = useStore(
		useCallback((store) => store.nodeLookup.get(target), [target])
	);

	// Use the new hook to get dynamic path data
	const pathData = useFloatingEdgePathData(source, target);

	if (!sourceNode || !targetNode) {
		/* console.log(
			`[FloatingEdge ${id}] Missing nodes - sourceNode:`,
			!!sourceNode,
			'targetNode:',
			!!targetNode
		); */
		return null;
	}

	if (!pathData) {
		// console.log(`[FloatingEdge ${id}] Path data not available yet.`);
		return null; // Path data not ready (nodes might not be fully measured)
	}

	const { sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition } =
		pathData;

	// Use the calculated coordinates for smooth step path
	const [edgePath] = getSmoothStepPath({
		sourceX,
		sourceY,
		sourcePosition,
		targetX,
		targetY,
		targetPosition,
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
