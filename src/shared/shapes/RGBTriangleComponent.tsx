/**
 * RGB Triangle Shape Component (React Three Fiber)
 *
 * A simple RGB triangle with hardcoded vertices and colors.
 * No transformations, animations, or scaling - just the basic shape.
 */

import React, { useMemo } from 'react';
import { Line } from '@react-three/drei';

const RGB_TRIANGLE_POINTS: [number, number, number][] = [
	[0, Math.sqrt(3) / 3, 0], // Top vertex
	[-0.5, -Math.sqrt(3) / 6, 0], // Bottom left
	[0.5, -Math.sqrt(3) / 6, 0], // Bottom right
	[0, Math.sqrt(3) / 3, 0], // Close the triangle
];

const RGB_TRIANGLE_COLORS: [number, number, number][] = [
	[1, 0, 0], // Red (top)
	[0, 1, 0], // Green (bottom left)
	[0, 0, 1], // Blue (bottom right)
	[1, 0, 0], // Red (close)
];

/**
 * Simple RGB Triangle Component
 * Renders an RGB triangle with configurable segment density and scale
 */
export function RGBTriangleComponent({
	scale = 1,
	lineWidth = 3,
	position = [0, 0, 0],
}: {
	scale?: number;
	lineWidth?: number;
	position?: [number, number, number];
}): React.ReactElement {
	// Scale points
	const points = useMemo(
		() =>
			RGB_TRIANGLE_POINTS.map(
				([x, y, z]) =>
					[x * scale, y * scale, z * scale] as [number, number, number]
			),
		[scale]
	);
	const colors = RGB_TRIANGLE_COLORS;
	return (
		<Line
			points={points as [number, number, number][]}
			vertexColors={colors}
			lineWidth={lineWidth}
			position={position}
		/>
	);
}
