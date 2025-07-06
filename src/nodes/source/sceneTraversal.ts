import * as THREE from 'three';
// import BufferAttribute type if needed; using THREE.BufferAttribute directly
import type { VertexInfo, SceneData } from './sceneTypes';

/**
 * Extended geometry type supporting original point storage (drei Line).
 */
interface GeometryWithPoints extends THREE.BufferGeometry {
	parameters?: { points?: THREE.Vector3[] };
	points?: THREE.Vector3[];
}

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

		// Special-case for drei Line2 (alias of three-stdlib Line2) before Mesh handling
		if (object instanceof THREE.Mesh && object.type === 'Line2') {
			const mesh = object as THREE.Mesh;
			const geomAny = mesh.geometry as THREE.BufferGeometry & {
				attributes: {
					instanceStart?: THREE.BufferAttribute;
					instanceEnd?: THREE.BufferAttribute;
					color?: THREE.BufferAttribute;
				};
			};
			const startAttr = geomAny.attributes.instanceStart;
			const endAttr = geomAny.attributes.instanceEnd;
			if (startAttr && endAttr) {
				const colors = geomAny.attributes.color;
				const pts: THREE.Vector3[] = [];
				for (let i = 0; i < startAttr.count; i++) {
					tempVector.fromBufferAttribute(startAttr, i);
					pts.push(tempVector.clone());
					tempVector.fromBufferAttribute(endAttr, i);
					pts.push(tempVector.clone());
				}
				pts.forEach((localPos, i) => {
					const worldPos = localPos.clone();
					mesh.localToWorld(worldPos);
					const screenPos = worldPos.clone().project(camera);
					const screenRawX = ((screenPos.x + 1) / 2) * viewportSize.width;
					const screenRawY = ((1 - screenPos.y) / 2) * viewportSize.height;
					let color = { r: 1, g: 1, b: 1 };
					if (colors && colors.count > i) {
						color = { r: colors.getX(i), g: colors.getY(i), b: colors.getZ(i) };
					}
					vertices.push({
						screen: { x: screenPos.x, y: screenPos.y },
						screenRaw: { x: screenRawX, y: screenRawY },
						color,
						world: { x: worldPos.x, y: worldPos.y, z: worldPos.z },
					});
				});
				console.debug(
					`[sceneTraversal] Extracted ${pts.length} vertices for Line2 object:`,
					mesh,
					vertices.slice(-pts.length)
				);
				return;
			}
		}

		// Handle Mesh objects
		if (object instanceof THREE.Mesh) {
			const geometry = object.geometry as THREE.BufferGeometry;
			if (geometry?.attributes?.position) {
				const positions = geometry.attributes.position;
				const colors = geometry.attributes.color;
				const vertexCount = positions.count;
				const objectVertices: VertexInfo[] = [];
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
					objectVertices.push({
						screen: { x: screenPos.x, y: screenPos.y },
						screenRaw: { x: screenRawX, y: screenRawY },
						color,
						world: { x: worldPos.x, y: worldPos.y, z: worldPos.z },
					});
				}

				console.debug(
					`[sceneTraversal] Extracted ${objectVertices.length} vertices for Mesh object:`,
					object,
					objectVertices.slice(-10)
				);
				vertices.push(...objectVertices);
			}
			return; // Processed Mesh, move to next object
		}

		// Handle THREE.Line and THREE.LineSegments (including potential drei Line2)
		if (object instanceof THREE.Line || object instanceof THREE.LineSegments) {
			// Special-case for drei's Line2 under Line/LineSegments
			if (object.type === 'Line2') {
				const geomAny = object.geometry as THREE.BufferGeometry & {
					attributes: {
						instanceStart?: THREE.BufferAttribute;
						instanceEnd?: THREE.BufferAttribute;
						color?: THREE.BufferAttribute;
					};
				};
				const startAttr = geomAny.attributes.instanceStart;
				const endAttr = geomAny.attributes.instanceEnd;
				if (startAttr && endAttr) {
					const colors = geomAny.attributes.color;
					const pts: THREE.Vector3[] = [];
					for (let i = 0; i < startAttr.count; i++) {
						tempVector.fromBufferAttribute(startAttr, i);
						pts.push(tempVector.clone());
						tempVector.fromBufferAttribute(endAttr, i);
						pts.push(tempVector.clone());
					}
					pts.forEach((localPos, i) => {
						const worldPos = localPos.clone();
						object.localToWorld(worldPos);
						const screenPos = worldPos.clone().project(camera);
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
					});
					console.debug(
						`[sceneTraversal] Extracted ${pts.length} vertices for Line2 object:`,
						object,
						vertices.slice(-pts.length)
					);
					return; // handled
				}
			}
			const geometry = object.geometry as THREE.BufferGeometry;

			// Debug: log object type and geometry

			console.debug(
				`[sceneTraversal] Processing ${object.type} object:`,
				object,
				geometry
			);

			// Attempt to read original user points stored by drei Line via parameters or points
			const geomWithPoints = geometry as GeometryWithPoints;
			let originalPoints: THREE.Vector3[] | undefined;
			// Detect original points stored in parameters or points fields
			if (
				geomWithPoints.parameters?.points &&
				Array.isArray(geomWithPoints.parameters.points)
			) {
				originalPoints = geomWithPoints.parameters.points;
				console.debug(
					'[sceneTraversal] Found original points in geometry.parameters.points:',
					originalPoints.length
				);
			} else if (
				geomWithPoints.points &&
				Array.isArray(geomWithPoints.points)
			) {
				originalPoints = geomWithPoints.points;
				console.debug(
					'[sceneTraversal] Found original points in geometry.points:',
					originalPoints.length
				);
			}

			if (originalPoints && originalPoints.length > 0) {
				// Use original points if found
				const colors = geometry.attributes.color; // Colors might still be in attributes
				for (let i = 0; i < originalPoints.length; i++) {
					const localPos = originalPoints[i];
					const worldPos = localPos.clone();
					object.localToWorld(worldPos);
					const screenPos = worldPos.clone();
					screenPos.project(camera);
					const screenRawX = ((screenPos.x + 1) / 2) * viewportSize.width;
					const screenRawY = ((1 - screenPos.y) / 2) * viewportSize.height;
					let color = { r: 1, g: 1, b: 1 };
					// Attempt to get color from attribute if available
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
				// Debug: log extracted vertices for this Line object

				{
					const count = originalPoints.length;
					console.debug(
						`[sceneTraversal] Extracted ${count} vertices for ${object.type} using original points:`,
						object,
						vertices.slice(-count)
					);
				}
			} else if (geometry?.attributes?.position) {
				// Fallback: use buffer attribute if no original points found
				// This handles standard THREE.Line/LineSegments and cases where original points aren't exposed
				const positions = geometry.attributes.position;
				const colors = geometry.attributes.color;
				const vertexCount = positions.count;
				const objectVertices: VertexInfo[] = [];
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
					objectVertices.push({
						screen: { x: screenPos.x, y: screenPos.y },
						screenRaw: { x: screenRawX, y: screenRawY },
						color,
						world: { x: worldPos.x, y: worldPos.y, z: worldPos.z },
					});
				}
				// Debug: log extracted vertices for this object (fallback)

				console.debug(
					`[sceneTraversal] Extracted ${objectVertices.length} vertices for ${object.type} (fallback):`,
					object,
					objectVertices.slice(-10)
				);
				vertices.push(...objectVertices);
			}
		}
	});
	return { vertices, timestamp: Date.now() };
}
