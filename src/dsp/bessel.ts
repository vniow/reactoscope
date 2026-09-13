// Bessel lowpass section factory for the MEMS Quasistatic Model.
//
// Why Bessel and not Butterworth: maximally flat *group delay*. Every frequency
// component is delayed by the same amount, so a drawn figure is delayed
// uniformly rather than reshaped — corners soften instead of overshooting.
// That is the observable difference from the Galvo Scanner Model's resonant
// servo, and picking a different prototype would erase it.
// See docs/adr/0012-mems-laser-beam-emulator.md, sub-decision 3.
//
// The hardware being modelled is a MAX7413: a clock-tuned 5th-order Bessel in
// the Mirrorcle driver's signal path, cutoff = FCLK / 60. Mirrorcle documents a
// 2nd-order continuous-time alternative, hence both orders here.

import { bilinearOnePole, rbjLowpass, type BiquadCoeffs } from './biquad';

export type BesselOrder = 2 | 5;

interface PolePair {
	/** Section natural frequency, as a ratio of the filter's -3dB cutoff. */
	f0Ratio: number;
	/** Section damping ratio ζ. */
	zeta: number;
}

interface BesselPrototype {
	pairs: PolePair[];
	/** The single real pole of an odd-order filter, as a ratio of the cutoff. */
	realRatio?: number;
	/**
	 * The factor the delay-normalised poles were divided by to put the -3dB
	 * point at ω = 1. Not used to build sections — it is here so the tests can
	 * reconstruct the reverse Bessel polynomial from these constants and check
	 * it against its exact integer coefficients.
	 */
	threeDbScale: number;
}

// These constants are *derived*, not copied from a table. The reverse Bessel
// polynomial theta_n(s) has exact integer coefficients
//     a_k = (2n-k)! / (2^(n-k) * k! * (n-k)!)
// giving theta_2 = s² + 3s + 3 and theta_5 = s⁵ + 15s⁴ + 105s³ + 420s² + 945s + 945.
// Its roots, rescaled so |H(j1)| = 1/sqrt(2), are the values below.
// bessel.test.ts reverses that derivation and asserts the polynomial comes back
// exactly, so a typo here fails a test rather than quietly bending the response.
const PROTOTYPES: Record<BesselOrder, BesselPrototype> = {
	2: {
		threeDbScale: 1.361654128716,
		pairs: [
			{ f0Ratio: 1.272019649514069, zeta: 0.866025403784439 },
		],
	},
	5: {
		threeDbScale: 2.427410702153,
		pairs: [
			{ f0Ratio: 1.556347122296924, zeta: 0.887255359731370 },
			{ f0Ratio: 1.755377776637098, zeta: 0.545567205708490 },
		],
		realRatio: 1.502316271447478,
	},
};

/** Exposed for tests only — the pole constants they verify against theta_n. */
export function besselPrototype(order: BesselOrder): Readonly<BesselPrototype> {
	return PROTOTYPES[order];
}

/**
 * Biquad sections realising a Bessel lowpass with its -3dB point at `cutoff`.
 * Order 2 is a single pair; order 5 is two pairs plus a real pole.
 *
 * Section frequencies sit *above* the cutoff (ratios run to ~1.76), so each one
 * is capped at `sampleRate / 4` independently rather than relying on a cap
 * applied to `cutoff` alone. In the range the UI actually offers this never
 * binds — 5000 Hz at 48 kHz puts the highest section at 8777 Hz against a
 * 12000 Hz cap — but a filter that silently goes unstable off the end of a
 * slider is not worth the two comparisons saved.
 */
export function besselLowpassSections(
	sampleRate: number,
	cutoff: number,
	order: BesselOrder,
): BiquadCoeffs[] {
	const proto    = PROTOTYPES[order];
	const maxF0    = sampleRate / 4;
	const sections = proto.pairs.map((p) =>
		rbjLowpass(sampleRate, Math.min(p.f0Ratio * cutoff, maxF0), p.zeta),
	);

	if (proto.realRatio !== undefined) {
		sections.push(bilinearOnePole(sampleRate, Math.min(proto.realRatio * cutoff, maxF0)));
	}

	return sections;
}
