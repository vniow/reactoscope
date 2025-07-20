import * as THREE from 'three';
// import BufferAttribute type if needed; using THREE.BufferAttribute directly
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

		// Special-case for drei Line
		if (object instanceof THREE.Mesh && object.type === 'Line2') {
			const mesh = object as THREE.Mesh;
			const geomAny = mesh.geometry as THREE.BufferGeometry & {
				attributes: {
					instanceStart?: THREE.BufferAttribute;
					instanceEnd?: THREE.BufferAttribute;
					instanceStartColor?: THREE.BufferAttribute;
					instanceEndColor?: THREE.BufferAttribute;
					instanceColorStart?: THREE.BufferAttribute;
					instanceColorEnd?: THREE.BufferAttribute;
				};
			};
			const startAttr = geomAny.attributes.instanceStart;
			const endAttr = geomAny.attributes.instanceEnd;
			if (startAttr && endAttr) {
				const cStartAttr =
					geomAny.attributes.instanceStartColor ||
					geomAny.attributes.instanceColorStart;
				const cEndAttr =
					geomAny.attributes.instanceEndColor ||
					geomAny.attributes.instanceColorEnd;
				const entries: {
					pos: THREE.Vector3;
					color: { r: number; g: number; b: number };
				}[] = [];
				for (let i = 0; i < startAttr.count; i++) {
					tempVector.fromBufferAttribute(startAttr, i);
					const pStart = tempVector.clone();
					let colorStart = { r: 1, g: 1, b: 1 };
					if (cStartAttr && cStartAttr.count > i) {
						colorStart = {
							r: cStartAttr.getX(i),
							g: cStartAttr.getY(i),
							b: cStartAttr.getZ(i),
						};
					}
					entries.push({ pos: pStart, color: colorStart });
					tempVector.fromBufferAttribute(endAttr, i);
					const pEnd = tempVector.clone();
					let colorEnd = { r: 1, g: 1, b: 1 };
					if (cEndAttr && cEndAttr.count > i) {
						colorEnd = {
							r: cEndAttr.getX(i),
							g: cEndAttr.getY(i),
							b: cEndAttr.getZ(i),
						};
					}
					entries.push({ pos: pEnd, color: colorEnd });
				}
				entries.forEach(({ pos, color }) => {
					const worldPos = pos.clone();
					mesh.localToWorld(worldPos);
					const screenPos = worldPos.clone().project(camera);
					const screenRawX = ((screenPos.x + 1) / 2) * viewportSize.width;
					const screenRawY = ((1 - screenPos.y) / 2) * viewportSize.height;
					// Find first non-empty name up the ancestor chain
					let name = object.name || '';
					let parentObj = object.parent;
					while ((!name || name === '') && parentObj) {
						if (parentObj.name) {
							name = parentObj.name;
							break;
						}
						parentObj = parentObj.parent;
					}
					const objectName = name || object.type || object.uuid;
					vertices.push({
						screen: { x: screenPos.x, y: screenPos.y, z: screenPos.z },
						screenRaw: { x: screenRawX, y: screenRawY },
						color,
						world: { x: worldPos.x, y: worldPos.y, z: worldPos.z },
						objectName,
					});
				});

				return;
			}
		}
	});

	// Return SceneData object as required by the function signature
	return {
		vertices,
		timestamp: Date.now(),
	};
}
