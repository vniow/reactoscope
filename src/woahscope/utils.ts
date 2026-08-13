/**
 * Pure utility functions for Woscope visualization
 *
 * Stateless, pure functions for geometric calculations, array operations,
 * and colour conversions. No side effects or dependencies on global state.
 *
 * @module woscope/utils
 */

/**
 * Convert a hue angle (0–359°) to the phosphor RGB triple used by the shaders.
 *
 * Uses sqrt interpolation between primary colours so brightness is perceptually
 * even across the full range.
 *
 * @param hue - Hue angle in degrees [0, 359]
 * @returns [r, g, b] each in [0, 1]
 */
export function getColourFromHue(hue: number): [number, number, number] {
	const alpha = (hue / 120.0) % 1.0;
	const start = Math.sqrt(1.0 - alpha);
	const end = Math.sqrt(alpha);
	if (hue < 120) return [start, end, 0.0];
	if (hue < 240) return [0.0, start, end];
	return [end, 0.0, start];
}

/**
 * Convert a hue angle to a fully-saturated hex colour string.
 *
 * Standard HSL (s=100%, l=50%) — used to seed `<input type="color">`.
 *
 * @param hue - Hue angle in degrees [0, 360)
 * @returns Hex string e.g. "#22dd00"
 */
export function hueToHex(hue: number): string {
	const h = ((hue % 360) + 360) % 360;
	const a = 0.5;
	const f = (n: number) => {
		const k = (n + h / 30) % 12;
		const value = 0.5 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
		return Math.round(value * 255).toString(16).padStart(2, '0');
	};
	return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Extract the hue angle from a hex colour string.
 *
 * @param hex - Hex colour string e.g. "#22dd00"
 * @returns Hue angle in degrees [0, 360)
 */
export function hexToHue(hex: string): number {
	const r = parseInt(hex.slice(1, 3), 16) / 255;
	const g = parseInt(hex.slice(3, 5), 16) / 255;
	const b = parseInt(hex.slice(5, 7), 16) / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const d = max - min;
	if (d === 0) return 0;
	let h = 0;
	switch (max) {
		case r: h = ((g - b) / d + 6) % 6; break;
		case g: h = (b - r) / d + 2; break;
		default: h = (r - g) / d + 4;
	}
	return Math.round(h * 60);
}

/**
 * Create a vertex index array for line-segment quad geometry.
 *
 * Each sample becomes a quad (4 vertices) rendered as 2 triangles (6 indices).
 *
 * @param nSamples - Number of samples
 * @returns Index array for BufferGeometry
 */
export function makeVertexIndexArray(nSamples: number): Uint32Array {
	const len = (nSamples - 1) * 2 * 3;
	const index = new Uint32Array(len);
	for (let i = 0, pos = 0; i < len; ) {
		index[i++] = pos;
		index[i++] = pos + 2;
		index[i++] = pos + 1;
		index[i++] = pos + 1;
		index[i++] = pos + 2;
		index[i++] = pos + 3;
		pos += 4;
	}
	return index;
}

/**
 * Fill vertex attribute arrays from two audio-sample channels.
 *
 * Each sample generates a 4-vertex quad segment (aStart → aEnd).
 *
 * @param len       - Number of samples
 * @param aIdxArray - Vertex index attribute array
 * @param startArray - aStart attribute array (2 floats per vertex)
 * @param endArray   - aEnd attribute array (2 floats per vertex)
 * @param xAxis     - X-axis audio data
 * @param yAxis     - Y-axis audio data
 */
export function updateGeometryArrays(
	len: number,
	aIdxArray: Float32Array,
	startArray: Float32Array,
	endArray: Float32Array,
	xAxis: Float32Array,
	yAxis: Float32Array,
): void {
	const vertsPerSample = 4;

	for (let i = 0; i < len; i++) {
		const x = xAxis[i];
		const y = yAxis[i];
		const base = i * vertsPerSample * 2;
		for (let v = 0; v < vertsPerSample; v++) {
			const off = base + v * 2;
			startArray[off]     = x;
			startArray[off + 1] = y;
		}
	}

	for (let i = 0; i < len; i++) {
		const j = i + 1 < len ? i + 1 : i;
		const x = xAxis[j];
		const y = yAxis[j];
		const base = i * vertsPerSample * 2;
		for (let v = 0; v < vertsPerSample; v++) {
			const off = base + v * 2;
			endArray[off]     = x;
			endArray[off + 1] = y;
		}
	}

	for (let i = 0; i < len; i++) {
		const base = i * vertsPerSample;
		aIdxArray[base]     = base;
		aIdxArray[base + 1] = base + 1;
		aIdxArray[base + 2] = base + 2;
		aIdxArray[base + 3] = base + 3;
	}
}
