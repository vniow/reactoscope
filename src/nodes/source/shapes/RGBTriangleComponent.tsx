/**
 * RGB Triangle Shape Component (React Three Fiber)
 *
 * A simple RGB triangle with hardcoded vertices and colors.
 * No transformations, animations, or scaling - just the basic shape.
 */

import React, { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { getTrianglePointsAndColors } from './utils/triangleUtils';

/**
 * Simple RGB Triangle Component
 * Renders an RGB triangle with configurable segment density and scale
 */
export function RGBTriangleComponent({
	segmentDensity = 16,
	scale = 1,
	lineWidth = 3,
}: {
	segmentDensity?: number;
	scale?: number;
	lineWidth?: number;
}): React.ReactElement {
	const { points, colors } = useMemo(
		() => getTrianglePointsAndColors({ scale, segmentDensity }),
		[scale, segmentDensity]
	);
	return (
		<Line
			points={points}
			vertexColors={colors}
			lineWidth={lineWidth}
		/>
	);
}
