import * as THREE from 'three';
import type { VertexInfo, SceneData } from '../../flow/nodes/source/sceneTypes';

/**
 * Extracts vertex data from a THREE.Scene, focusing on Line and LineSegments objects.
 * This simplified version is designed for the Woscope audio visualizer.
 *
 * @param scene The THREE.Scene to traverse.
 * @param camera The THREE.Camera for projection.
 * @returns A SceneData object containing vertex information.
 */
export function extractVerticesFromScene(
	scene: THREE.Scene,
	camera: THREE.Camera
): SceneData {
	const vertices: VertexInfo[] = [];
	const collectedSegments: THREE.LineSegments[] = [];

	scene.traverse((object) => {
		// Only collect LineSegments objects
		if (object instanceof THREE.LineSegments) {
			collectedSegments.push(object);
		}
	});

	for (const segment of collectedSegments) {
		const geometry = segment.geometry;
		const positionAttribute = geometry.getAttribute(
			'position'
		) as THREE.BufferAttribute;
		const colorAttribute = geometry.getAttribute(
			'color'
		) as THREE.BufferAttribute;

		if (!positionAttribute) continue;

		const worldMatrix = segment.matrixWorld;
		const points = [];

		for (let i = 0; i < positionAttribute.count; i++) {
			const pos = new THREE.Vector3().fromBufferAttribute(positionAttribute, i);
			pos.applyMatrix4(worldMatrix);
			points.push(pos);
		}

		// Each pair of vertices defines a segment
		for (let i = 0; i < points.length; i += 2) {
			const startPoint = points[i];
			const endPoint = points[i + 1];

			if (!startPoint || !endPoint) continue;

			// Project to screen space
			const screenPosStart = startPoint.clone().project(camera);
			const screenPosEnd = endPoint.clone().project(camera);

			// Get colors
			const startColor = colorAttribute
				? new THREE.Color().fromBufferAttribute(colorAttribute, i)
				: new THREE.Color(0xffffff);
			const endColor = colorAttribute
				? new THREE.Color().fromBufferAttribute(colorAttribute, i + 1)
				: new THREE.Color(0xffffff);

			vertices.push({
				screen: { x: screenPosStart.x, y: screenPosStart.y },
				screenRaw: { x: 0, y: 0 }, // Placeholder, need viewport info to calculate
				color: { r: startColor.r, g: startColor.g, b: startColor.b },
				world: { x: startPoint.x, y: startPoint.y, z: startPoint.z },
			});

			vertices.push({
				screen: { x: screenPosEnd.x, y: screenPosEnd.y },
				screenRaw: { x: 0, y: 0 }, // Placeholder
				color: { r: endColor.r, g: endColor.g, b: endColor.b },
				world: { x: endPoint.x, y: endPoint.y, z: endPoint.z },
			});
		}
	}

	return { vertices, timestamp: Date.now() };
}
