// Triangle data for RGB triangle shape
// Use this file to share points and colors between components and utilities

export const RGB_TRIANGLE_POINTS: [number, number, number][] = [
	[0, Math.sqrt(3) / 3, 0], // Top vertex
	[-0.5, -Math.sqrt(3) / 6, 0], // Bottom left
	[0.5, -Math.sqrt(3) / 6, 0], // Bottom right
	[0, Math.sqrt(3) / 3, 0], // Close the triangle
];

export const RGB_TRIANGLE_COLORS: [number, number, number][] = [
	[1, 0, 0], // Red (top)
	[0, 1, 0], // Green (bottom left)
	[0, 0, 1], // Blue (bottom right)
	[1, 0, 0], // Red (close)
];
