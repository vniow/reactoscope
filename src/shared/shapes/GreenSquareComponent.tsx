/**
 * Green Square Shape Component (React Three Fiber)
 *
 * Renders a simple green square with hardcoded vertices and colors.
 * No transformations, animations, or scaling - just the basic shape.
 */

import React, { useMemo } from 'react';
import { Line } from '@react-three/drei';

const GREEN_SQUARE_POINTS: [number, number, number][] = [
	[-0.5, 0.5, 0], // Top left
	[0.5, 0.5, 0], // Top right
	[0.5, -0.5, 0], // Bottom right
	[-0.5, -0.5, 0], // Bottom left
	[-0.5, 0.5, 0], // Close the square
];

const GREEN_SQUARE_COLORS: [number, number, number][] = [
	[0, 1, 0], // Green
	[0, 1, 0], // Green
	[0, 1, 0], // Green
	[0, 1, 0], // Green
	[0, 1, 0], // Green
];

export function GreenSquareComponent({
	scale = 1,
	lineWidth = 3,
	position = [0, 0, 0],
}: {
	scale?: number;
	lineWidth?: number;
	position?: [number, number, number];
}): React.ReactElement {
	const points = useMemo(
		() =>
			GREEN_SQUARE_POINTS.map(
				([x, y, z]) =>
					[x * scale, y * scale, z * scale] as [number, number, number]
			),
		[scale]
	);
	const colors = GREEN_SQUARE_COLORS;
	return (
		<Line
			points={points as [number, number, number][]}
			vertexColors={colors}
			lineWidth={lineWidth}
			position={position}
		/>
	);
}
