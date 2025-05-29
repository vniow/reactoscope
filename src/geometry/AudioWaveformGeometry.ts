/**
 * AudioWaveformGeometry.ts
 * Manages buffer geometry creation and updating for audio waveform visualization
 */
import * as THREE from 'three';
import { useMemo } from 'react';

// Constants
export const NUM_POINTS = 1024; // Number of samples from analyser
export const NUM_SEGMENTS = NUM_POINTS - 1;

/**
 * Hook to create and manage buffer geometry for waveform visualization
 */
export function useWaveformGeometry() {
	// Create the buffer attributes
	const [aStart, aEnd, aIdx, indices] = useMemo(() => {
		const start = new Float32Array(NUM_SEGMENTS * 4 * 2); // 4 vertices per segment, 2 components (x,y)
		const end = new Float32Array(NUM_SEGMENTS * 4 * 2);
		const idx = new Float32Array(NUM_SEGMENTS * 4); // 4 vertices, 1 component
		const ind = new Uint16Array(NUM_SEGMENTS * 6); // 6 indices per segment (2 triangles)

		for (let i = 0; i < NUM_SEGMENTS; i++) {
			const vBase = i * 4; // Base vertex index for this segment's quad
			// Set aIdx for the 4 vertices of this segment's quad
			idx[vBase + 0] = vBase + 0;
			idx[vBase + 1] = vBase + 1;
			idx[vBase + 2] = vBase + 2;
			idx[vBase + 3] = vBase + 3;

			// Set indices for the two triangles of this segment's quad
			// V0, V1, V2, V3 for the quad
			// Tri 1: V0, V2, V1
			// Tri 2: V1, V2, V3
			const iBase = i * 6;
			ind[iBase + 0] = vBase + 0;
			ind[iBase + 1] = vBase + 2;
			ind[iBase + 2] = vBase + 1;
			ind[iBase + 3] = vBase + 1;
			ind[iBase + 4] = vBase + 2;
			ind[iBase + 5] = vBase + 3;
		}
		return [start, end, idx, ind];
	}, []);

	/**
	 * Apply buffer attributes to a geometry
	 */
	const applyGeometryAttributes = (geometry: THREE.BufferGeometry) => {
		geometry.setAttribute('aStart', new THREE.BufferAttribute(aStart, 2));
		geometry.setAttribute('aEnd', new THREE.BufferAttribute(aEnd, 2));
		geometry.setAttribute('aIdx', new THREE.BufferAttribute(aIdx, 1));
		geometry.setIndex(new THREE.BufferAttribute(indices, 1));
	};

	/**
	 * Update buffer attributes with audio data
	 */
	const updateGeometryWithAudioData = (
		geometry: THREE.BufferGeometry,
		dataL: Float32Array,
		dataR: Float32Array,
		audioScale: number
	) => {
		const startAttr = geometry.attributes.aStart as THREE.BufferAttribute;
		const endAttr = geometry.attributes.aEnd as THREE.BufferAttribute;

		const numSamples = Math.min(dataL.length, dataR.length, NUM_POINTS);

		for (let i = 0; i < NUM_SEGMENTS; i++) {
			if (i + 1 < numSamples) {
				// Use audioScale and clamp values to avoid extreme values
				const p1x = Math.min(Math.max(dataL[i] * audioScale, -1.0), 1.0);
				const p1y = Math.min(Math.max(dataR[i] * audioScale, -1.0), 1.0);
				const p2x = Math.min(Math.max(dataL[i + 1] * audioScale, -1.0), 1.0);
				const p2y = Math.min(Math.max(dataR[i + 1] * audioScale, -1.0), 1.0);

				const vBase = i * 4 * 2; // Base for xy components (2 per vertex)
				for (let j = 0; j < 4; j++) {
					// For each of the 4 vertices of the quad
					startAttr.array[vBase + j * 2 + 0] = p1x;
					startAttr.array[vBase + j * 2 + 1] = p1y;
					endAttr.array[vBase + j * 2 + 0] = p2x;
					endAttr.array[vBase + j * 2 + 1] = p2y;
				}
			} else {
				// If not enough data for this segment, zero it out
				const vBase = i * 4 * 2;
				for (let j = 0; j < 4; j++) {
					startAttr.array[vBase + j * 2 + 0] = 0;
					startAttr.array[vBase + j * 2 + 1] = 0;
					endAttr.array[vBase + j * 2 + 0] = 0;
					endAttr.array[vBase + j * 2 + 1] = 0;
				}
			}
		}

		startAttr.needsUpdate = true;
		endAttr.needsUpdate = true;

		// Update bounding sphere for proper culling if not bypassed
		geometry.computeBoundingSphere();
	};

	/**
	 * Reset all geometry data to zero (for pause state)
	 */
	const resetGeometryData = (geometry: THREE.BufferGeometry) => {
		const startAttr = geometry.attributes.aStart as
			| THREE.BufferAttribute
			| undefined;
		const endAttr = geometry.attributes.aEnd as
			| THREE.BufferAttribute
			| undefined;

		if (!startAttr || !endAttr || !startAttr.array || !endAttr.array) {
			// Attributes not set yet, nothing to reset
			return;
		}

		// Clear geometry data when not playing
		for (let i = 0; i < NUM_SEGMENTS * 4 * 2; i++) {
			startAttr.array[i] = 0;
			endAttr.array[i] = 0;
		}

		startAttr.needsUpdate = true;
		endAttr.needsUpdate = true;

		geometry.computeBoundingSphere();
	};

	return {
		applyGeometryAttributes,
		updateGeometryWithAudioData,
		resetGeometryData,
	};
}
