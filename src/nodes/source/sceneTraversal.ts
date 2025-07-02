import * as THREE from 'three';
import type { VertexInfo, SceneData } from './DebugPanel';

/**
 * Scene Traversal Utility
 * 
 * Analyzes a Three.js scene and extracts vertex data from geometric objects.
 * Supports Mesh, Line, and LineSegments objects with BufferGeometry.
 */

/**
 * Options for scene traversal
 */
export interface SceneTraversalOptions {
  /** Maximum number of vertices to process per object (default: 3) */
  maxVerticesPerObject?: number;
  /** Filter function to determine which objects to process */
  objectFilter?: (object: THREE.Object3D) => boolean;
}

/**
 * Extracts vertex data from a Three.js scene
 * 
 * @param scene - The Three.js scene to traverse
 * @param camera - The camera for screen coordinate projection
 * @param options - Optional configuration for traversal behavior
 * @param viewportSize - Viewport size for pixel coordinate calculation
 * @returns SceneData containing extracted vertices and timestamp
 */
export function extractVerticesFromScene(
  scene: THREE.Scene,
  camera: THREE.Camera,
  options: SceneTraversalOptions = {},
  viewportSize = { width: 512, height: 512 }
): SceneData {
  const {
    maxVerticesPerObject = 3,
    objectFilter,
  } = options;

  const vertices: VertexInfo[] = [];
  const tempVector = new THREE.Vector3();

  scene.traverse((object) => {
    // Apply custom filter if provided
    if (objectFilter && !objectFilter(object)) {
      return;
    }

    // Check if it's a geometric object we can process
    if (
      object instanceof THREE.Mesh ||
      object instanceof THREE.Line ||
      object instanceof THREE.LineSegments
    ) {
      const geometricObject = object as THREE.Mesh | THREE.Line | THREE.LineSegments;
      const geometry = geometricObject.geometry as THREE.BufferGeometry;

      if (geometry?.attributes?.position) {
        const positions = geometry.attributes.position;
        const colors = geometry.attributes.color;

        // Process vertices up to the specified limit
        const vertexCount = Math.min(positions.count, maxVerticesPerObject);

        for (let i = 0; i < vertexCount; i++) {
          // Get local position
          tempVector.fromBufferAttribute(positions, i);

          // Transform to world coordinates
          const worldPos = tempVector.clone();
          object.localToWorld(worldPos);

          // Project to screen coordinates
          const screenPos = worldPos.clone();
          screenPos.project(camera);

          // Convert NDC to pixel coordinates for raw display
          const screenRawX = ((screenPos.x + 1) / 2) * viewportSize.width;
          const screenRawY = ((1 - screenPos.y) / 2) * viewportSize.height;

          // Use the direct NDC output from Three.js projection
          const screenX = screenPos.x;
          const screenY = screenPos.y;

          // Determine vertex color from geometry or use white as fallback
          let color = { r: 1, g: 1, b: 1 }; // Default to white

          if (colors && colors.count > i) {
            color = {
              r: colors.getX(i),
              g: colors.getY(i),
              b: colors.getZ(i),
            };
          }

          vertices.push({
            screen: { x: screenX, y: screenY },
            screenRaw: { x: screenRawX, y: screenRawY },
            color,
            world: { x: worldPos.x, y: worldPos.y, z: worldPos.z },
          });
        }
      }
    }
  });

  return {
    vertices,
    timestamp: Date.now(),
  };
}

/**
 * Creates a filter function that excludes specific object types
 * 
 * @param excludedTypes - Array of object type names to exclude
 * @returns Filter function for use with SceneTraversalOptions
 */
export function createObjectTypeFilter(excludedTypes: string[]) {
  return (object: THREE.Object3D): boolean => {
    return !excludedTypes.includes(object.type);
  };
}

/**
 * Creates a filter function that only includes objects with specific names
 * 
 * @param includedNames - Array of object names to include
 * @returns Filter function for use with SceneTraversalOptions
 */
export function createObjectNameFilter(includedNames: string[]) {
  return (object: THREE.Object3D): boolean => {
    return includedNames.includes(object.name);
  };
}

/**
 * Predefined filter that excludes common helper objects
 */
export const EXCLUDE_HELPERS_FILTER = createObjectTypeFilter([
  'GridHelper',
  'AxesHelper',
  'CameraHelper',
  'DirectionalLightHelper',
  'PointLightHelper',
  'SpotLightHelper',
]);
