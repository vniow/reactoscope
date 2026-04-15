
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
	private readonly kernels: Float32Array[];
	readonly outputLength: number;

	constructor(inputLength: number, steps: number) {
		this.steps = steps;
		this.kernels = buildKernels(steps);
		this.outputLength = inputLength * steps + 1;
	}


	apply(input: Float32Array, output: Float32Array): void {
		const n = input.length;
		const { steps, kernels, outputLength } = this;
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
}
