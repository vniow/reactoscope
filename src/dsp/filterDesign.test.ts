import { describe, expect, it } from 'vitest';

import {
	lowpassPrototype,
	lowpassSections,
	reverseBesselCoefficients,
	type FilterFamily,
} from './filterDesign';
import { createBiquadSection, type BiquadCoeffs } from './biquad';

const sampleRate = 48000;

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

/** Exact complex response. Phase summed per section so it stays unwrapped. */
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

function groupDelay(sections: BiquadCoeffs[], freq: number): number {
	const h = 0.5;
	const p1 = responseAt(sections, freq - h).phase;
	const p2 = responseAt(sections, freq + h).phase;
	return -(p2 - p1) / ((2 * Math.PI * (2 * h)) / sampleRate);
}

function polyMul(a: number[], b: number[]): number[] {
	const out = new Array<number>(a.length + b.length - 1).fill(0);
	for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j];
	return out;
}

/** Expands the monic polynomial whose roots are a prototype's poles. */
function prototypePolynomial(family: FilterFamily, order: number): number[] {
	const proto = lowpassPrototype(family, order);
	let poly: number[] = [1];
	for (const { f0Ratio, zeta } of proto.pairs) {
		poly = polyMul(poly, [f0Ratio * f0Ratio, 2 * zeta * f0Ratio, 1]);
	}
	if (proto.realRatio !== undefined) poly = polyMul(poly, [proto.realRatio, 1]);
	return poly;
}

describe('lowpassPrototype', () => {
	// The strongest available check on the Bessel poles: the prototype is the
	// reverse Bessel polynomial's root set, rescaled to put -3dB at ω=1. Undo
	// that rescale (recoverable from the constant term) and the exact integer
	// coefficients must come back. A numerical failure in the root finder shows
	// up here rather than as a quietly wrong filter shape.
	it.each([1, 2, 3, 4, 5, 6, 7, 8])(
		'bessel order %i poles are the reverse Bessel polynomial\'s roots',
		(order) => {
			const expected = reverseBesselCoefficients(order);
			const actual   = prototypePolynomial('bessel', order);
			expect(actual.length).toBe(expected.length);

			// Scaling the roots by 1/σ maps coefficient a_k to a_k·σ^(k-n), so σ
			// is recoverable from the constant term alone.
			const sigma = Math.pow(expected[0] / actual[0], 1 / order);

			actual.forEach((c, k) => {
				const want = expected[k] * Math.pow(sigma, k - order);
				expect(Math.abs(c - want) / Math.abs(want)).toBeLessThan(1e-7);
			});
		},
	);

	it.each([2, 3, 4, 5, 6, 7, 8])('butterworth order %i puts every pole on the unit circle', (order) => {
		const proto = lowpassPrototype('butterworth', order);
		for (const { f0Ratio } of proto.pairs) expect(f0Ratio).toBeCloseTo(1, 9);
		if (proto.realRatio !== undefined) expect(proto.realRatio).toBeCloseTo(1, 9);
	});

	it.each([1, 2, 3, 4, 5, 6, 7, 8])('order %i emits the right number of poles', (order) => {
		for (const family of ['bessel', 'butterworth'] as FilterFamily[]) {
			const proto = lowpassPrototype(family, order);
			const count = proto.pairs.length * 2 + (proto.realRatio !== undefined ? 1 : 0);
			expect(count).toBe(order);
		}
	});

	it('clamps the order to the supported range', () => {
		expect(lowpassPrototype('bessel', 0)).toEqual(lowpassPrototype('bessel', 1));
		expect(lowpassPrototype('bessel', 99)).toEqual(lowpassPrototype('bessel', 8));
	});
});

describe('lowpassSections', () => {
	it.each([
		['bessel', 2], ['bessel', 5], ['bessel', 8],
		['butterworth', 2], ['butterworth', 5], ['butterworth', 8],
	] as [FilterFamily, number][])('%s order %i is -3dB at the cutoff', (family, order) => {
		const cutoff = 500;
		// 3 decimal places: sections are prewarped individually, so the cascade's
		// corner drifts slightly with cutoff/fs. Pinned at a cutoff in the range
		// the device actually uses.
		expect(responseAt(lowpassSections(sampleRate, cutoff, family, order), cutoff).mag)
			.toBeCloseTo(Math.SQRT1_2, 3);
	});

	it.each([
		['bessel', 2], ['bessel', 4], ['butterworth', 2], ['butterworth', 4],
	] as [FilterFamily, number][])('%s order %i rolls off at about -6n dB/octave', (family, order) => {
		// Low cutoff so the 8x-16x band stays clear of Nyquist, where bilinear
		// warping steepens the apparent slope.
		const sections = lowpassSections(sampleRate, 100, family, order);
		const g1 = responseAt(sections, 800).mag;
		const g2 = responseAt(sections, 1600).mag;
		expect((20 * Math.log10(g2 / g1)) / Math.log2(2)).toBeCloseTo(-6 * order, 0);
	});

	it.each([1, 2, 3, 4, 5, 6, 7, 8])('DC passes at unity for order %i', (order) => {
		for (const family of ['bessel', 'butterworth'] as FilterFamily[]) {
			const out = runCascade(lowpassSections(sampleRate, 500, family, order),
				new Float32Array(12000).fill(1));
			expect(out[out.length - 1]).toBeCloseTo(1, 6);
		}
	});

	// The reason a Bessel is the default family: flat group delay means the
	// figure is delayed uniformly rather than reshaped, so corners soften
	// instead of overshooting. This is the property that distinguishes the MEMS
	// view from the Galvo one, so it is pinned rather than assumed.
	it('bessel holds group delay far flatter than butterworth', () => {
		const cutoff = 500;
		const spread = (family: FilterFamily) => {
			const s  = lowpassSections(sampleRate, cutoff, family, 5);
			const lo = groupDelay(s, cutoff * 0.25);
			const hi = groupDelay(s, cutoff * 0.75);
			return Math.abs(hi - lo) / lo;
		};
		// Measured: bessel 0.017%, butterworth 36.8%.
		expect(spread('bessel')).toBeLessThan(0.01);
		expect(spread('butterworth')).toBeGreaterThan(0.1);
		expect(spread('bessel')).toBeLessThan(spread('butterworth') / 10);
	});

	it('bessel barely overshoots a step where butterworth rings', () => {
		const peak = (family: FilterFamily) => {
			const out = runCascade(lowpassSections(sampleRate, 500, family, 5),
				new Float32Array(4000).fill(1));
			return out.reduce((m, v) => Math.max(m, v), 0);
		};
		// Measured: bessel 0.79% overshoot, butterworth 12.8%.
		expect(peak('bessel')).toBeLessThan(1.015);
		expect(peak('butterworth')).toBeGreaterThan(1.08);
	});

	it.each([
		['bessel', 8], ['butterworth', 8],
	] as [FilterFamily, number][])('%s order %i stays bounded at the section cap', (family, order) => {
		const sections = lowpassSections(sampleRate, sampleRate / 4, family, order);
		const input    = Float32Array.from({ length: 3000 }, (_, i) => (i % 2 === 0 ? 1 : -1));
		for (const v of runCascade(sections, input)) {
			expect(Number.isFinite(v)).toBe(true);
			expect(Math.abs(v)).toBeLessThan(10);
		}
	});
});
