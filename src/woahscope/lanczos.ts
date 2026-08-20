
const LANCZOS_A = 8;

function sinc(x: number): number {
	if (x === 0) return 1;
	const px = Math.PI * x;
	return Math.sin(px) / px;
}

function lanczosWeight(x: number): number {
	const ax = Math.abs(x);
	if (ax >= LANCZOS_A) return 0;
	return sinc(x) * sinc(x / LANCZOS_A);
}


function buildKernels(steps: number): Float32Array[] {
	const kernels: Float32Array[] = [];
	for (let p = 0; p < steps; p++) {
		const frac = p / steps;
		const kernel = new Float32Array(2 * LANCZOS_A);
		let sum = 0;
		for (let k = 0; k < 2 * LANCZOS_A; k++) {
			const x = k - (LANCZOS_A - 1) - frac;
			const w = lanczosWeight(x);
			kernel[k] = w;
			sum += w;
		}
		if (sum !== 0) {
			for (let k = 0; k < 2 * LANCZOS_A; k++) kernel[k] /= sum;
		}
		kernels.push(kernel);
	}
	return kernels;
}

export class LanczosUpsampler {
	private readonly steps: number;
	private kernels: Float32Array[] | null;
	readonly outputLength: number;

	constructor(inputLength: number, steps: number) {
		this.steps = steps;
		this.kernels = buildKernels(steps);
		this.outputLength = inputLength * steps + 1;
	}

	/** Releases the precomputed kernel tables. Safe to call more than once. */
	dispose(): void {
		this.kernels = null;
	}

	apply(input: Float32Array, output: Float32Array): void {
		const { steps, kernels, outputLength } = this;
		if (!kernels) return; // disposed
		const n = input.length;
		for (let j = 0; j < outputLength; j++) {
			const i0 = (j / steps) | 0;
			const p  = j % steps;
			const kernel = kernels[p];
			let val = 0;
			for (let k = 0; k < 2 * LANCZOS_A; k++) {
				const idx = Math.min(Math.max(i0 + k - (LANCZOS_A - 1), 0), n - 1);
				val += kernel[k] * input[idx];
			}
			output[j] = val;
		}
	}

	/**
	 * Same output indexing as apply(), but takes the min of only the two raw
	 * samples immediately bracketing each output position — not the full
	 * kernel-support window apply() uses. Alpha represents a hard binary gate
	 * (blanked beam travel vs. visible), not a continuous quantity, so it
	 * needs "which two real samples does this output position fall between"
	 * (same principle as the worklet and per-segment fixes), not the wide
	 * neighbourhood apply()'s sinc reconstruction needs — using the full
	 * 2*LANCZOS_A window here over-corrected: every shared-vertex corner
	 * carries at least one (zero-distance) blank point by construction
	 * (buildCoordBuffer's `Math.max(1, ...)` floor), and bleeding blank
	 * across a 16-sample window from that single point ate real edge pixels
	 * on both sides of every corner, showing up as a gap.
	 */
	applyMin(input: Float32Array, output: Float32Array): void {
		const { steps, outputLength } = this;
		const n = input.length;
		for (let j = 0; j < outputLength; j++) {
			const i0 = (j / steps) | 0;
			const i1 = Math.min(i0 + 1, n - 1);
			output[j] = Math.min(input[i0], input[i1]);
		}
	}
}
