/**
 * Triangle interpolation utility
 *
 * Returns interpolated points and colors for an equilateral RGB triangle.
 */
import * as THREE from 'three';

export function getTrianglePointsAndColors({
	scale = 1,
	segmentDensity = 16,
}: {
	scale?: number;
	segmentDensity?: number;
}) {
	const vertices: [number, number, number][] = [
		[0, scale, 0],
		[-0.866 * scale, -0.5 * scale, 0],
		[0.866 * scale, -0.5 * scale, 0],
	];
	const vertexColors: [number, number, number][] = [
		[1, 0, 0], // Red
		[0, 1, 0], // Green
		[0, 0, 1], // Blue
	];
	const pts: THREE.Vector3[] = [];
	const cols: THREE.Color[] = [];
	for (let edge = 0; edge < 3; edge++) {
		const start = vertices[edge];
		const end = vertices[(edge + 1) % 3];
		const colorStart = vertexColors[edge];
		const colorEnd = vertexColors[(edge + 1) % 3];
		for (let i = 0; i < segmentDensity; i++) {
			const t = i / segmentDensity;
			const pt = new THREE.Vector3(
				start[0] * (1 - t) + end[0] * t,
				start[1] * (1 - t) + end[1] * t,
				start[2] * (1 - t) + end[2] * t
			);
			const col = new THREE.Color(
				colorStart[0] * (1 - t) + colorEnd[0] * t,
				colorStart[1] * (1 - t) + colorEnd[1] * t,
				colorStart[2] * (1 - t) + colorEnd[2] * t
			);
			pts.push(pt);
			cols.push(col);
		}
	}
	// Close the triangle
	pts.push(new THREE.Vector3(...vertices[0]));
	cols.push(new THREE.Color(...vertexColors[0]));
	return { points: pts, colors: cols };
}
