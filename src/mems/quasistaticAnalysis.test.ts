import { describe, expect, it } from 'vitest';

import { analyseQuasistatic } from './quasistaticAnalysis';
import { positionLsb, type QuasistaticParams } from './quasistaticModel';

const sampleRate = 48000;

/** The accepted PlayzerX-derived defaults. */
function defaults(over: Partial<QuasistaticParams> = {}): QuasistaticParams {
	return {
		deviceSampleRate: 22000,
		filterType:       'bessel',
		filterOrder:      5,
		cutoff:           1800,
		zeroPhase:        false,
		angleLimit:       1,
		quantiseEnabled:  true,
		positionBits:     12,
		shaperEnabled:    false,
		shaperFreq:       5500,
		resonanceEnabled: true,
		resonanceFreq:    5500,
		resonanceQ:       25,
		...over,
	};
}

describe('analyseQuasistatic', () => {
	// These pin the reconciliation the grilling session arrived at: one
	// parameter set that matches every published Mirrorcle figure at once.
	// If a future change breaks the agreement, it breaks here rather than
	// quietly making the emulator wrong again.
	it('reproduces PlayzerX’s published system bandwidth', () => {
		const a = analyseQuasistatic(sampleRate, defaults());
		// Spec is "dc to ~2200Hz on both axes". The filter's own corner is
		// 1800Hz — the resonance peak carries the system -3dB point up to ~2200,
		// which is exactly the distinction that caused the original error.
		expect(a.systemBandwidthHz).toBeGreaterThan(1900);
		expect(a.systemBandwidthHz).toBeLessThan(2500);
	});

	it('settles to one position step in roughly the API’s default step time', () => {
		const a = analyseQuasistatic(sampleRate, defaults());
		// GoToDevicePosition defaults to 5ms. Settling to 1 LSB is the only
		// criterion with physical meaning on a 12-bit device, and it lands close
		// to that default rather than to the ~500us figure, which is a ~2% band.
		expect(a.settleSeconds).toBeGreaterThan(3e-3);
		expect(a.settleSeconds).toBeLessThan(12e-3);
	});

	it('settles far slower unfiltered, matching the ~10ms figure', () => {
		// Cutoff at Nyquist/2 makes the filter effectively transparent, leaving
		// the bare mirror — which Mirrorcle measures at ~10ms.
		const a = analyseQuasistatic(sampleRate, defaults({ cutoff: 12000 }));
		expect(a.settleSeconds).toBeGreaterThan(8e-3);
		expect(a.settleSeconds).toBeLessThan(25e-3);
	});

	it('reports a slower, not faster, settle when the criterion is finer', () => {
		const coarse = analyseQuasistatic(sampleRate, defaults({ positionBits: 8 }));
		const fine   = analyseQuasistatic(sampleRate, defaults({ positionBits: 14 }));
		expect(fine.settleSeconds).toBeGreaterThan(coarse.settleSeconds);
	});

	it('measures the angle limit as the settling target, not full scale', () => {
		// With the clamp engaged the step lands at 0.4, and settling must be
		// measured against that rather than against 1.0.
		const a = analyseQuasistatic(sampleRate, defaults({ angleLimit: 0.4 }));
		expect(Number.isFinite(a.settleSeconds)).toBe(true);
		expect(a.settleSeconds).toBeLessThan(50e-3);
	});

	it('moves per second is the reciprocal of settling', () => {
		const a = analyseQuasistatic(sampleRate, defaults());
		expect(a.movesPerSecond).toBeCloseTo(1 / a.settleSeconds, 6);
	});
});

describe('input shaping', () => {
	// The headroom the vendor documents, and the reason the shaper exists.
	it('a correctly tuned shaper settles faster than the lowpass alone', () => {
		const plain  = analyseQuasistatic(sampleRate, defaults());
		const shaped = analyseQuasistatic(sampleRate, defaults({
			shaperEnabled: true,
			shaperFreq:    5500,   // matched to the mirror
			cutoff:        3600,   // the shaper handles resonance, so the filter can relax
		}));
		expect(shaped.settleSeconds).toBeLessThan(plain.settleSeconds);
	});

	// The reason it is fragile, and why closed-loop control is sold alongside.
	it('a mistuned shaper gives back most of what it gained', () => {
		const tuned = analyseQuasistatic(sampleRate, defaults({
			shaperEnabled: true, shaperFreq: 5500, cutoff: 3600,
		}));
		const mistuned = analyseQuasistatic(sampleRate, defaults({
			shaperEnabled: true, shaperFreq: 4400, cutoff: 3600,   // 20% low
		}));
		expect(mistuned.settleSeconds).toBeGreaterThan(tuned.settleSeconds * 1.5);
	});
});

describe('position quantisation', () => {
	it('one 12-bit step is the device’s documented resolution', () => {
		// 4096 positions across [-1,+1]; over a ~34 degree field that is 0.0166
		// degrees per step, just above the device's <0.01 degree repeatability.
		expect(positionLsb(12)).toBeCloseTo(2 / 4095, 9);
		expect(positionLsb(12) * 34).toBeCloseTo(0.0166, 3);
	});

	it('quantising holds the output on a grid', () => {
		const a = analyseQuasistatic(sampleRate, defaults({ positionBits: 4 }));
		// A coarse grid must still settle and must still be finite — the point is
		// that nothing downstream assumes a continuous command.
		expect(Number.isFinite(a.settleSeconds)).toBe(true);
		expect(a.systemBandwidthHz).toBeGreaterThan(0);
	});
});
