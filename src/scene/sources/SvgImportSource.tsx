import { forwardRef, useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import type { SourceComponentProps } from './sourceRegistry';

/**
 * The `svgImport` type (issue #46). `SVGLoader.parse()`'s subpaths already
 * flatten curves into polylines via `getPoints()` — direct line/loop
 * construction, no triangulation or EdgesGeometry fallback needed at all
 * (better than the glTF triangle-mode case).
 *
 * Fill vs. stroke only affects color, never geometry — every path becomes a
 * traced outline regardless of SVG fill/stroke styling. `subPath.autoClose`
 * (set when the path data ends in Z/z) decides LineLoop vs. Line.
 */

function isUsableColor(c?: string): c is string {
	if (!c) return false;
	const normalized = c.trim().toLowerCase();
	// SVG's own default fill ('#000') would otherwise render invisible
	// against reactoscope's black scene background — treat "no meaningful
	// color specified" and "literally black" the same way.
	return normalized !== 'none' && normalized !== '#000' && normalized !== '#000000' && normalized !== 'black';
}

type SvgParseResult = ReturnType<InstanceType<typeof SVGLoader>['parse']>;
type SvgPathStyle = { fill?: string; stroke?: string };

function getNormalization(xml: XMLDocument, paths: SvgParseResult['paths']) {
	const svgRoot = xml.documentElement;
	const viewBox = svgRoot?.getAttribute('viewBox');
	let minX = 0, minY = 0, width = 0, height = 0;

	if (viewBox) {
		const parts = viewBox.trim().split(/[\s,]+/).map(Number);
		[minX, minY, width, height] = parts;
	} else {
		const w = parseFloat(svgRoot?.getAttribute('width') ?? '');
		const h = parseFloat(svgRoot?.getAttribute('height') ?? '');
		if (!Number.isNaN(w) && !Number.isNaN(h)) {
			width = w; height = h;
		} else {
			const box = new THREE.Box2();
			for (const shapePath of paths) {
				for (const subPath of shapePath.subPaths) {
					for (const pt of subPath.getPoints()) box.expandByPoint(pt);
				}
			}
			if (!box.isEmpty()) {
				minX = box.min.x; minY = box.min.y;
				width = box.max.x - box.min.x; height = box.max.y - box.min.y;
			}
		}
	}

	const maxDim = Math.max(width, height) || 1;
	return { scale: 1 / maxDim, centerX: minX + width / 2, centerY: minY + height / 2 };
}

export const SvgImportSource = forwardRef<THREE.Group, SourceComponentProps>(({ data }, ref) => {
	const { position, rotation, scale } = data.transform;
	const parsed = useLoader(SVGLoader, data.assetDataUri ?? '');

	const walked = useMemo(() => {
		const group = new THREE.Group();
		const { scale: norm, centerX, centerY } = getNormalization(parsed.xml, parsed.paths);

		for (const shapePath of parsed.paths) {
			const style = shapePath.userData?.style as SvgPathStyle | undefined;
			const colorHex = isUsableColor(style?.stroke) ? style.stroke : (isUsableColor(style?.fill) ? style.fill : undefined);
			const color = colorHex ? new THREE.Color(colorHex) : new THREE.Color('#ffffff');

			for (const subPath of shapePath.subPaths) {
				const points2d = subPath.getPoints();
				if (points2d.length < 2) continue;
				// Flatten to z=0; flip Y (SVG is Y-down, reactoscope is Y-up);
				// normalize+center via the viewBox (or computed bbox fallback).
				const points3d = points2d.map(p =>
					new THREE.Vector3((p.x - centerX) * norm, -(p.y - centerY) * norm, 0),
				);
				const geometry = new THREE.BufferGeometry().setFromPoints(points3d);
				const material = new THREE.LineBasicMaterial({ color });
				group.add(subPath.autoClose
					? new THREE.LineLoop(geometry, material)
					: new THREE.Line(geometry, material));
			}
		}

		return group;
	}, [parsed]);

	return (
		<group ref={ref} position={position} rotation={rotation} scale={scale}>
			<primitive object={walked} />
		</group>
	);
});
SvgImportSource.displayName = 'SvgImportSource';
