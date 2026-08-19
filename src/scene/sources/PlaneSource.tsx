import { forwardRef, useMemo } from 'react';
import * as THREE from 'three';
import type { SourceComponentProps } from './sourceRegistry';

/**
 * The `plane` type — EdgesGeometry(PlaneGeometry) is a clean 4-edge outline
 * (flat, no curved surfaces to produce noise), per issue #45.
 */

export const PlaneSource = forwardRef<THREE.Group, SourceComponentProps>(({ data }, ref) => {
	const { position, rotation, scale } = data.transform;
	const geometry = useMemo(() => new THREE.EdgesGeometry(new THREE.PlaneGeometry(0.7, 0.7)), []);

	return (
		<group ref={ref} position={position} rotation={rotation} scale={scale}>
			<lineSegments geometry={geometry}>
				<lineBasicMaterial color='#ffffff' />
			</lineSegments>
		</group>
	);
});
PlaneSource.displayName = 'PlaneSource';
