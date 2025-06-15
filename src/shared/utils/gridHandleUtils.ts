import { GRID_UNIT } from '../shared/config/grid';

/**
 * Simplified grid-based handle positioning utilities
 * Only includes functions that are actually useful for the simplified GridNodeHandle approach
 */

export interface GridHandlePosition {
	gridX: number;
	gridY: number;
}

/**
 * Create a handle position that's centered on a node edge
 * This is the most commonly used utility function
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
 * Convert a grid position to pixel coordinates
 * Useful for debugging or advanced positioning
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
