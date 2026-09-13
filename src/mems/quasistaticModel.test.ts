import { describe, expect, it } from 'vitest';

import type { BesselOrder } from '../dsp/bessel';
import { createQuasistaticAxis, type QuasistaticParams } from './quasistaticModel';

const sampleRate = 48000;

/** A filter-only configuration: no clamping, no mirror resonance. */
function filterOnly(cutoff: number, filterOrder: BesselOrder): QuasistaticParams {
	return {
		cutoff,
		filterOrder,
		angleLimit:       1,
		resonanceEnabled: false,
		resonanceFreq:    3000,
		resonanceQ:       100,
	};
}

/**
 * RMS gain at `freq`. The transient guard is generous because a high-Q
 * resonator settles slowly — at Q=100 and 3kHz the ring decays over roughly
 * Q/(π·f0) ≈ 500 samples, so 5000 is comfortably clear of it.
 */
function measureGain(params: QuasistaticParams, freq: number): number {
	const guard  = 5000;
	const window = 5000;
	const axis   = createQuasistaticAxis(sampleRate, params);

	const input = new Float32Array(guard + window);
	for (let n = 0; n < input.length; n++) {
		input[n] = Math.sin((2 * Math.PI * freq * n) / sampleRate);
	}
	const out = axis.process(input);

	let sumIn = 0, sumOut = 0;
	for (let n = guard; n < input.length; n++) {
		sumIn  += input[n] * input[n];
		sumOut += out[n] * out[n];
	}
	return Math.sqrt(sumOut / sumIn);
}

function dbPerOctave(params: QuasistaticParams, f1: number, f2: number): number {
	const g1 = measureGain(params, f1);
	const g2 = measureGain(params, f2);
	return (20 * Math.log10(g2 / g1)) / Math.log2(f2 / f1);
}

