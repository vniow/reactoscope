export const GRID_UNIT = 64; // matches the Background gap size

/**
 * Calculate node dimensions based on grid units
 */
export function calculateNodeSize(gridWidth: number, gridHeight: number) {
	return {
		width: gridWidth * GRID_UNIT,
		height: gridHeight * GRID_UNIT,
	};
}

/**
 * Calculate grid-aligned position
 */
export function gridPosition(gridX: number, gridY: number) {
	return {
		x: gridX * GRID_UNIT,
		y: gridY * GRID_UNIT,
	};
}
