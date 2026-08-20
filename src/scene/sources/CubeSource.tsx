import { forwardRef } from 'react';
import * as THREE from 'three';
import type { SourceComponentProps } from './sourceRegistry';

/**
 * The `cube` type — generalized from the app's original hardcoded shape
 * (Wayfinder issue #40, #45). Geometry construction is unchanged: per-vertex
 * color mapped from box-local position, exactly as before.
 */

const EDGES_GEO = (() => {
	const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
	const pos = geo.getAttribute('position');
	const colors = new Float32Array(pos.count * 3);
	for (let i = 0; i < pos.count; i++) {
		colors[i * 3]     = pos.getX(i) + 0.5;
		colors[i * 3 + 1] = pos.getY(i) + 0.5;
		colors[i * 3 + 2] = pos.getZ(i) + 0.5;
	}
	geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
	return geo;
})();

export const CubeSource = forwardRef<THREE.Group, SourceComponentProps>(({ data }, ref) => {
	const { position, rotation, scale } = data.transform;
	return (
		<group ref={ref} position={position} rotation={rotation} scale={scale}>
			<lineSegments geometry={EDGES_GEO}>
				<lineBasicMaterial vertexColors />
			</lineSegments>
		</group>
	);
});
CubeSource.displayName = 'CubeSource';
