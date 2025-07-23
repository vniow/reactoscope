// useWaveformGeometry.ts
// Manages buffer geometry creation and updating for audio waveform visualization
import * as THREE from 'three';
import { useMemo } from 'react';

// Constants
export const NUM_POINTS = 1024;
export const NUM_SEGMENTS = NUM_POINTS - 1;
export const NUM_COMPONENTS = 3; // x, y, z

/**
 * Hook to create and manage buffer geometry for waveform visualization
 */
export function useWaveformGeometry() {
	const [aStart, aEnd, aColor, aIdx, indices] = useMemo(() => {
		const start = new Float32Array(NUM_SEGMENTS * 4 * NUM_COMPONENTS);
		const end = new Float32Array(NUM_SEGMENTS * 4 * NUM_COMPONENTS);
		const color = new Float32Array(NUM_SEGMENTS * 4 * 3); // RGB per vertex
		const idx = new Float32Array(NUM_SEGMENTS * 4);
		const ind = new Uint16Array(NUM_SEGMENTS * 6);

		for (let i = 0; i < NUM_SEGMENTS; i++) {
			const vBase = i * 4;
			idx[vBase + 0] = vBase + 0;
			idx[vBase + 1] = vBase + 1;
			idx[vBase + 2] = vBase + 2;
			idx[vBase + 3] = vBase + 3;

			const iBase = i * 6;
			ind[iBase + 0] = vBase + 0;
			ind[iBase + 1] = vBase + 2;
			ind[iBase + 2] = vBase + 1;
			ind[iBase + 3] = vBase + 1;
			ind[iBase + 4] = vBase + 2;
			ind[iBase + 5] = vBase + 3;
		}
		return [start, end, color, idx, ind];
	}, []);

	/** Apply buffer attributes to a geometry */
	const applyGeometryAttributes = (geometry: THREE.BufferGeometry) => {
		geometry.setAttribute(
			'aStart',
			new THREE.BufferAttribute(aStart, NUM_COMPONENTS)
		);
		geometry.setAttribute(
			'aEnd',
			new THREE.BufferAttribute(aEnd, NUM_COMPONENTS)
		);
		geometry.setAttribute('aColor', new THREE.BufferAttribute(aColor, 3));
		geometry.setAttribute('aIdx', new THREE.BufferAttribute(aIdx, 1));
		geometry.setIndex(new THREE.BufferAttribute(indices, 1));
	};

	/** Update buffer attributes with audio data (supports optional Z channel and per-vertex RGB color) */
	const updateGeometryWithAudioData = (
		geometry: THREE.BufferGeometry,
		dataL: Float32Array,
		dataR: Float32Array,
		audioScale: number,
		dataZ?: Float32Array,
		dataRColor?: Float32Array,
		dataGColor?: Float32Array,
		dataBColor?: Float32Array
	) => {
		const startAttr = geometry.attributes.aStart as THREE.BufferAttribute;
		const endAttr = geometry.attributes.aEnd as THREE.BufferAttribute;
		const colorAttr = geometry.attributes.aColor as THREE.BufferAttribute;

		// Determine if any color channel is missing
		const useDefaultColor = !dataRColor || !dataGColor || !dataBColor;
		// Default green color
		const DEFAULT_R = 0;
		const DEFAULT_G = 1;
		const DEFAULT_B = 0;

		const numSamples = Math.min(
			dataL.length,
			dataR.length,
			dataZ ? dataZ.length : NUM_POINTS,
			dataRColor ? dataRColor.length : NUM_POINTS,
			dataGColor ? dataGColor.length : NUM_POINTS,
			dataBColor ? dataBColor.length : NUM_POINTS,
			NUM_POINTS
		);

		for (let i = 0; i < NUM_SEGMENTS; i++) {
			const vBase = i * 4 * NUM_COMPONENTS;
			const cBase = i * 4 * 3;
			if (i + 1 < numSamples) {
				const p1x = Math.min(Math.max(dataL[i] * audioScale, -1.0), 1.0);
				const p1y = Math.min(Math.max(dataR[i] * audioScale, -1.0), 1.0);
				const p1z = dataZ
					? Math.min(Math.max(dataZ[i] * audioScale, -1.0), 1.0)
					: 0;
				const p2x = Math.min(Math.max(dataL[i + 1] * audioScale, -1.0), 1.0);
				const p2y = Math.min(Math.max(dataR[i + 1] * audioScale, -1.0), 1.0);
				const p2z = dataZ
					? Math.min(Math.max(dataZ[i + 1] * audioScale, -1.0), 1.0)
					: 0;

				let r1, g1, b1, r2, g2, b2;
				if (useDefaultColor) {
					r1 = DEFAULT_R;
					g1 = DEFAULT_G;
					b1 = DEFAULT_B;
					r2 = DEFAULT_R;
					g2 = DEFAULT_G;
					b2 = DEFAULT_B;
				} else {
					r1 = Math.min(Math.max(dataRColor![i], 0), 1);
					g1 = Math.min(Math.max(dataGColor![i], 0), 1);
					b1 = Math.min(Math.max(dataBColor![i], 0), 1);
					r2 = Math.min(Math.max(dataRColor![i + 1], 0), 1);
					g2 = Math.min(Math.max(dataGColor![i + 1], 0), 1);
					b2 = Math.min(Math.max(dataBColor![i + 1], 0), 1);
				}

				for (let j = 0; j < 4; j++) {
					startAttr.array[vBase + j * NUM_COMPONENTS + 0] = p1x;
					startAttr.array[vBase + j * NUM_COMPONENTS + 1] = p1y;
					startAttr.array[vBase + j * NUM_COMPONENTS + 2] = p1z;
					endAttr.array[vBase + j * NUM_COMPONENTS + 0] = p2x;
					endAttr.array[vBase + j * NUM_COMPONENTS + 1] = p2y;
					endAttr.array[vBase + j * NUM_COMPONENTS + 2] = p2z;

					// Assign color for start and end (alternating for each vertex)
					colorAttr.array[cBase + j * 3 + 0] = j < 2 ? r1 : r2;
					colorAttr.array[cBase + j * 3 + 1] = j < 2 ? g1 : g2;
					colorAttr.array[cBase + j * 3 + 2] = j < 2 ? b1 : b2;
				}
			} else {
				for (let j = 0; j < 4; j++) {
					startAttr.array[vBase + j * NUM_COMPONENTS + 0] = 0;
					startAttr.array[vBase + j * NUM_COMPONENTS + 1] = 0;
					startAttr.array[vBase + j * NUM_COMPONENTS + 2] = 0;
					endAttr.array[vBase + j * NUM_COMPONENTS + 0] = 0;
					endAttr.array[vBase + j * NUM_COMPONENTS + 1] = 0;
					endAttr.array[vBase + j * NUM_COMPONENTS + 2] = 0;
					colorAttr.array[cBase + j * 3 + 0] = 0;
					colorAttr.array[cBase + j * 3 + 1] = 0;
					colorAttr.array[cBase + j * 3 + 2] = 0;
				}
			}
		}

		startAttr.needsUpdate = true;
		endAttr.needsUpdate = true;
		colorAttr.needsUpdate = true;
		geometry.computeBoundingSphere();
	};

	/** Reset all geometry data to zero */
	const resetGeometryData = (geometry: THREE.BufferGeometry) => {
		const startAttr = geometry.attributes.aStart as
			| THREE.BufferAttribute
			| undefined;
		const endAttr = geometry.attributes.aEnd as
			| THREE.BufferAttribute
			| undefined;

		if (!startAttr || !endAttr) {
			console.warn(
				'resetGeometryData: geometry missing aStart or aEnd attributes'
			);
			return;
		}

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
