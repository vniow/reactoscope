import { Position, type Node, type Edge } from '@xyflow/react';

export interface HandlePositions {
	sourcePosition: Position;
	targetPosition: Position;
}

/**
 * Calculate the optimal handle positions based on the relative position between two nodes
 */
export function calculateHandlePositions(
	sourceNode: Node,
	targetNode: Node
): HandlePositions {
	const sourceCenterX = sourceNode.position.x + (sourceNode.width || 150) / 2;
	const sourceCenterY = sourceNode.position.y + (sourceNode.height || 40) / 2;
	const targetCenterX = targetNode.position.x + (targetNode.width || 150) / 2;
	const targetCenterY = targetNode.position.y + (targetNode.height || 40) / 2;

	const deltaX = targetCenterX - sourceCenterX;
	const deltaY = targetCenterY - sourceCenterY;

	// Determine primary direction based on which delta is larger
	const isHorizontalPrimary = Math.abs(deltaX) > Math.abs(deltaY);

	let sourcePosition: Position;
	let targetPosition: Position;

	if (isHorizontalPrimary) {
		// Horizontal positioning is primary
		if (deltaX > 0) {
			// Target is to the right of source
			sourcePosition = Position.Right;
			targetPosition = Position.Left;
		} else {
			// Target is to the left of source
			sourcePosition = Position.Left;
			targetPosition = Position.Right;
		}
	} else {
		// Vertical positioning is primary
		if (deltaY > 0) {
			// Target is below source
			sourcePosition = Position.Bottom;
			targetPosition = Position.Top;
		} else {
			// Target is above source
			sourcePosition = Position.Top;
			targetPosition = Position.Bottom;
		}
	}

	return { sourcePosition, targetPosition };
}

/**
 * Get all handle positions for a specific node based on its connections
 */
export function getNodeHandlePositions(
	nodeId: string,
	nodes: Node[],
	edges: Edge[]
): { [handleId: string]: Position } {
	const currentNode = nodes.find((node) => node.id === nodeId);
	if (!currentNode) return {};

	const handlePositions: { [handleId: string]: Position } = {};

	// Find all edges connected to this node
	edges.forEach((edge) => {
		if (edge.source === nodeId) {
			// This node is the source
			const targetNode = nodes.find((node) => node.id === edge.target);
			if (targetNode) {
				const { sourcePosition } = calculateHandlePositions(
					currentNode,
					targetNode
				);
				const handleId = edge.sourceHandle || `${nodeId}-source`;
				handlePositions[handleId] = sourcePosition;
			}
		} else if (edge.target === nodeId) {
			// This node is the target
			const sourceNode = nodes.find((node) => node.id === edge.source);
			if (sourceNode) {
				const { targetPosition } = calculateHandlePositions(
					sourceNode,
					currentNode
				);
				const handleId = edge.targetHandle || `${nodeId}-target`;
				handlePositions[handleId] = targetPosition;
			}
		}
	});

	return handlePositions;
}
