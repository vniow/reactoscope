import {
	getBezierPath,
	useInternalNode,
	type EdgeProps,
	type InternalNode,
	Position,
} from '@xyflow/react';

import { getEdgeParams } from '../utils/floatingEdge'; // Adjusted import path

interface SimpleFloatingEdgeProps extends EdgeProps {
	id: string;
	source: string;
	target: string;
	markerEnd?: string;
	style?: React.CSSProperties;
}

function SimpleFloatingEdge({
	id,
	source,
	target,
	markerEnd,
	style,
}: SimpleFloatingEdgeProps) {
	const sourceNode = useInternalNode(source) as InternalNode | undefined;
	const targetNode = useInternalNode(target) as InternalNode | undefined;

	if (!sourceNode || !targetNode) {
		return null;
	}

	const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
		sourceNode,
		targetNode
	);

	const [edgePath] = getBezierPath({
		sourceX: sx,
		sourceY: sy,
		sourcePosition: sourcePos as Position, // Added type assertion
		targetPosition: targetPos as Position, // Added type assertion
		targetX: tx,
		targetY: ty,
	});

	return (
		<path
			id={id}
			className='react-flow__edge-path'
			d={edgePath}
			strokeWidth={5}
			markerEnd={markerEnd}
			style={style}
		/>
	);
}

export default SimpleFloatingEdge;
