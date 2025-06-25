/**
 * Configuration constants for ThreeWorkletNode
 *
 * Separated into its own file to follow React Fast Refresh best practices
 * and to avoid mixing component definitions with constant exports.
 */

// Layout configuration for three worklet node (using grid utility classes)
export const THREE_WORKLET_NODE_CONFIG = {
	className: 'w-grid-12 h-grid-16', // 12×16 grid units (768px × 1024px)
	gridUnits: { width: 12, height: 16 }, // For documentation/reference
} as const;

// Enhanced configuration for coordinate smoothing and buffering
export const COORDINATE_BUFFER_CONFIG = {
	maxBufferSize: 128, // Maximum number of coordinate points to buffer
	updateInterval: 16, // Update interval in milliseconds (roughly 60fps)
	smoothingFactor: 1, // Interpolation factor for smoothing (0-1)
	flipYAxis: true, // Flip Y-axis to match visualizer coordinate system
	flipXAxis: true, // Flip X-axis if needed to match visualizer coordinate system
} as const;

// Configuration for scene traversal coordinate extraction
export const SCENE_EXTRACTION_CONFIG = {
	maxPointsPerObject: 500, // Limit points per object to prevent audio overload
	vertexSamplingRate: 1, // Sample every Nth vertex (1 = every vertex)
	includeObjectCenters: false, // Include object center points
	minDistanceBetweenPoints: 0.01, // Minimum distance between points (NDC space)
} as const;

// Buffer size options for dropdown selection
export const BUFFER_SIZE_OPTIONS = [
	{ value: 1, label: '1 pt' },
	{ value: 2, label: '2 pts' },
	{ value: 4, label: '4 pts' },
	{ value: 8, label: '8 pts' },
	{ value: 16, label: '16 pts' },
	{ value: 32, label: '32 pts' },
	{ value: 64, label: '64 pts' },
	{ value: 128, label: '128 pts' },
	{ value: 256, label: '256 pts' },
	{ value: 512, label: '512 pts' },
	{ value: 1024, label: '1K pts' },
	{ value: 2048, label: '2K pts' },
	{ value: 4096, label: '4K pts' },
];
