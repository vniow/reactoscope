// Pure-math Quasistatic Model — the MEMS Laser's Scanner Model. See
// docs/mems-laser-emulator.md for the design spec and
// docs/adr/0012-mems-laser-beam-emulator.md for why it has this shape.
// Framework-free, like src/galvo/scannerModel.ts, for the same reason: this is
// the piece whose bugs are invisible by inspection, so it has to be testable.
//
// The chain models the quasistatic drive path of a Mirrorcle-style MEMS driver:
//
//   command ─► amplitude clamp ─► Bessel lowpass ─► high-Q mirror (optional)
//
// Note what is *not* here: a slew-rate clamp. The Galvo Scanner Model needs one
// because a linear filter is scale-invariant and would price a full-scale jump
// as free. Here the band limit already bounds the rate of change, so a second
// constraint on the same quantity would only let two parameters contradict each
// other (ADR-0012, sub-decision 4).

import { besselLowpassSections, type BesselOrder } from '../dsp/bessel';
import { createBiquadSection, rbjLowpass, type BiquadSection } from '../dsp/biquad';
import type { ScannerAxis } from '../dsp/scannerAxis';

export interface QuasistaticParams {
	/**
	 * Bessel corner frequency, in Hz. On real hardware this is set by a clock at
	 * 60x the cutoff — Mirrorcle's worked example is 500Hz (FCLK 30kHz) and
	 * LD_MemsMirror hardcodes 220Hz.
	 */
	cutoff: number;
	/** 5th-order is the MAX7413 in the standard driver; 2nd-order is the documented alternative. */
	filterOrder: BesselOrder;
	/** Normalised deflection ceiling. X/Y run [-1,+1], so 1.0 is no limit. */
	angleLimit: number;
	/** Whether to model the mirror's own mechanical response at all. */
	resonanceEnabled: boolean;
	/** The mirror's mechanical resonance, in Hz. */
	resonanceFreq: number;
	/** Resonance sharpness. ζ = 1/(2Q), so Q=100 is ζ=0.005. */
	resonanceQ: number;
}

export interface QuasistaticAxis extends ScannerAxis {
	/**
	 * How many samples the most recent `process()` call clamped to ±angleLimit.
	 * Feeds the clamped-fraction readout; the renderer treats the axis as a
	 * plain ScannerAxis and ignores this.
	 */
	clampedCount(): number;
}

export function createQuasistaticAxis(
	sampleRate: number,
	params: QuasistaticParams,
): QuasistaticAxis {
	// Same bound and same reasoning as the Galvo Scanner Model's bandwidth cap.
	// besselLowpassSections caps each individual section too, since its section
	// frequencies sit above the cutoff.
	const cutoff = Math.min(params.cutoff, sampleRate / 4);

	const stages: BiquadSection[] = besselLowpassSections(
		sampleRate,
		cutoff,
		params.filterOrder,
	).map(createBiquadSection);

	// The mirror itself: the same RBJ second-order lowpass the galvo uses, at a
	// damping ratio far below anything physical for a servo. That is the whole
	// difference between the two devices expressed as one number.
	if (params.resonanceEnabled) {
		const q     = Math.max(params.resonanceQ, 0.5);
		const freq  = Math.min(params.resonanceFreq, sampleRate / 4);
		const zeta  = 1 / (2 * q);
		stages.push(createBiquadSection(rbjLowpass(sampleRate, freq, zeta)));
	}

	const limit = Math.abs(params.angleLimit);

	let clamped = 0;

	return {
		process(input: Float32Array): Float32Array {
			const out = new Float32Array(input.length);
			clamped = 0;

			for (let n = 0; n < input.length; n++) {
				// The clamp sits on the *command*, ahead of the filter, because on
				// real hardware the limit is on drive voltage — it models a driver
				// that refuses to ask for an unsafe angle, not a mirror physically
				// prevented from reaching one (ADR-0012, sub-decision 4).
				let v = input[n];
				if (v > limit)       { v = limit;  clamped++; }
				else if (v < -limit) { v = -limit; clamped++; }

				for (let s = 0; s < stages.length; s++) v = stages[s].process(v);

				out[n] = v;
			}
			return out;
		},

		reset(value: number): void {
			// Warm-start, never zero — same contract as the galvo axis. Every
			// section has unity DC gain, so a cascade settled at `value` has all
			// of its histories equal to it.
			const settled = Math.min(Math.max(value, -limit), limit);
			for (const s of stages) s.reset(settled);
		},

		clampedCount(): number {
			return clamped;
		},
	};
}
