import { Position } from '@xyflow/react';

/**
 * Generate a unique ID for a new node
 * @returns A unique node ID string in the format: node-{timestamp}-{random}
 */
export function generateNodeId(): string {
	return `node-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Create a random position offset to avoid node overlap
 * @param maxOffset Maximum offset in pixels (default: 200)
 * @returns Object with x and y offset values
 */
export function generateRandomOffset(maxOffset: number = 200): {
	x: number;
	y: number;
} {
	return {
		x: Math.random() * maxOffset,
		y: Math.random() * maxOffset,
	};
}

/**
 * Create a default position for a new node with optional random offset
 * @param baseX Base X position (default: 100)
 * @param baseY Base Y position (default: 100)
 * @param withRandomOffset Whether to add random offset (default: true)
 * @returns Position object with x and y coordinates
 */
export function generateNodePosition(
	baseX: number = 100,
	baseY: number = 100,
	withRandomOffset: boolean = true
): { x: number; y: number } {
	if (!withRandomOffset) {
		return { x: baseX, y: baseY };
	}

	const offset = generateRandomOffset();
	return {
		x: baseX + offset.x,
		y: baseY + offset.y,
	};
}

/**
 * Get default grid coordinates for a given position on a node's perimeter
 * @param position The React Flow Position
 * @param nodeWidth Node width in grid units
 * @param nodeHeight Node height in grid units
 * @returns Default gridX and gridY coordinates for that position
 */
export function getDefaultGridCoordinatesForPosition(
	position: Position,
	nodeWidth: number,
	nodeHeight: number
): { gridX: number; gridY: number } {
	switch (position) {
		case Position.Top:
			return { gridX: 0, gridY: 0 };
		case Position.Right:
			return { gridX: nodeWidth, gridY: 0 };
		case Position.Bottom:
			return { gridX: nodeWidth, gridY: nodeHeight };
		case Position.Left:
			return { gridX: 0, gridY: nodeHeight };
		default:
			return { gridX: 0, gridY: 0 };
	}
}
