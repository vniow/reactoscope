// Fractional-sample delay line, for the MEMS input shaper.
//
// A zero-vibration shaper places its second impulse half a damped period after
// the first. For a 5500Hz mirror at 48kHz that is 4.36 samples — and rounding
// it to 4 throws away the entire benefit: measured, a rounded shaper settles
// *worse* than no shaper at all, because the residual it leaves has to decay
// through the mirror's own 1.4ms envelope. Sub-sample accuracy is not a
// refinement here, it is the whole mechanism.
//
// Cubic Lagrange interpolation rather than an allpass: FIR, unconditionally
// stable, exact at integer delays, and its error is a gentle high-frequency
// rolloff rather than a phase error — which is the right failure direction for
// a shaper whose job is cancelling one specific frequency.

/** A delay line that can be read back at a non-integer number of samples. */
export interface FractionalDelay {
	/** Pushes one sample in and returns the value `delaySamples` ago. */
	process(x: number): number;
	/** Fills the whole line with `value`, as if it had been constant forever. */
	reset(value: number): void;
}

export function createFractionalDelay(delaySamples: number): FractionalDelay {
	// One sample of headroom each side for the cubic's 4-point window.
	const d    = Math.max(0, delaySamples);
	const n    = Math.floor(d);
	const f    = d - n;
	const size = n + 4;

	// Lagrange basis evaluated at p = 1 + f, over sample positions 0..3, which
	// carry delays n-1, n, n+1, n+2. The wanted delay n+f sits at position 1+f.
	const p  = 1 + f;
	const c0 = ((p - 1) * (p - 2) * (p - 3)) / -6;
	const c1 = (p * (p - 2) * (p - 3)) / 2;
	const c2 = (p * (p - 1) * (p - 3)) / -2;
	const c3 = (p * (p - 1) * (p - 2)) / 6;

	const buf = new Float64Array(size);
	let head = 0;

	const at = (back: number): number => buf[(head - back + size * 2) % size];

	return {
		process(x: number): number {
			buf[head] = x;
			// Positions 0..3 are delays n-1 .. n+2 relative to the sample just
			// written, so read back n-1 through n+2.
			const y = c0 * at(n - 1) + c1 * at(n) + c2 * at(n + 1) + c3 * at(n + 2);
			head = (head + 1) % size;
			return y;
		},

		reset(value: number): void {
			buf.fill(value);
			head = 0;
		},
	};
}

/**
 * Zero-vibration (ZV) input shaper coefficients for a resonance at `freq` with
 * damping ratio `zeta`, at `sampleRate`.
 *
 * The shaper splits every command into two impulses whose responses cancel:
 * the second arrives half a damped period later, scaled so its ringing is
 * equal and opposite to what the first left behind. Amplitudes sum to 1, so DC
 * gain is unity and a settled line stays settled.
 */
export function zvShaper(sampleRate: number, freq: number, zeta: number): {
	a1: number;
	a2: number;
	delaySamples: number;
} {
	const z    = Math.min(Math.max(zeta, 0), 0.999);
	const damp = Math.sqrt(1 - z * z);
	const k    = Math.exp((-z * Math.PI) / damp);

	return {
		a1:           1 / (1 + k),
		a2:           k / (1 + k),
		delaySamples: sampleRate / (2 * Math.max(freq, 1e-6) * damp),
	};
}
