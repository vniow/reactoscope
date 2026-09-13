import { describe, expect, it } from 'vitest';

import { besselLowpassSections, besselPrototype, type BesselOrder } from './bessel';
import { createBiquadSection, type BiquadCoeffs } from './biquad';

const sampleRate = 48000;

/** Runs a cascade over a buffer, sample by sample, sections in series. */
function runCascade(sections: BiquadCoeffs[], input: Float32Array): Float32Array {
	const stages = sections.map(createBiquadSection);
	const out    = new Float32Array(input.length);

	for (let n = 0; n < input.length; n++) {
		let v = input[n];
		for (const s of stages) v = s.process(v);
		out[n] = v;
	}
	return out;
}

/**
 * Exact complex frequency response of a cascade at `freq`.
 * Phase is summed per section rather than taken from the product, which keeps
 * it unwrapped — each lowpass section's own phase stays well inside (-π, 0].
 */
function responseAt(sections: BiquadCoeffs[], freq: number): { mag: number; phase: number } {
	const w  = (2 * Math.PI * freq) / sampleRate;
	const c1 = Math.cos(-w),     s1 = Math.sin(-w);
	const c2 = Math.cos(-2 * w), s2 = Math.sin(-2 * w);

	let mag = 1, phase = 0;

	for (const { b0, b1, b2, a1, a2 } of sections) {
		const nRe = b0 + b1 * c1 + b2 * c2;
		const nIm =      b1 * s1 + b2 * s2;
		const dRe = 1  + a1 * c1 + a2 * c2;
		const dIm =      a1 * s1 + a2 * s2;

		mag   *= Math.hypot(nRe, nIm) / Math.hypot(dRe, dIm);
		phase += Math.atan2(nIm, nRe) - Math.atan2(dIm, dRe);
	}
	return { mag, phase };
}

/** Group delay in samples, by central difference of the phase response. */
function groupDelay(sections: BiquadCoeffs[], freq: number): number {
	const h  = 0.5;
	const p1 = responseAt(sections, freq - h).phase;
	const p2 = responseAt(sections, freq + h).phase;
	return -(p2 - p1) / ((2 * Math.PI * (2 * h)) / sampleRate);
}

function dbPerOctave(sections: BiquadCoeffs[], f1: number, f2: number): number {
	const g1 = responseAt(sections, f1).mag;
	const g2 = responseAt(sections, f2).mag;
	return (20 * Math.log10(g2 / g1)) / Math.log2(f2 / f1);
}

function factorial(n: number): number {
	let r = 1;
	for (let i = 2; i <= n; i++) r *= i;
	return r;
}

/**
 * Coefficients of the reverse Bessel polynomial theta_n(s), increasing power.
 *   a_k = (2n-k)! / (2^(n-k) * k! * (n-k)!)
 * These are exact integers and come from the definition of the polynomial, so
 * they are genuinely independent of anything in bessel.ts.
 */
function thetaCoeffs(n: number): number[] {
	const out: number[] = [];
	for (let k = 0; k <= n; k++) {
		out.push(factorial(2 * n - k) / (2 ** (n - k) * factorial(k) * factorial(n - k)));
	}
	return out;
}

/** Multiplies two polynomials given in increasing-power coefficient order. */
function polyMul(a: number[], b: number[]): number[] {
	const out = new Array<number>(a.length + b.length - 1).fill(0);
	for (let i = 0; i < a.length; i++) {
		for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j];
	}
	return out;
}

