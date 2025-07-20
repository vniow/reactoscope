import React, { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { CONNECTOR_POINTS, CONNECTOR_COLORS } from './connectorData';

/**
 * ConnectorLineComponent
 * Draws a line between the last vertex of the RGB triangle and the first vertex of the Green square.
 */
/**
 * ConnectorLineComponent
 * Renders a connector line using static connectorData
 */
export function ConnectorLineComponent({
	scale = 1,
	lineWidth = 2,
	position = [0, 0, 0] as [number, number, number],
}: {
	scale?: number;
	lineWidth?: number;
	position?: [number, number, number];
}): React.ReactElement {
	const points = useMemo(
		() =>
			CONNECTOR_POINTS.map(
				([x, y, z]) =>
					[x * scale, y * scale, z * scale] as [number, number, number]
			),
		[scale]
	);

	return (
		<Line
			name='ConnectorLine'
			points={points}
			vertexColors={CONNECTOR_COLORS}
			lineWidth={lineWidth}
			position={position}
		/>
	);
}
