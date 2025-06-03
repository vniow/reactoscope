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
 * Convert grid units to pixels
 */
export function gridUnitsToPixels(gridUnits: number): number {
	return gridUnits * GRID_UNIT;
}

/**
 * Convert pixels to grid units
 */
export function pixelsToGridUnits(pixels: number): number {
	return pixels / GRID_UNIT;
}

/**
 * Calculate handle offset in pixels, supporting both pixel and grid-unit modes
 */
/**
 * Calculate handle position offset in pixels (always uses grid units now)
 */
export function calculateHandlePosition(positionValue: number): number {
	return gridUnitsToPixels(positionValue);
}

/**
 * Validate handle position is within node boundaries
 */
export function validateHandlePosition(
	gridX: number,
	gridY: number,
	positionX: number,
	positionY: number,
	nodeGridWidth: number,
	nodeGridHeight: number
): { isValid: boolean; warnings: string[] } {
	const warnings: string[] = [];

	// Convert positions to pixels for validation
	const pixelPositionX = calculateHandlePosition(positionX);
	const pixelPositionY = calculateHandlePosition(positionY);

	// Calculate final position in pixels
	const finalX = gridX * GRID_UNIT + pixelPositionX;
	const finalY = gridY * GRID_UNIT + pixelPositionY;

	const nodeWidth = nodeGridWidth * GRID_UNIT;
	const nodeHeight = nodeGridHeight * GRID_UNIT;

	// Check boundaries
	if (finalX < 0)
		warnings.push(`Handle X position (${finalX}px) is outside left boundary`);
	if (finalX > nodeWidth)
		warnings.push(
			`Handle X position (${finalX}px) exceeds node width (${nodeWidth}px)`
		);
	if (finalY < 0)
		warnings.push(`Handle Y position (${finalY}px) is outside top boundary`);
	if (finalY > nodeHeight)
		warnings.push(
			`Handle Y position (${finalY}px) exceeds node height (${nodeHeight}px)`
		);

	return {
		isValid: warnings.length === 0,
		warnings,
	};
}
