// lanczosSmoothing.ts
// Utility for generating a Lanczos kernel and smoothing audio data

/**
 * Generate a Lanczos kernel for smoothing.
 * @param size Number of kernel elements (should be odd, e.g., 33)
 * @param a Lanczos parameter (window width, e.g., 1.5 or 2)
 */
export function createLanczosKernel(size: number, a: number): Float32Array {
	const kernel = new Float32Array(size);
	const center = Math.floor(size / 2);
	let sum = 0;
	for (let i = 0; i < size; i++) {
		const x = (i - center) / a;
		let value: number;
		if (x === 0) {
			value = 1;
		} else if (Math.abs(x) < 1) {
			value =
				(a * Math.sin(Math.PI * x) * Math.sin((Math.PI * x) / a)) /
				(Math.PI * Math.PI * x * x);
		} else {
			value = 0;
		}
		kernel[i] = value;
		sum += value;
	}
	// Normalize kernel
	for (let i = 0; i < size; i++) {
		kernel[i] /= sum;
	}
	return kernel;
}

/**
 * Apply smoothing to a Float32Array using the given kernel.
 * @param samples Input audio data
 * @param kernel Lanczos kernel
 * @returns Smoothed audio data
 */
export function smoothSamples(
	samples: Float32Array,
	kernel: Float32Array
): Float32Array {
	const out = new Float32Array(samples.length);
	const kLen = kernel.length;
	const kHalf = Math.floor(kLen / 2);
	for (let i = 0; i < samples.length; i++) {
		let acc = 0;
		for (let j = 0; j < kLen; j++) {
			const idx = i + j - kHalf;
			if (idx >= 0 && idx < samples.length) {
				acc += samples[idx] * kernel[j];
			}
		}
		out[i] = acc;
	}
	return out;
}
