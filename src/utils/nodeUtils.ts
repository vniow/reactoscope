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
 * Calculate the next position for a handle animating clockwise around a node's perimeter
 * @param currentGridX Current X grid coordinate
 * @param currentGridY Current Y grid coordinate
 * @param currentPosition Current React Flow Position
 * @param nodeWidth Node width in grid units
 * @param nodeHeight Node height in grid units
 * @returns Next position with gridX, gridY, and React Flow position
 */
export function calculateNextPerimeterPosition(
	currentGridX: number,
	currentGridY: number,
	currentPosition: Position,
	nodeWidth: number,
	nodeHeight: number
): {
	gridX: number;
	gridY: number;
	position: Position;
} {
	// Grid coordinates are 0-based, so max indices are width-1 and height-1
	const maxGridX = nodeWidth - 1;
	const maxGridY = nodeHeight - 1;

	switch (currentPosition) {
		case Position.Top:
			// Moving right across the top edge (gridY = 0)
			if (currentGridX < maxGridX) {
				return {
					gridX: currentGridX + 1,
					gridY: 0,
					position: Position.Top,
				};
			} else {
				// Reached the top-right corner, switch to right edge
				return {
					gridX: maxGridX,
					gridY: 1,
					position: Position.Right,
				};
			}

		case Position.Right:
			// Moving down along the right edge (gridX = maxGridX)
			if (currentGridY < maxGridY) {
				return {
					gridX: maxGridX,
					gridY: currentGridY + 1,
					position: Position.Right,
				};
			} else {
				// Reached the bottom-right corner, switch to bottom edge
				return {
					gridX: maxGridX - 1,
					gridY: maxGridY,
					position: Position.Bottom,
				};
			}

		case Position.Bottom:
			// Moving left across the bottom edge (gridY = maxGridY)
			if (currentGridX > 0) {
				return {
					gridX: currentGridX - 1,
					gridY: maxGridY,
					position: Position.Bottom,
				};
			} else {
				// Reached the bottom-left corner, switch to left edge
				return {
					gridX: 0,
					gridY: maxGridY - 1,
					position: Position.Left,
				};
			}

		case Position.Left:
			// Moving up along the left edge (gridX = 0)
			if (currentGridY > 0) {
				return {
					gridX: 0,
					gridY: currentGridY - 1,
					position: Position.Left,
				};
			} else {
				// Reached the top-left corner, switch to top edge
				return {
					gridX: 1,
					gridY: 0,
					position: Position.Top,
				};
			}

		default:
			// Fallback to starting position (top-left corner)
			return {
				gridX: 0,
				gridY: 0,
				position: Position.Top,
			};
	}
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
			return { gridX: nodeWidth - 1, gridY: 0 };
		case Position.Bottom:
			return { gridX: nodeWidth - 1, gridY: nodeHeight - 1 };
		case Position.Left:
			return { gridX: 0, gridY: nodeHeight - 1 };
		default:
			return { gridX: 0, gridY: 0 };
	}
}
