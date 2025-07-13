import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { getTrianglePointsAndColors } from './shapes/utils/triangleUtils';

interface RGBTriangleProps {
	/** Scale factor for triangle size */
	scale?: number;
	/** Rotation speed for animation */
	rotationSpeed?: number;
	/** Number of segments per edge */
	segmentDensity?: number;
}

/**
 * RGB Triangle Component
 * Creates a triangle with red, green, and blue vertices using BufferGeometry
 */
export function RGBTriangle({
	scale = 1,
	rotationSpeed = 1,
	segmentDensity = 16,
}: RGBTriangleProps): React.ReactElement {
	const groupRef = React.useRef<THREE.Group>(null);

	// Use shared utility for triangle points/colors
	const { points, colors } = React.useMemo(
		() => getTrianglePointsAndColors({ scale, segmentDensity }),
		[scale, segmentDensity]
	);

	// Animate rotation
	useFrame((_, delta) => {
		if (groupRef.current) {
			groupRef.current.rotation.z += rotationSpeed * delta;
		}
	});

	return (
		<group ref={groupRef}>
			<Line
				points={points}
				vertexColors={colors}
				lineWidth={1}
			/>
		</group>
	);
}
