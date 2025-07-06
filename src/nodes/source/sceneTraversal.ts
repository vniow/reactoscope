import * as THREE from 'three';
import type { VertexInfo, SceneData } from './sceneTypes';

/** Filter function to determine which objects to process */
export interface SceneTraversalOptions {
	objectFilter?: (object: THREE.Object3D) => boolean;
}

export function extractVerticesFromScene(
	scene: THREE.Scene,
	camera: THREE.Camera,
	options: SceneTraversalOptions = {},
	viewportSize: { width: number; height: number }
): SceneData {
	const { objectFilter } = options;
	const vertices: VertexInfo[] = [];
	const tempVector = new THREE.Vector3();

	scene.traverse((object) => {
		if (objectFilter && !objectFilter(object)) return;
		if (
			object instanceof THREE.Mesh ||
			object instanceof THREE.Line ||
			object instanceof THREE.LineSegments
		) {
			const geometry = (object as THREE.Mesh | THREE.Line | THREE.LineSegments)
				.geometry as THREE.BufferGeometry;
			if (geometry?.attributes?.position) {
				const positions = geometry.attributes.position;
				const colors = geometry.attributes.color;
				const vertexCount = positions.count;
				for (let i = 0; i < vertexCount; i++) {
					tempVector.fromBufferAttribute(positions, i);
					const worldPos = tempVector.clone();
					object.localToWorld(worldPos);
					const screenPos = worldPos.clone();
					screenPos.project(camera);
					const screenRawX = ((screenPos.x + 1) / 2) * viewportSize.width;
					const screenRawY = ((1 - screenPos.y) / 2) * viewportSize.height;
					let color = { r: 1, g: 1, b: 1 };
					if (colors && colors.count > i) {
						color = {
							r: colors.getX(i),
							g: colors.getY(i),
							b: colors.getZ(i),
						};
					}
					vertices.push({
						screen: { x: screenPos.x, y: screenPos.y },
						screenRaw: { x: screenRawX, y: screenRawY },
						color,
						world: { x: worldPos.x, y: worldPos.y, z: worldPos.z },
					});
				}
			}
		}
	});
	return { vertices, timestamp: Date.now() };
}
