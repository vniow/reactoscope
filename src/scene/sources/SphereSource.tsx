import { forwardRef, useMemo } from 'react';
import * as THREE from 'three';
import type { SourceComponentProps } from './sourceRegistry';

/**
 * The `sphere` type — the one v1 primitive with no analytic line form
 * (issue #45). EdgesGeometry(IcosahedronGeometry) deliberately low-poly
 * (not a smooth high-poly UV sphere) to keep edge count and visual noise
 * down — the closest we get to "clean" for a curved surface.
 */

export const SphereSource = forwardRef<THREE.Group, SourceComponentProps>(({ data }, ref) => {
	const { position, rotation, scale } = data.transform;
	const geometry = useMemo(() => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.4, 1)), []);

	return (
		<group ref={ref} position={position} rotation={rotation} scale={scale}>
			<lineSegments geometry={geometry}>
				<lineBasicMaterial color='#ffffff' />
			</lineSegments>
		</group>
	);
});
SphereSource.displayName = 'SphereSource';
