/**
 * XYRGB Oscilloscope Geometry
 *
 * Efficient buffer geometry for XY+RGB oscilloscope line rendering.
 * Adapted from woscope-r3f-ts approach but enhanced for RGB color support.
 * Creates line segments as quads for shader-based rendering with proper
 * XY coordinate mapping and RGB color interpolation.
 */

import * as THREE from 'three';
import { useMemo } from 'react';

export interface XYRGBAudioData {
	x: Float32Array;
	y: Float32Array;
	r: Float32Array;
	g: Float32Array;
	b: Float32Array;
}

// Constants for geometry management
export const DEFAULT_NUM_POINTS = 512;
export const DEFAULT_NUM_SEGMENTS = DEFAULT_NUM_POINTS - 1;

/**
 * Hook to create and manage XYRGB oscilloscope geometry
 */
export function useXYRGBOscilloscopeGeometry(
	numPoints: number = DEFAULT_NUM_POINTS
) {
	const numSegments = numPoints - 1;

	// Create buffer attributes
	const [aStart, aEnd, aColorStart, aColorEnd, aIdx, indices] = useMemo(() => {
		const start = new Float32Array(numSegments * 4 * 2); // XY coordinates
		const end = new Float32Array(numSegments * 4 * 2); // XY coordinates
		const colorStart = new Float32Array(numSegments * 4 * 3); // RGB colors
		const colorEnd = new Float32Array(numSegments * 4 * 3); // RGB colors
		const idx = new Float32Array(numSegments * 4); // Vertex indices
		const ind = new Uint16Array(numSegments * 6); // Triangle indices

		// Initialize vertex indices for quad generation
		for (let i = 0; i < numSegments; i++) {
			const vBase = i * 4; // Base vertex index for this segment's quad

			// Set aIdx for the 4 vertices of this segment's quad
			idx[vBase + 0] = vBase + 0;
			idx[vBase + 1] = vBase + 1;
			idx[vBase + 2] = vBase + 2;
			idx[vBase + 3] = vBase + 3;

			// Set triangle indices for the two triangles of this segment's quad
			// V0, V1, V2, V3 for the quad
			// Triangle 1: V0, V2, V1
			// Triangle 2: V1, V2, V3
			const iBase = i * 6;
			ind[iBase + 0] = vBase + 0;
			ind[iBase + 1] = vBase + 2;
			ind[iBase + 2] = vBase + 1;
			ind[iBase + 3] = vBase + 1;
			ind[iBase + 4] = vBase + 2;
			ind[iBase + 5] = vBase + 3;
		}

		return [start, end, colorStart, colorEnd, idx, ind];
	}, [numSegments]);

	/**
	 * Apply buffer attributes to a Three.js geometry
	 */
	const applyGeometryAttributes = (geometry: THREE.BufferGeometry) => {
		// Position attribute (required by Three.js)
		const positions = new Float32Array(numSegments * 4 * 3);
		geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

		// Custom attributes for XYRGB shader
		geometry.setAttribute('aStart', new THREE.BufferAttribute(aStart, 2));
		geometry.setAttribute('aEnd', new THREE.BufferAttribute(aEnd, 2));
		geometry.setAttribute(
			'aColorStart',
			new THREE.BufferAttribute(aColorStart, 3)
		);
		geometry.setAttribute('aColorEnd', new THREE.BufferAttribute(aColorEnd, 3));
		geometry.setAttribute('aIdx', new THREE.BufferAttribute(aIdx, 1));
		geometry.setIndex(new THREE.BufferAttribute(indices, 1));
	};

	/**
	 * Update geometry with XYRGB audio data
	 */
	const updateGeometryWithXYRGBData = (
		geometry: THREE.BufferGeometry,
		audioData: XYRGBAudioData,
		gain: number = 1.0
	) => {
		const startAttr = geometry.attributes.aStart as THREE.BufferAttribute;
		const endAttr = geometry.attributes.aEnd as THREE.BufferAttribute;
		const colorStartAttr = geometry.attributes
			.aColorStart as THREE.BufferAttribute;
		const colorEndAttr = geometry.attributes.aColorEnd as THREE.BufferAttribute;

		const numSamples = Math.min(
			audioData.x.length,
			audioData.y.length,
			audioData.r.length,
			audioData.g.length,
			audioData.b.length,
			numPoints
		);

		// Process line segments
		for (let i = 0; i < numSegments; i++) {
			if (i + 1 < numSamples) {
				// Sample XY coordinates (already in [-1,1] range from analyzers)
				const x1 = Math.max(-1, Math.min(1, audioData.x[i] * gain));
				const y1 = Math.max(-1, Math.min(1, audioData.y[i] * gain));
				const x2 = Math.max(-1, Math.min(1, audioData.x[i + 1] * gain));
				const y2 = Math.max(-1, Math.min(1, audioData.y[i + 1] * gain));

				// Sample RGB colors and map from [-1,1] to [0,1]
				const r1 = Math.max(0, Math.min(1, (audioData.r[i] + 1) * 0.5));
				const g1 = Math.max(0, Math.min(1, (audioData.g[i] + 1) * 0.5));
				const b1 = Math.max(0, Math.min(1, (audioData.b[i] + 1) * 0.5));
				const r2 = Math.max(0, Math.min(1, (audioData.r[i + 1] + 1) * 0.5));
				const g2 = Math.max(0, Math.min(1, (audioData.g[i + 1] + 1) * 0.5));
				const b2 = Math.max(0, Math.min(1, (audioData.b[i + 1] + 1) * 0.5));

				// Update all 4 vertices of the quad for this segment
				const vBase = i * 4;
				for (let j = 0; j < 4; j++) {
					const vertexIndex = vBase + j;

					// XY coordinates for start and end of line segment
					startAttr.array[vertexIndex * 2 + 0] = x1;
					startAttr.array[vertexIndex * 2 + 1] = y1;
					endAttr.array[vertexIndex * 2 + 0] = x2;
					endAttr.array[vertexIndex * 2 + 1] = y2;

					// RGB colors for start and end of line segment
					colorStartAttr.array[vertexIndex * 3 + 0] = r1;
					colorStartAttr.array[vertexIndex * 3 + 1] = g1;
					colorStartAttr.array[vertexIndex * 3 + 2] = b1;
					colorEndAttr.array[vertexIndex * 3 + 0] = r2;
					colorEndAttr.array[vertexIndex * 3 + 1] = g2;
					colorEndAttr.array[vertexIndex * 3 + 2] = b2;
				}
			} else {
				// Zero out unused segments
				const vBase = i * 4;
				for (let j = 0; j < 4; j++) {
					const vertexIndex = vBase + j;

					// Clear XY coordinates
					startAttr.array[vertexIndex * 2 + 0] = 0;
					startAttr.array[vertexIndex * 2 + 1] = 0;
					endAttr.array[vertexIndex * 2 + 0] = 0;
					endAttr.array[vertexIndex * 2 + 1] = 0;

					// Clear RGB colors
					colorStartAttr.array[vertexIndex * 3 + 0] = 0;
					colorStartAttr.array[vertexIndex * 3 + 1] = 0;
					colorStartAttr.array[vertexIndex * 3 + 2] = 0;
					colorEndAttr.array[vertexIndex * 3 + 0] = 0;
					colorEndAttr.array[vertexIndex * 3 + 1] = 0;
					colorEndAttr.array[vertexIndex * 3 + 2] = 0;
				}
			}
		}

		// Mark attributes as needing update
		startAttr.needsUpdate = true;
		endAttr.needsUpdate = true;
		colorStartAttr.needsUpdate = true;
		colorEndAttr.needsUpdate = true;

		// Update bounding sphere for proper culling
		geometry.computeBoundingSphere();
	};

	/**
	 * Reset all geometry data (for pause/clear state)
	 */
	const resetGeometryData = (geometry: THREE.BufferGeometry) => {
		const startAttr = geometry.attributes.aStart as THREE.BufferAttribute;
		const endAttr = geometry.attributes.aEnd as THREE.BufferAttribute;
		const colorStartAttr = geometry.attributes
			.aColorStart as THREE.BufferAttribute;
		const colorEndAttr = geometry.attributes.aColorEnd as THREE.BufferAttribute;

		// Clear all data
		startAttr.array.fill(0);
		endAttr.array.fill(0);
		colorStartAttr.array.fill(0);
		colorEndAttr.array.fill(0);

		// Mark for update
		startAttr.needsUpdate = true;
		endAttr.needsUpdate = true;
		colorStartAttr.needsUpdate = true;
		colorEndAttr.needsUpdate = true;

		geometry.computeBoundingSphere();
	};

	return {
		applyGeometryAttributes,
		updateGeometryWithXYRGBData,
		resetGeometryData,
		numSegments,
		numPoints,
	};
}
