// Pure-math Scanner Model — see docs/galvo-laser-emulator.md for the design
// spec and docs/adr/0010-galvo-laser-beam-emulator.md for why it exists.
// Deliberately framework-free: no React, no THREE, so it can be tested and
// reasoned about in isolation from the renderer that will eventually drive it.

export interface ScannerParams {
	/** Natural frequency f0, in Hz. */
	bandwidth: number;
	/** Damping ratio ζ. <1 rings, 1 is critical, >1 is sluggish. */
	damping: number;
	/** Maximum position change per second, in the same units as the signal. */
	slewLimit: number;
}

export interface ScannerAxis {
	/** Runs the filter over a buffer, carrying state from the previous call. */
	process(input: Float32Array): Float32Array;
	/**
	 * Warm-starts all internal history to `value`, as if the axis had been
	 * sitting at rest there. Call this whenever the caller detects a
	 * discontinuity in its input (see ADR-0010, sub-decision 3) — never
	 * zero the state instead, or a gap fabricates a full-scale slew from
	 * the origin that never actually happened.
	 */
	reset(value: number): void;
}

export function createScannerAxis(sampleRate: number, params: ScannerParams): ScannerAxis {
	const { damping } = params;

	// Clamp the bandwidth actually used for the coefficients, not just document
	// the bound: past fs/4, the RBJ formulas below can produce poles outside
	// the unit circle — a genuinely unstable filter, not merely an inaccurate
	// one (confirmed: 40kHz at 48kHz/damping 0.7 gives a pole magnitude of
	// ~2.02). A scanner with bandwidth anywhere near half the audio rate is
	// unphysical anyway, so silently capping here is correct, not a compromise.
	const bandwidth = Math.min(params.bandwidth, sampleRate / 4);

	// RBJ cookbook biquad lowpass, normalised by a0 so the recurrence below
	// doesn't need to divide per sample.
	const omega0 = (2 * Math.PI * bandwidth) / sampleRate;
	const Q      = 1 / (2 * damping);
	const alpha  = Math.sin(omega0) / (2 * Q);
	const cosW0  = Math.cos(omega0);

	const a0 = 1 + alpha;
	const b0 = (1 - cosW0) / 2 / a0;
	const b1 = (1 - cosW0)     / a0;
	const b2 = (1 - cosW0) / 2 / a0;
	const a1 = (-2 * cosW0)    / a0;
	const a2 = (1 - alpha)     / a0;

	const deltaMax = params.slewLimit / sampleRate;

	let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

	return {
		process(input: Float32Array): Float32Array {
			const out = new Float32Array(input.length);
			for (let n = 0; n < input.length; n++) {
				const x0 = input[n];
				let y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;

				// Slew clamp: a real scanner has a maximum speed regardless of what
				// the linear filter above "wants" to do. The clamped value — not
				// the filter's raw output — is what gets fed back as y1 below, or
				// the filter's own history disagrees with what was actually
				// rendered on the very next sample (see ADR-0010, sub-decision 2).
				if (y0 > y1 + deltaMax)      y0 = y1 + deltaMax;
				else if (y0 < y1 - deltaMax) y0 = y1 - deltaMax;

				x2 = x1; x1 = x0;
				y2 = y1; y1 = y0;
				out[n] = y0;
			}
			return out;
		},

		reset(value: number): void {
			x1 = x2 = y1 = y2 = value;
		},
	};
}
