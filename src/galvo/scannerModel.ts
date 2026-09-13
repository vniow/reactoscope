// Pure-math Scanner Model — see docs/galvo-laser-emulator.md for the design
// spec and docs/adr/0010-galvo-laser-beam-emulator.md for why it exists.
// Deliberately framework-free: no React, no THREE, so it can be tested and
// reasoned about in isolation from the renderer that drives it.

import { rbjLowpass } from '../dsp/biquad';
import type { ScannerAxis } from '../dsp/scannerAxis';

// ScannerAxis moved to src/dsp/ when the MEMS Quasistatic Model became a second
// implementation of it (ADR-0012, sub-decision 6). Re-exported here so existing
// imports from this module keep working.
export type { ScannerAxis };

export interface ScannerParams {
	/** Natural frequency f0, in Hz. */
	bandwidth: number;
	/** Damping ratio ζ. <1 rings, 1 is critical, >1 is sluggish. */
	damping: number;
	/** Maximum position change per second, in the same units as the signal. */
	slewLimit: number;
}

export function createScannerAxis(sampleRate: number, params: ScannerParams): ScannerAxis {
	// Clamp the bandwidth actually used for the coefficients, not just document
	// the bound: past fs/4, the RBJ formulas can produce poles outside the unit
	// circle — a genuinely unstable filter, not merely an inaccurate one
	// (confirmed: 40kHz at 48kHz/damping 0.7 gives a pole magnitude of ~2.02).
	// A scanner with bandwidth anywhere near half the audio rate is unphysical
	// anyway, so silently capping here is correct, not a compromise.
	const bandwidth = Math.min(params.bandwidth, sampleRate / 4);

	// Coefficients come from src/dsp/biquad.ts, shared with the MEMS model's
	// resonator stage. This axis keeps its own recurrence rather than using
	// createBiquadSection because the slew clamp has to sit *inside* the loop,
	// between the filter output and the state write-back.
	const { b0, b1, b2, a1, a2 } = rbjLowpass(sampleRate, bandwidth, params.damping);

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
