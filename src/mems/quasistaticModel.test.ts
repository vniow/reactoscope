import { describe, expect, it } from 'vitest';

import type { FilterFamily } from '../dsp/filterDesign';
import { createQuasistaticAxis, type QuasistaticParams } from './quasistaticModel';

const sampleRate = 48000;

/**
 * Filter-only configuration: no clamping, no mirror, and a device rate above
 * the audio rate so the zero-order hold is transparent and the filter is the
 * only thing under test.
 */
function filterOnly(cutoff: number, filterOrder: number, filterType: FilterFamily = 'bessel'): QuasistaticParams {
	return {
		deviceSampleRate: 60000,
		filterType,
		filterOrder,
		cutoff,
		zeroPhase:        false,
		angleLimit:       1,
		resonanceEnabled: false,
		resonanceFreq:    3000,
		resonanceQ:       100,
	};
}

function sine(freq: number, length: number): Float32Array {
	const out = new Float32Array(length);
	for (let n = 0; n < length; n++) out[n] = Math.sin((2 * Math.PI * freq * n) / sampleRate);
	return out;
}

/**
 * RMS gain measured across the middle of a long buffer. Both ends are avoided
 * on purpose: the forward pass settles at the start, and in zero-phase mode the
 * reverse pass settles at the end.
 */
function measureGain(params: QuasistaticParams, freq: number): number {
	const length = 20000;
	const from = 6000, to = 14000;
	const input = sine(freq, length);
	const out   = createQuasistaticAxis(sampleRate, params).process(input);

	let sumIn = 0, sumOut = 0;
	for (let n = from; n < to; n++) {
		sumIn  += input[n] * input[n];
		sumOut += out[n] * out[n];
	}
	return Math.sqrt(sumOut / sumIn);
}

/** Sample offset of the first upward zero crossing at or after `from`. */
function firstUpCrossing(buf: Float32Array, from: number): number {
	for (let n = from + 1; n < buf.length; n++) {
		if (buf[n - 1] <= 0 && buf[n] > 0) return n;
	}
	return -1;
}

