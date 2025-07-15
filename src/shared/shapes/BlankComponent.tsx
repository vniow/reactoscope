/**
 * Blank Shape Component (React Three Fiber)
 *
 * Renders a line from the end of the previous shape to the start of the next shape.
 * All RGB values are 0, all Z coordinates are 1.
 * Used to represent a gap between shapes for audio/visual segmentation.
 */

import React, { useMemo } from 'react';
import { Line } from '@react-three/drei';

export interface BlankComponentProps {
	start: [number, number, number]; // [x, y, z] of previous shape's end
	end: [number, number, number]; // [x, y, z] of next shape's start
	lineWidth?: number;
	position?: [number, number, number];
}

export function BlankComponent({
	start,
	end,
	lineWidth = 3,
	position = [0, 0, 0],
}: BlankComponentProps): React.ReactElement {
	// Force z=1 for both points
	const points = useMemo(
		() =>
			[
				[start[0], start[1], 1],
				[end[0], end[1], 1],
			] as [number, number, number][],
		[start, end]
	);
	// Both vertices are black (rgb=0)
	const colors = useMemo(
		() =>
			[
				[0, 0, 0],
				[0, 0, 0],
			] as [number, number, number][],
		[]
	);

	return (
		<Line
			points={points}
			vertexColors={colors}
			lineWidth={lineWidth}
			position={position}
		/>
	);
}

export default BlankComponent;
