import { GRID_UNIT } from '../config/grid';

/**
 * Simplified grid-based handle positioning utilities
 * These utilities help you position handles using your grid system consistently
 * All functions now return exact gridX and gridY coordinates for the simplified API
 */

export interface GridHandlePosition {
	gridX: number;
	gridY: number;
}

/**
 * Create a handle position at the center of a grid cell
 */
export function centerOfGridCell(
	gridX: number,
	gridY: number
): GridHandlePosition {
	return {
		gridX: gridX + 0.5,
		gridY: gridY + 0.5,
	};
}

/**
 * Create a handle position at the edge of a grid cell
 */
export function edgeOfGridCell(
	gridX: number,
	gridY: number,
	edge: 'top' | 'right' | 'bottom' | 'left'
): GridHandlePosition {
	const offsets = {
		top: { x: 0.5, y: 0 },
		right: { x: 1, y: 0.5 },
		bottom: { x: 0.5, y: 1 },
		left: { x: 0, y: 0.5 },
	};

	const offset = offsets[edge];
	return {
		gridX: gridX + offset.x,
		gridY: gridY + offset.y,
	};
}

/**
 * Create evenly spaced handles along a node edge
 */
export function evenlySpacedHandles(
	nodeGridWidth: number,
	nodeGridHeight: number,
	edge: 'top' | 'right' | 'bottom' | 'left',
	count: number
): GridHandlePosition[] {
	const positions: GridHandlePosition[] = [];

	if (edge === 'top' || edge === 'bottom') {
		// Horizontal spacing
		const spacing = nodeGridWidth / (count + 1);
		for (let i = 1; i <= count; i++) {
			positions.push({
				gridX: i * spacing,
				gridY: edge === 'top' ? 0 : nodeGridHeight,
			});
		}
	} else {
		// Vertical spacing (left/right)
		const spacing = nodeGridHeight / (count + 1);
		for (let i = 1; i <= count; i++) {
			positions.push({
				gridX: edge === 'left' ? 0 : nodeGridWidth,
				gridY: i * spacing,
			});
		}
	}

	return positions;
}

/**
 * Create a handle position that's centered on a node edge
 */
export function centeredOnEdge(
	nodeGridWidth: number,
	nodeGridHeight: number,
	edge: 'top' | 'right' | 'bottom' | 'left'
): GridHandlePosition {
	switch (edge) {
		case 'top':
			return {
				gridX: nodeGridWidth / 2,
				gridY: 0,
			};
		case 'right':
			return {
				gridX: nodeGridWidth,
				gridY: nodeGridHeight / 2,
			};
		case 'bottom':
			return {
				gridX: nodeGridWidth / 2,
				gridY: nodeGridHeight,
			};
		case 'left':
			return {
				gridX: 0,
				gridY: nodeGridHeight / 2,
			};
	}
}

/**
 * Get corner positions for a node
 */
export function cornerPositions(nodeGridWidth: number, nodeGridHeight: number) {
	return {
		topLeft: { gridX: 0, gridY: 0 },
		topRight: { gridX: nodeGridWidth, gridY: 0 },
		bottomLeft: { gridX: 0, gridY: nodeGridHeight },
		bottomRight: { gridX: nodeGridWidth, gridY: nodeGridHeight },
	};
}

/**
 * Convert a relative pixel position to grid coordinates
 */
export function pixelToGrid(
	pixelX: number,
	pixelY: number
): GridHandlePosition {
	return {
		gridX: pixelX / GRID_UNIT,
		gridY: pixelY / GRID_UNIT,
	};
}

/**
 * Convert a grid position to pixel coordinates
 */
export function gridToPixel(position: GridHandlePosition): {
	x: number;
	y: number;
} {
	return {
		x: position.gridX * GRID_UNIT,
		y: position.gridY * GRID_UNIT,
	};
}
