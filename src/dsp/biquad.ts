// Shared biquad primitives. Pure math, framework-free, used by both Scanner
// Models: the Galvo one (src/galvo/scannerModel.ts) runs a single RBJ lowpass
// with a slew clamp welded into its recurrence, and the MEMS Quasistatic Model
// (src/mems/quasistaticModel.ts) cascades several of these.
//
// The MEMS mechanical resonator is this same RBJ lowpass at very high Q — it is
// a reuse rather than new math, which is the reason this file exists at all.
// See docs/adr/0012-mems-laser-beam-emulator.md, sub-decision 5.

/** Biquad coefficients, already normalised by a0 so the recurrence never divides. */
export interface BiquadCoeffs {
	b0: number;
	b1: number;
	b2: number;
	a1: number;
	a2: number;
}

/**
 * RBJ cookbook lowpass at `f0` with damping ratio ζ (`damping`).
 *
 * This is the bilinear transform of the analog second-order lowpass
 * `ω0² / (s² + 2ζω0·s + ω0²)`, with the transform's frequency warping already
 * pre-compensated by RBJ's use of sin/cos of ω0 — so `f0` lands where asked.
 *
 * Callers are responsible for keeping `f0` below `sampleRate / 4`: past that
 * these formulas can produce poles outside the unit circle (40kHz at
 * 48kHz/ζ=0.7 gives a pole magnitude of ~2.02 — genuinely unstable, not merely
 * inaccurate).
 */
export function rbjLowpass(sampleRate: number, f0: number, damping: number): BiquadCoeffs {
	const omega0 = (2 * Math.PI * f0) / sampleRate;
	const Q      = 1 / (2 * damping);
	const alpha  = Math.sin(omega0) / (2 * Q);
	const cosW0  = Math.cos(omega0);

	const a0 = 1 + alpha;

	return {
		b0: (1 - cosW0) / 2 / a0,
		b1: (1 - cosW0)     / a0,
		b2: (1 - cosW0) / 2 / a0,
		a1: (-2 * cosW0)    / a0,
		a2: (1 - alpha)     / a0,
	};
}

/**
 * Bilinear-transformed one-pole lowpass at `f0`, expressed as a biquad with
 * its second-order terms zeroed so it can sit in the same cascade as the pairs.
 *
 * Odd-order filters have one real pole; this is how it gets represented without
 * introducing a second section type. The two wasted multiplies per sample are
 * worth the single code path.
 */
export function bilinearOnePole(sampleRate: number, f0: number): BiquadCoeffs {
	// Prewarped so f0 lands where asked, matching rbjLowpass's behaviour.
	const k = Math.tan((Math.PI * f0) / sampleRate);
	const n = k / (1 + k);

	return {
		b0: n,
		b1: n,
		b2: 0,
		a1: (k - 1) / (1 + k),
		a2: 0,
	};
}

/** One stateful Direct Form I biquad section. */
export interface BiquadSection {
	process(x: number): number;
	reset(value: number): void;
}

export function createBiquadSection(c: BiquadCoeffs): BiquadSection {
	const { b0, b1, b2, a1, a2 } = c;
	let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

	return {
		process(x0: number): number {
			const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
			x2 = x1; x1 = x0;
			y2 = y1; y1 = y0;
			return y0;
		},

		// Every section built here has unity DC gain, so a settled section
		// sitting at `value` has all four history slots equal to it. That makes
		// warm-starting a cascade just as correct as warm-starting one section.
		reset(value: number): void {
			x1 = x2 = y1 = y2 = value;
		},
	};
}
