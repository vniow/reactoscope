/**
 * Scene geometry source registry — mirrors `nodeRegistry.ts`'s type→handler
 * split (issue #42), but the "handler" is a plain React component instead of
 * an imperative create/dispose pair: R3F's own mount/unmount already gives
 * lifecycle management for free.
 */

import type { ForwardRefExoticComponent, RefAttributes } from 'react';
import type { Group } from 'three';
import type { GeometrySourceData, GeometrySourceType } from '../../store/dawTypes';
import { CubeSource } from './CubeSource';
import { CircleSource } from './CircleSource';
import { PlaneSource } from './PlaneSource';
import { SphereSource } from './SphereSource';
import { SvgImportSource } from './SvgImportSource';
import { GltfImportSource } from './GltfImportSource';

export type SourceComponentProps = { id: string; data: GeometrySourceData };
// forwardRef'd to the source's own outer <group> (not a second wrapper group)
// so the arrange-scene UI's TransformControls gizmo can attach to the exact
// same object that `data.transform` drives — a separate wrapper would double
// up position during a drag (see SceneSourcesArrangeScene.tsx).
export type SourceComponent = ForwardRefExoticComponent<SourceComponentProps & RefAttributes<Group>>;

export const sourceRegistry: Record<GeometrySourceType, SourceComponent> = {
	cube:       CubeSource,
	circle:     CircleSource,
	plane:      PlaneSource,
	sphere:     SphereSource,
	svgImport:  SvgImportSource,
	gltfImport: GltfImportSource,
};

export const SOURCE_TYPE_LABEL: Record<GeometrySourceType, string> = {
	cube:       'Cube',
	circle:     'Circle',
	plane:      'Plane',
	sphere:     'Sphere',
	svgImport:  'Import SVG…',
	gltfImport: 'Import glTF…',
};

/** Primitive types offered directly in the add-menu (importers go through a file picker). */
export const PRIMITIVE_SOURCE_TYPES: GeometrySourceType[] = ['cube', 'circle', 'plane', 'sphere'];

export function defaultSourceData(): GeometrySourceData {
	return {
		transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0],
			scale:    [1, 1, 1],
		},
	};
}
