import { Position, type Node } from '@xyflow/react';

/**
 * Calculate the actual pixel coordinates for a handle based on node position and handle position
 */
export function getHandleCoordinates(
	node: Node,
	handlePosition: Position
): { x: number; y: number } {
	const nodeWidth = node.measured?.width ?? node.width ?? 150;
	const nodeHeight = node.measured?.height ?? node.height ?? 40;

	let x = node.position.x;
	let y = node.position.y;

	switch (handlePosition) {
		case Position.Top:
			x += nodeWidth / 2;
			break;
		case Position.Right:
			x += nodeWidth;
			y += nodeHeight / 2;
			break;
		case Position.Bottom:
			x += nodeWidth / 2;
			y += nodeHeight;
			break;
		case Position.Left:
			y += nodeHeight / 2;
			break;
	}

	return { x, y };
}
