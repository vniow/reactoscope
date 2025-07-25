import { Vector3, Euler } from 'three';

/**
 * Returns the rotated and translated position of a point relative to a centroid and rotation.
 * @param basePoint The point to rotate (e.g., a vertex)
 * @param centroid The centroid to rotate around
 * @param rotation The rotation as [x, y, z] Euler angles (radians)
 * @returns The rotated and translated position as [number, number, number]
 */
export function getRotatedDotPosition(
	basePoint: [number, number, number],
	centroid: [number, number, number],
	rotation: [number, number, number]
): [number, number, number] {
	const rotationEuler = new Euler(...rotation);
	const v = new Vector3(
		basePoint[0] - centroid[0],
		basePoint[1] - centroid[1],
		basePoint[2] - centroid[2]
	);
	v.applyEuler(rotationEuler);
	v.add(new Vector3(...centroid));
	return [v.x, v.y, v.z];
}