describe('besselLowpassSections', () => {
	// The strongest check available: undo the -3dB normalisation on the stored
	// pole constants, expand the monic polynomial whose roots they are, and
	// require it to be theta_n exactly. A conjugate pair (-ζωn ± jωn√(1-ζ²))
	// contributes the real quadratic s² + 2ζωn·s + ωn², so this needs no complex
	// arithmetic. A single mistyped digit in bessel.ts fails here.
	it.each([2, 5] as BesselOrder[])(
		'order %i pole constants are the roots of the reverse Bessel polynomial',
		(order) => {
			const proto = besselPrototype(order);
			let poly: number[] = [1];

			for (const { f0Ratio, zeta } of proto.pairs) {
				const wn = f0Ratio * proto.threeDbScale;
				poly = polyMul(poly, [wn * wn, 2 * zeta * wn, 1]);
			}
			if (proto.realRatio !== undefined) {
				poly = polyMul(poly, [proto.realRatio * proto.threeDbScale, 1]);
			}

			const expected = thetaCoeffs(order);
			expect(poly.length).toBe(expected.length);

			// The stored constants carry ~13 significant figures, and expanding a
			// 5th-order product accumulates a little of that; 1e-8 relative is far
			// tighter than any plausible transcription error and far looser than
			// the float noise.
			poly.forEach((c, i) => {
				expect(Math.abs(c - expected[i]) / expected[i]).toBeLessThan(1e-8);
			});
		},
	);

	it.each([2, 5] as BesselOrder[])('order %i passes DC at unity gain', (order) => {
		const sections = besselLowpassSections(sampleRate, 500, order);
		const out      = runCascade(sections, new Float32Array(8000).fill(1));
		expect(out[out.length - 1]).toBeCloseTo(1, 9);
	});

	// What "3dB-normalised poles" means, stated as a test.
	it.each([2, 5] as BesselOrder[])('order %i is -3dB at the configured cutoff', (order) => {
		const cutoff   = 500;
		const sections = besselLowpassSections(sampleRate, cutoff, order);
		// 1e-3 rather than something tighter because each section is prewarped at
		// its own f0, so the cascade's -3dB point drifts slightly with cutoff/fs.
		// Measured error here is 2.4e-4; at cutoff 2000 it grows to 3.9e-3, which
		// is why this is pinned at a cutoff in the range the device actually uses.
		expect(responseAt(sections, cutoff).mag).toBeCloseTo(Math.SQRT1_2, 3);
	});

	it.each([
		[2 as BesselOrder, -12],
		[5 as BesselOrder, -30],
	])('order %i rolls off at about %i dB/octave', (order, ideal) => {
		// Measured with a low cutoff so the 8x-16x band sits well clear of Nyquist.
		// Bilinear warping steepens the apparent slope as the measurement band
		// approaches fs/2 — the same artifact scannerModel.test.ts documents — so
		// at cutoff 500 this would read -13.3 and -33.2 instead.
		const sections = besselLowpassSections(sampleRate, 100, order);
		expect(dbPerOctave(sections, 800, 1600)).toBeCloseTo(ideal, 0);
	});

	// The defining property of a Bessel, and the reason it is used here at all.
	it('order 5 has flat group delay across the passband', () => {
		const cutoff   = 500;
		const sections = besselLowpassSections(sampleRate, cutoff, 5);

		const lo = groupDelay(sections, cutoff * 0.25);
		const hi = groupDelay(sections, cutoff * 0.75);

		// Measured spread is 0.017%. A 5th-order Butterworth at the same cutoff
		// spreads 36.8% across the identical band, so 1% both passes comfortably
		// and fails loudly if the prototype is ever swapped.
		expect(Math.abs(hi - lo) / lo).toBeLessThan(0.01);
	});

	// Linear phase means corners soften rather than overshoot. This is the
	// property the MEMS view is built to show, so it is pinned here.
	it.each([2, 5] as BesselOrder[])('order %i barely overshoots a step', (order) => {
		const sections = besselLowpassSections(sampleRate, 500, order);
		const out      = runCascade(sections, new Float32Array(4000).fill(1));
		const peak     = out.reduce((m, v) => Math.max(m, v), 0);

		// Measured: 0.44% at order 2, 0.79% at order 5. A 5th-order Butterworth
		// overshoots 12.8%, so this threshold discriminates decisively.
		expect(peak).toBeLessThan(1.015);
	});

	it.each([2, 5] as BesselOrder[])('order %i stays bounded at the section cap', (order) => {
		// Every section frequency is capped at fs/4 individually; drive the
		// cascade at Nyquist to confirm nothing runs away there.
		const sections = besselLowpassSections(sampleRate, sampleRate / 4, order);
		const input    = Float32Array.from({ length: 3000 }, (_, i) => (i % 2 === 0 ? 1 : -1));
		const out      = runCascade(sections, input);

		for (const v of out) {
			expect(Number.isFinite(v)).toBe(true);
			expect(Math.abs(v)).toBeLessThan(10);
		}
	});
});
