import { forwardRef, useMemo } from 'react';
import * as THREE from 'three';
import type { SourceComponentProps } from './sourceRegistry';

/**
 * The `circle` type — built directly as a THREE.LineLoop, not via
 * EdgesGeometry(CircleGeometry) (which would triangulate and produce noisy
 * radial spokes for no benefit). A perfectly smooth curve at zero extra
 * cost — the "prefer direct construction" principle from issue #45.
 */

const SEGMENTS = 48;
const RADIUS   = 0.4;

export const CircleSource = forwardRef<THREE.Group, SourceComponentProps>(({ data }, ref) => {
	const { position, rotation, scale } = data.transform;

	const geometry = useMemo(() => {
		const points: THREE.Vector3[] = [];
		for (let i = 0; i < SEGMENTS; i++) {
			const theta = (i / SEGMENTS) * Math.PI * 2;
			points.push(new THREE.Vector3(Math.cos(theta) * RADIUS, Math.sin(theta) * RADIUS, 0));
		}
		return new THREE.BufferGeometry().setFromPoints(points);
	}, []);

	return (
		<group ref={ref} position={position} rotation={rotation} scale={scale}>
			<lineLoop geometry={geometry}>
				<lineBasicMaterial color='#ffffff' />
			</lineLoop>
		</group>
	);
});
CircleSource.displayName = 'CircleSource';
