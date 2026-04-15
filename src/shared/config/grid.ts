export const GRID_UNIT = 16; // Base grid unit in pixels, matches ReactFlow snapGrid

/**
 * Standard node size configurations in grid units
 * These match Tailwind's width/height classes for consistent styling
 */
export const NODE_SIZES = {
	// Small nodes (simple controls)
	small: { width: 12, height: 6 }, // w-48 h-24 = 192x96px

	// Medium nodes (standard controls)
	medium: { width: 16, height: 10 }, // w-64 h-40 = 256x160px

	// Large nodes (complex controls)
	large: { width: 20, height: 16 }, // w-80 h-64 = 320x256px

	// Extra wide nodes (visualizations)
	wide: { width: 24, height: 12 }, // w-96 h-48 = 384x192px

	// Square nodes
	square: { width: 16, height: 16 }, // w-64 h-64 = 256x256px
} as const;

/**
 * Calculate node dimensions in pixels based on grid units
 */
export function calculateNodeSize(gridWidth: number, gridHeight: number) {
	return {
		width: gridWidth * GRID_UNIT,
		height: gridHeight * GRID_UNIT,
	};
}

/**
 * Get Tailwind class names for grid-aligned dimensions
 */
export function getNodeTailwindClasses(
	gridWidth: number,
	gridHeight: number
): string {
	// Map grid units to Tailwind class names (assumes 1rem = 16px)
	const widthMap: Record<number, string> = {
		12: 'w-48', // 192px
		16: 'w-64', // 256px
		20: 'w-80', // 320px
		24: 'w-96', // 384px
	};

	const heightMap: Record<number, string> = {
		6: 'h-24', // 96px
		8: 'h-32', // 128px
		10: 'h-40', // 160px
		12: 'h-48', // 192px
		16: 'h-64', // 256px
	};

	const widthClass = widthMap[gridWidth] || `w-[${gridWidth * GRID_UNIT}px]`;
	const heightClass =
		heightMap[gridHeight] || `h-[${gridHeight * GRID_UNIT}px]`;

	return `${widthClass} ${heightClass}`;
}

/**
 * Get standard node size classes for common node types
 */
export function getStandardNodeClasses(
	sizeKey: keyof typeof NODE_SIZES
): string {
	const size = NODE_SIZES[sizeKey];
	return getNodeTailwindClasses(size.width, size.height);
}

/**
 * Convert grid units to pixels
 */
export function gridUnitsToPixels(gridUnits: number): number {
	return gridUnits * GRID_UNIT;
}

/**
 * Convert pixels to grid units (rounded to nearest unit)
 */
export function pixelsToGridUnits(pixels: number): number {
	return Math.round(pixels / GRID_UNIT);
}

/**
 * Calculate ReactFlow snap grid configuration
 */
export function getSnapGridConfig(): [number, number] {
	return [GRID_UNIT, GRID_UNIT];
}

/**
 * Node type to size mapping for consistent sizing across the app
 */
export const NODE_TYPE_SIZES: Record<string, keyof typeof NODE_SIZES> = {
	// Audio generation
	oscillator: 'medium',
	multioscillator: 'large',
	noisegen: 'medium',

	// Audio processing
	gain: 'small',
	filter: 'medium',
	delay: 'medium',

	// Audio output
	destination: 'small',

	// Visualization
	oscilloscope: 'wide',
	simpleosc: 'medium',
	simplexy: 'medium',

	// 3D/WebGL
	threefiber: 'square',
	webgl: 'square',

	// Default
	default: 'medium',
} as const;

/**
 * Get node size classes for a specific node type
 */
export function getNodeTypeClasses(nodeType: string): string {
	const sizeKey = NODE_TYPE_SIZES[nodeType] || NODE_TYPE_SIZES.default;
	return getStandardNodeClasses(sizeKey);
}

/**
 * Get appropriate size category for a node type
 */
export function getNodeSizeCategory(nodeType: string): keyof typeof NODE_SIZES {
	switch (nodeType) {
		case 'oscillator':
		case 'destination':
		case 'gain':
			return 'medium';
		case 'oscilloscope':
		case 'threejs':
		case 'threefiber':
		case 'simplexy':
			return 'wide';
		case 'multioscillator':
		case 'noisegen':
		case 'noise':
			return 'large';
		case 'simpleosc':
			return 'small';
		default:
			return 'medium';
	}
}

/**
 * Get size class for a node size category
 */
export function getNodeSizeClass(
	sizeCategory: keyof typeof NODE_SIZES
): string {
	return getStandardNodeClasses(sizeCategory);
}
