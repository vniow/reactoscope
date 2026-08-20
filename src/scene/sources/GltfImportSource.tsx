import { forwardRef, useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { SourceComponentProps } from './sourceRegistry';

/**
 * The `gltfImport` type (issue #48). `useLoader` + Suspense keeps this
 * component synchronous-looking despite async parsing — the caller
 * (SceneInputPanel) wraps source rendering in <Suspense>.
 *
 * Native Line/LineSegments/LineLoop/Points pass through untouched (glTF's
 * LINES/LINE_STRIP/LINE_LOOP/POINTS primitive modes already produce exactly
 * these types — GLTFLoader.js maps them directly, confirmed in the #47
 * research). Any Mesh (the common triangle-mode case) is replaced in-place
 * with an EdgesGeometry-derived LineSegments at the same local transform,
 * preserving the scene's nested hierarchy — not flattened to one group,
 * since a flattened copy would lose accumulated parent transforms below
 * the root.
 */

const EDGES_THRESHOLD = 1; // degrees — three.js's EdgesGeometry default, fixed per #45

export const GltfImportSource = forwardRef<THREE.Group, SourceComponentProps>(({ data }, ref) => {
	const { position, rotation, scale } = data.transform;
	const gltf = useLoader(GLTFLoader, data.assetDataUri ?? '');

	const walked = useMemo(() => {
		const clone = gltf.scene.clone(true);
		const meshes: { mesh: THREE.Mesh; parent: THREE.Object3D }[] = [];
		clone.traverse((obj) => {
			if (obj instanceof THREE.Mesh && obj.parent) {
				meshes.push({ mesh: obj, parent: obj.parent });
			}
		});
		for (const { mesh, parent } of meshes) {
			const edges = new THREE.EdgesGeometry(mesh.geometry, EDGES_THRESHOLD);
			const srcMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
			const color = (srcMat as THREE.MeshStandardMaterial)?.color?.clone() ?? new THREE.Color('#ffffff');
			const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color }));
			line.position.copy(mesh.position);
			line.rotation.copy(mesh.rotation);
			line.scale.copy(mesh.scale);
			parent.remove(mesh);
			parent.add(line);
		}
		return clone;
	}, [gltf]);

	return (
		<group ref={ref} position={position} rotation={rotation} scale={scale}>
			<primitive object={walked} />
		</group>
	);
});
GltfImportSource.displayName = 'GltfImportSource';
