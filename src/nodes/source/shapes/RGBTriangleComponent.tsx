/**
 * RGB Triangle Shape Component (React Three Fiber)
 *
 * A simple RGB triangle with hardcoded vertices and colors.
 * No transformations, animations, or scaling - just the basic shape.
 */

import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Simple RGB Triangle Component
 * Just renders the triangle vertices with RGB colors
 */
export function RGBTriangleComponent() {
	// Triangle vertices (equilateral triangle, closed loop)
	const points = useMemo(
		() => [
			new THREE.Vector3(0.0, 1.0, 0.0), // Top vertex
			new THREE.Vector3(-0.866, -0.5, 0.0), // Bottom left vertex
			new THREE.Vector3(0.866, -0.5, 0.0), // Bottom right vertex
			new THREE.Vector3(0.0, 1.0, 0.0), // Back to top (closed loop)
		],
		[]
	);

	// RGB colors for vertices
	const colors = useMemo(
		() => [
			new THREE.Color(1.0, 0.0, 0.0), // Red (top)
			new THREE.Color(0.0, 1.0, 0.0), // Green (bottom left)
			new THREE.Color(0.0, 0.0, 1.0), // Blue (bottom right)
			new THREE.Color(1.0, 0.0, 0.0), // Red (back to top)
		],
		[]
	);

	return (
		<Line
			points={points}
			vertexColors={colors}
			lineWidth={3}
		/>
	);
}
