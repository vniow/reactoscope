/**
 * Green Square Shape Component (React Three Fiber)
 *
 * Renders a simple green square with hardcoded vertices and colors.
 * No transformations, animations, or scaling - just the basic shape.
 */

import React, { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { GREEN_SQUARE_POINTS, GREEN_SQUARE_COLORS } from './squareData';

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