describe('createQuasistaticAxis', () => {
	it('settles a held input at the commanded value', () => {
		const axis = createQuasistaticAxis(sampleRate, filterOnly(500, 5));
		const out  = axis.process(new Float32Array(8000).fill(0.4));
		// 6 decimals, not more: the buffers are Float32Array, which carries about
		// seven decimal digits, so 0.4 round-trips as 0.40000000596.
		expect(out[out.length - 1]).toBeCloseTo(0.4, 6);
	});

	it.each([2, 5] as BesselOrder[])('order %i is -3dB at the cutoff', (order) => {
		// 2 decimal places: the cascade's -3dB point drifts slightly with
		// cutoff/fs because each section is prewarped at its own f0. See the
		// tighter analytic version of this test in dsp/bessel.test.ts — this one
		// is measured through the actual model, sine in and RMS out, so it also
		// picks up float32 buffer rounding.
		expect(measureGain(filterOnly(500, order), 500)).toBeCloseTo(Math.SQRT1_2, 2);
	});

	it.each([
		[2 as BesselOrder, -12],
		[5 as BesselOrder, -30],
	])('order %i rolls off at about %i dB/octave', (order, ideal) => {
		// Low cutoff so the measurement band stays clear of Nyquist, where
		// bilinear warping steepens the apparent slope.
		expect(dbPerOctave(filterOnly(100, order), 800, 1600)).toBeCloseTo(ideal, 0);
	});

	// Linear phase is the entire reason the hardware uses a Bessel, and the
	// visible difference from the Galvo Scanner Model: corners soften instead of
	// overshooting. A 5th-order Butterworth in the same slot overshoots 12.8%.
	it.each([2, 5] as BesselOrder[])('order %i barely overshoots a step', (order) => {
		const axis = createQuasistaticAxis(sampleRate, filterOnly(500, order));
		const out  = axis.process(new Float32Array(4000).fill(1));
		expect(out.reduce((m, v) => Math.max(m, v), 0)).toBeLessThan(1.015);
	});

	it('clamps a full-scale command to the angle limit', () => {
		const axis = createQuasistaticAxis(sampleRate, { ...filterOnly(500, 5), angleLimit: 0.3 });
		const out  = axis.process(new Float32Array(8000).fill(1));
		expect(out[out.length - 1]).toBeCloseTo(0.3, 6);
	});

	it('reports how many samples the clamp caught', () => {
		const axis  = createQuasistaticAxis(sampleRate, { ...filterOnly(500, 5), angleLimit: 0.5 });
		const input = new Float32Array(1000);
		// A unit sine sits outside ±L for a fraction 1 - (2/π)·asin(L) of its
		// period. At L=0.5 that is 1 - 1/3 = 2/3: sin exceeds +0.5 across a third
		// of the cycle and drops below -0.5 across another third. Ten whole
		// cycles keeps the edge effects negligible.
		for (let n = 0; n < input.length; n++) {
			input[n] = Math.sin((2 * Math.PI * 10 * n) / input.length);
		}
		axis.process(input);
		const expected = 1 - (2 / Math.PI) * Math.asin(0.5);
		expect(axis.clampedCount() / input.length).toBeCloseTo(expected, 1);
	});

	// The clamp is on the command, ahead of the filter — so a resonant mirror can
	// still swing past the limit. Clamping the output instead would model a
	// mirror physically prevented from over-deflecting, which is not what the
	// hardware does (ADR-0012, sub-decision 4).
	it('lets resonance overshoot the angle limit, because the clamp is on the command', () => {
		const axis = createQuasistaticAxis(sampleRate, {
			cutoff:           500,
			filterOrder:      2,
			angleLimit:       0.5,
			resonanceEnabled: true,
			resonanceFreq:    3000,
			resonanceQ:       100,
		});
		const out  = axis.process(new Float32Array(8000).fill(1));
		const peak = out.reduce((m, v) => Math.max(m, v), 0);

		expect(peak).toBeGreaterThan(0.5);            // overshoot got through
		expect(out[out.length - 1]).toBeCloseTo(0.5, 6); // but it settles on the limit
	});

	it('rings at the resonant frequency when the mirror stage is enabled', () => {
		const axis = createQuasistaticAxis(sampleRate, {
			cutoff:           12000,
			filterOrder:      2,
			angleLimit:       1,
			resonanceEnabled: true,
			resonanceFreq:    3000,
			resonanceQ:       200,
		});
		const impulse = new Float32Array(4000);
		impulse[0] = 1;
		const out = axis.process(impulse);

		// Count zero crossings over a window that starts after the excitation and
		// ends well before the Q=200 ring has decayed.
		const from = 200, to = 1400;
		let crossings = 0;
		for (let n = from + 1; n < to; n++) {
			if ((out[n - 1] < 0) !== (out[n] < 0)) crossings++;
		}
		const freq = (crossings / 2) / ((to - from) / sampleRate);
		expect(freq).toBeCloseTo(3000, -2);
	});

	// A high-Q second-order lowpass peaks at its natural frequency with gain
	// 1/(2ζ) = Q. Measured 98.0 for Q=100, the shortfall being the Bessel's own
	// mild attenuation at 3kHz.
	it('peaks at about Q when driven at the resonant frequency', () => {
		const gain = measureGain({
			cutoff:           12000,
			filterOrder:      2,
			angleLimit:       1,
			resonanceEnabled: true,
			resonanceFreq:    3000,
			resonanceQ:       100,
		}, 3000);
		expect(gain).toBeGreaterThan(90);
		expect(gain).toBeLessThan(105);
	});

	// The design intent of the whole drive path: put the cutoff far enough below
	// resonance and the mirror never gets enough energy to ring. The resonator
	// still multiplies by Q, but Q against the Bessel's attenuation at that
	// frequency is a very small number.
	it('suppresses resonance when the cutoff sits far below it', () => {
		const base = {
			cutoff:        200,
			filterOrder:   5 as BesselOrder,
			angleLimit:    1,
			resonanceFreq: 3000,
			resonanceQ:    100,
		};
		const withRes    = measureGain({ ...base, resonanceEnabled: true }, 3000);
		const withoutRes = measureGain({ ...base, resonanceEnabled: false }, 3000);

		expect(withRes).toBeLessThan(0.01);
		// The resonator contributes its full Q of peaking; it is the filter in
		// front of it that makes the product harmless.
		expect(withRes / withoutRes).toBeGreaterThan(80);
	});

	it('warm-starts every section on reset', () => {
		const axis = createQuasistaticAxis(sampleRate, filterOnly(500, 5));
		axis.process(new Float32Array(4000).fill(1));

		axis.reset(0.25);
		const out = axis.process(new Float32Array(16).fill(0.25));

		// If any one section of the cascade had been left holding stale history,
		// the very first sample would show a transient.
		for (const v of out) expect(v).toBeCloseTo(0.25, 6);
	});

	it('keeps instances independent', () => {
		const params = filterOnly(500, 5);

		const abused = createQuasistaticAxis(sampleRate, params);
		abused.process(new Float32Array(4000).fill(1));
		abused.reset(-1);

		const fresh     = createQuasistaticAxis(sampleRate, params);
		const reference = createQuasistaticAxis(sampleRate, params);

		const input = Float32Array.from({ length: 500 }, (_, n) => Math.sin(n / 7));
		const a = fresh.process(input);
		const b = reference.process(input);

		for (let n = 0; n < a.length; n++) expect(a[n]).toBeCloseTo(b[n], 6);
	});

	it.each([2, 5] as BesselOrder[])('order %i stays bounded at the parameter bounds', (order) => {
		const axis = createQuasistaticAxis(sampleRate, {
			cutoff:           sampleRate / 4,
			filterOrder:      order,
			angleLimit:       1,
			resonanceEnabled: true,
			resonanceFreq:    sampleRate / 4,
			resonanceQ:       500,
		});
		const input = Float32Array.from({ length: 3000 }, (_, n) => (n % 2 === 0 ? 1 : -1));
		const out   = axis.process(input);

		for (const v of out) {
			expect(Number.isFinite(v)).toBe(true);
			expect(Math.abs(v)).toBeLessThan(1000);
		}
	});
});