describe('createQuasistaticAxis', () => {
	it('settles a held input at the commanded value', () => {
		const axis = createQuasistaticAxis(sampleRate, filterOnly(500, 5));
		const out  = axis.process(new Float32Array(12000).fill(0.4));
		// 6 decimals, not more: the buffers are Float32Array, so 0.4 round-trips
		// as 0.40000000596.
		expect(out[out.length - 1]).toBeCloseTo(0.4, 6);
	});

	it.each([
		['bessel', 2], ['bessel', 5], ['butterworth', 2], ['butterworth', 5],
	] as [FilterFamily, number][])('%s order %i is -3dB at the cutoff', (family, order) => {
		expect(measureGain(filterOnly(500, order, family), 500)).toBeCloseTo(Math.SQRT1_2, 2);
	});

	it.each([
		['bessel', 2, -12], ['bessel', 4, -24], ['butterworth', 2, -12],
	] as [FilterFamily, number, number][])(
		'%s order %i rolls off at about %i dB/octave',
		(family, order, ideal) => {
			const params = filterOnly(100, order, family);
			const g1 = measureGain(params, 800);
			const g2 = measureGain(params, 1600);
			expect((20 * Math.log10(g2 / g1)) / Math.log2(2)).toBeCloseTo(ideal, 0);
		},
	);

	it('bessel barely overshoots a step where butterworth rings', () => {
		const peak = (family: FilterFamily) => {
			const out = createQuasistaticAxis(sampleRate, filterOnly(500, 5, family))
				.process(new Float32Array(6000).fill(1));
			return out.reduce((m, v) => Math.max(m, v), 0);
		};
		expect(peak('bessel')).toBeLessThan(1.015);
		expect(peak('butterworth')).toBeGreaterThan(1.08);
	});

	// PlayzerX's FilterData defaults to zeroPhase = true, which is why the
	// content it prepares is band-limited without being displaced.
	it('zero-phase filtering removes the group delay a causal filter has', () => {
		const freq   = 125;
		const length = 20000;
		const input  = sine(freq, length);

		const causalOut = createQuasistaticAxis(sampleRate, filterOnly(500, 5)).process(input);
		const zeroOut   = createQuasistaticAxis(sampleRate, { ...filterOnly(500, 5), zeroPhase: true })
			.process(input);

		const ref    = firstUpCrossing(input, 8000);
		const causal = firstUpCrossing(causalOut, 8000);
		const zero   = firstUpCrossing(zeroOut, 8000);

		// A 5th-order Bessel at 500Hz delays by ~37 samples at 48kHz; the
		// zero-phase pass should land essentially on top of the input.
		expect(causal - ref).toBeGreaterThan(10);
		expect(Math.abs(zero - ref)).toBeLessThanOrEqual(2);
	});

	// Forward-backward filtering applies the response twice, so the corner that
	// is -3dB causally becomes -6dB. Not compensated, matching the reference.
	it('zero-phase filtering squares the magnitude response', () => {
		const gain = measureGain({ ...filterOnly(500, 5), zeroPhase: true }, 500);
		expect(gain).toBeCloseTo(0.5, 2);
	});

	// The Controller reads its buffer at SetSampleRate, so a commanded position
	// only updates that often however fast the host streams.
	it('tracks worse when the device output rate is low', () => {
		const fast = filterOnly(5000, 2);
		const slow = { ...fast, deviceSampleRate: 600 };

		const rms = (params: QuasistaticParams) => {
			const input = sine(200, 20000);
			const out   = createQuasistaticAxis(sampleRate, params).process(input);
			let acc = 0;
			for (let n = 6000; n < 14000; n++) acc += (out[n] - input[n]) ** 2;
			return Math.sqrt(acc / 8000);
		};
		expect(rms(slow)).toBeGreaterThan(rms(fast) * 3);
	});

	it('holds nothing back once the device rate reaches the audio rate', () => {
		const input = sine(300, 4000);
		const at48k = createQuasistaticAxis(sampleRate, { ...filterOnly(2000, 2), deviceSampleRate: 48000 })
			.process(input);
		const at60k = createQuasistaticAxis(sampleRate, { ...filterOnly(2000, 2), deviceSampleRate: 60000 })
			.process(input);
		for (let n = 0; n < input.length; n++) expect(at48k[n]).toBeCloseTo(at60k[n], 6);
	});

	it('clamps a full-scale command to the angle limit', () => {
		const axis = createQuasistaticAxis(sampleRate, { ...filterOnly(500, 5), angleLimit: 0.3 });
		const out  = axis.process(new Float32Array(12000).fill(1));
		expect(out[out.length - 1]).toBeCloseTo(0.3, 6);
	});

	it('reports how many samples the clamp caught', () => {
		const axis  = createQuasistaticAxis(sampleRate, { ...filterOnly(500, 5), angleLimit: 0.5 });
		const input = new Float32Array(1000);
		// A unit sine sits outside ±L for a fraction 1 - (2/π)·asin(L) of its
		// period. At L=0.5 that is 2/3.
		for (let n = 0; n < input.length; n++) {
			input[n] = Math.sin((2 * Math.PI * 10 * n) / input.length);
		}
		axis.process(input);
		expect(axis.clampedCount() / input.length).toBeCloseTo(1 - (2 / Math.PI) * Math.asin(0.5), 1);
	});

	it('lets resonance overshoot the angle limit, because the clamp is on the command', () => {
		const axis = createQuasistaticAxis(sampleRate, {
			...filterOnly(500, 2),
			angleLimit:       0.5,
			resonanceEnabled: true,
		});
		const out  = axis.process(new Float32Array(12000).fill(1));
		expect(out.reduce((m, v) => Math.max(m, v), 0)).toBeGreaterThan(0.5);
		expect(out[out.length - 1]).toBeCloseTo(0.5, 5);
	});

	it('rings at the resonant frequency when the mirror stage is enabled', () => {
		const axis = createQuasistaticAxis(sampleRate, {
			...filterOnly(12000, 2),
			resonanceEnabled: true,
			resonanceFreq:    3000,
			resonanceQ:       200,
		});
		const impulse = new Float32Array(4000);
		impulse[0] = 1;
		const out = axis.process(impulse);

		const from = 200, to = 1400;
		let crossings = 0;
		for (let n = from + 1; n < to; n++) if ((out[n - 1] < 0) !== (out[n] < 0)) crossings++;
		expect((crossings / 2) / ((to - from) / sampleRate)).toBeCloseTo(3000, -2);
	});

	// A high-Q second-order lowpass peaks at its natural frequency with gain
	// 1/(2ζ) = Q.
	it('peaks at about Q when driven at the resonant frequency', () => {
		const gain = measureGain({
			...filterOnly(12000, 2),
			resonanceEnabled: true,
			resonanceFreq:    3000,
			resonanceQ:       100,
		}, 3000);
		expect(gain).toBeGreaterThan(85);
		expect(gain).toBeLessThan(110);
	});

	// The design intent of the whole drive path: keep the cutoff far enough
	// below resonance and the mirror never gets enough energy to ring.
	it('suppresses resonance when the cutoff sits far below it', () => {
		const base = { ...filterOnly(200, 5), resonanceFreq: 3000, resonanceQ: 100 };
		const withRes    = measureGain({ ...base, resonanceEnabled: true }, 3000);
		const withoutRes = measureGain({ ...base, resonanceEnabled: false }, 3000);

		expect(withRes).toBeLessThan(0.01);
		expect(withRes / withoutRes).toBeGreaterThan(80);
	});

	it('warm-starts every stage on reset', () => {
		const axis = createQuasistaticAxis(sampleRate, {
			...filterOnly(500, 5),
			resonanceEnabled: true,
		});
		axis.process(new Float32Array(6000).fill(1));

		axis.reset(0.25);
		const out = axis.process(new Float32Array(16).fill(0.25));
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

	it.each(['bessel', 'butterworth'] as FilterFamily[])(
		'%s stays bounded at the parameter bounds',
		(family) => {
			const axis = createQuasistaticAxis(sampleRate, {
				deviceSampleRate: 60000,
				filterType:       family,
				filterOrder:      8,
				cutoff:           sampleRate / 4,
				zeroPhase:        true,
				angleLimit:       1,
				resonanceEnabled: true,
				resonanceFreq:    sampleRate / 4,
				resonanceQ:       500,
			});
			const input = Float32Array.from({ length: 3000 }, (_, n) => (n % 2 === 0 ? 1 : -1));
			for (const v of axis.process(input)) {
				expect(Number.isFinite(v)).toBe(true);
				expect(Math.abs(v)).toBeLessThan(1000);
			}
		},
	);
});
