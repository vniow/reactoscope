import { describe, expect, it } from 'vitest';
import { createScannerAxis } from './scannerModel';

describe('createScannerAxis', () => {
	it('settles to the commanded value for a held constant input (unity DC gain)', () => {
		const sampleRate = 48000;
		const axis = createScannerAxis(sampleRate, {
			bandwidth: 1000,
			damping:   0.7,
			// Large enough that the slew clamp never engages — this test is only
			// about the linear filter's DC behaviour, not the clamp.
			slewLimit: 1e9,
		});

		// 5 time constants (τ = 1/(ζω0)) is enough for a 2nd-order system to settle
		// to within a fraction of a percent of its final value; padding generously
		// since this is the first cycle and the settle time isn't under test yet.
		const held  = new Float32Array(5000).fill(1);
		const out   = axis.process(held);

		expect(out[out.length - 1]).toBeCloseTo(1, 3);
	});

	it('overshoots a step by the closed-form ratio when underdamped (ζ<1)', () => {
		const sampleRate = 48000;
		const zeta       = 0.3;
		const axis = createScannerAxis(sampleRate, {
			bandwidth: 1000,
			damping:   zeta,
			slewLimit: 1e9,
		});

		// A fresh axis starts at rest (0), so a held input of 1 from n=0 *is* a
		// unit step — no separate "settle first" phase needed for this test.
		const out = axis.process(new Float32Array(5000).fill(1));

		let peak = -Infinity;
		for (const v of out) if (v > peak) peak = v;

		// Standard 2nd-order step-response peak overshoot ratio, from control
		// theory — independent of this module's own implementation, so it can
		// actually disagree with the code if a coefficient is wrong.
		const expectedOvershoot = Math.exp((-Math.PI * zeta) / Math.sqrt(1 - zeta * zeta));
		const measuredOvershoot = peak - 1; // target is 1, started from 0

		expect(measuredOvershoot).toBeCloseTo(expectedOvershoot, 1);
	});

	it('does not overshoot a step when critically or over-damped (ζ>=1)', () => {
		const sampleRate = 48000;
		const axis = createScannerAxis(sampleRate, {
			bandwidth: 1000,
			damping:   1.2,
			slewLimit: 1e9,
		});

		const out = axis.process(new Float32Array(5000).fill(1));

		let peak = -Infinity;
		for (const v of out) if (v > peak) peak = v;

		// Small numerical slack for discretisation, not a tolerance for real overshoot.
		expect(peak).toBeLessThanOrEqual(1.001);
	});

	it('clamps rate of change to slewLimit when the linear response would exceed it', () => {
		const sampleRate = 48000;
		const slewLimit  = 100; // units/sec — deliberately slow, so it dominates
		const axis = createScannerAxis(sampleRate, {
			// High bandwidth + critical damping: the *linear* filter alone would
			// reach the target in a couple of samples with no overshoot. Any
			// transit time much longer than that has to be the clamp's doing,
			// not the filter's — which is what isolates the clamp as the thing
			// under test here.
			bandwidth: 5000,
			damping:   1.0,
			slewLimit,
		});

		const distance = 1; // step from rest (0) to 1
		const out = axis.process(new Float32Array(1000).fill(distance));

		const deltaMax = slewLimit / sampleRate;

		// Deep in the ramp (well past the filter's own ~1-sample startup, well
		// before the final approach to target where the clamp stops binding),
		// every sample-to-sample step should be *exactly* deltaMax — the clamp
		// is saturated, not merely influencing the result.
		// 6 decimal places (~5e-7 absolute tolerance): tight enough to prove the
		// clamp is saturated at exactly deltaMax rather than merely close to it,
		// loose enough to clear Float32Array's own precision floor at this
		// magnitude (observed float32 rounding here is ~5e-9, comfortably inside).
		for (let n = 50; n <= 400; n++) {
			expect(out[n] - out[n - 1]).toBeCloseTo(deltaMax, 6);
		}

		// Total transit time should match distance/slewLimit, not the filter's
		// own (much faster) time constant. A little slack past the theoretical
		// 480 samples for the short filter-driven tail as it eases into target.
		const expectedTransitSamples = (distance / slewLimit) * sampleRate; // 480
		let actualTransitSamples = out.length;
		for (let n = 0; n < out.length; n++) {
			if (out[n] >= 0.99 * distance) { actualTransitSamples = n; break; }
		}
		expect(actualTransitSamples).toBeGreaterThan(expectedTransitSamples * 0.9);
		expect(actualTransitSamples).toBeLessThan(expectedTransitSamples * 1.1);
	});

	it('reset() warm-starts all history, so resuming at the reset value produces no transient', () => {
		const axis = createScannerAxis(48000, {
			bandwidth: 1000,
			damping:   0.7,
			slewLimit: 1e9,
		});

		// Drive the axis well away from the value we're about to reset to, so a
		// reset that only clears *some* of the internal state (e.g. the output
		// history but not the input history) would still show up as a transient
		// below.
		axis.process(new Float32Array(2000).fill(1));

		axis.reset(0.5);

		// If every piece of history (x1, x2, y1, y2) is truly warm-started to
		// 0.5, then feeding a further constant 0.5 must reproduce 0.5 exactly
		// from the very first sample — that's the DC-gain-1 identity this
		// module already relies on (cycle 1), applied to a non-zero rest point
		// instead of zero. Any leftover stale state breaks that identity and
		// shows up as a detectable bump here.
		const out = axis.process(new Float32Array(100).fill(0.5));
		for (const v of out) expect(v).toBeCloseTo(0.5, 5);
	});
});
