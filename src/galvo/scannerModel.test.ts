import { describe, expect, it } from 'vitest';
import { createScannerAxis, type ScannerParams } from './scannerModel';

/**
 * Steady-state sine gain: RMS(output)/RMS(input) over a settled tail window,
 * on a fresh axis. 20 cycles of transient guard band comfortably clears this
 * module's settling time even at the lowest bandwidth used below (bandwidth
 * 100Hz => tau ~= 2.25ms => 5tau ~= 11ms; 20 cycles at 800Hz is 25ms).
 */
function measureGain(params: ScannerParams, sampleRate: number, freq: number): number {
	const totalSamples = Math.round((200 * sampleRate) / freq);
	const skip          = Math.round((20 * sampleRate) / freq);
	const input          = new Float32Array(totalSamples);
	for (let i = 0; i < totalSamples; i++) {
		input[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate);
	}

	const out = createScannerAxis(sampleRate, params).process(input);

	let sumInSq = 0, sumOutSq = 0, n = 0;
	for (let i = skip; i < totalSamples; i++) {
		sumInSq += input[i] * input[i];
		sumOutSq += out[i] * out[i];
		n++;
	}
	return Math.sqrt(sumOutSq / n) / Math.sqrt(sumInSq / n);
}

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

	it('two axis instances never share state, even after one is driven hard', () => {
		const sampleRate = 48000;
		const params = { bandwidth: 1000, damping: 0.7, slewLimit: 1e9 };

		// Ground truth: what a completely untouched axis does with this input.
		const reference    = createScannerAxis(sampleRate, params);
		const referenceOut = reference.process(new Float32Array(50).fill(0.3));

		// A same-params instance, driven hard and reset — this is what would
		// leak into `isolated` below if coefficients or history were ever
		// shared across instances (e.g. a module-level cache keyed by params).
		const other = createScannerAxis(sampleRate, params);
		other.process(new Float32Array(5000).fill(-1));
		other.reset(0.9);
		other.process(new Float32Array(2000).fill(0.9));

		// Created *after* `other`'s abuse, with identical params — must behave
		// exactly like `reference`, not like whatever `other` is currently doing.
		const isolated    = createScannerAxis(sampleRate, params);
		const isolatedOut = isolated.process(new Float32Array(50).fill(0.3));

		for (let n = 0; n < referenceOut.length; n++) {
			expect(isolatedOut[n]).toBeCloseTo(referenceOut[n], 6);
		}
	});

	it('stays finite and bounded when bandwidth is requested far above the Nyquist-safe range', () => {
		const sampleRate = 48000;
		// 40000Hz at a 48kHz sample rate is a value a careless UI slider could
		// easily produce — well past fs/4 (12000, the spec's stated bound) and
		// past fs/2 (Nyquist) entirely. Confirmed by hand (not asserted here)
		// that the *unclamped* RBJ coefficients at this bandwidth/damping give a
		// pole magnitude of ~2.02 — outside the unit circle, i.e. genuinely
		// unstable, not just numerically sloppy.
		const axis = createScannerAxis(sampleRate, {
			bandwidth: 40000,
			damping:   0.7,
			slewLimit: 1e9,
		});

		const out = axis.process(new Float32Array(2000).fill(1));

		for (const v of out) {
			expect(Number.isFinite(v)).toBe(true);
			// Generous on purpose — this proves "didn't diverge," not "matches a
			// specific response shape." A correctly clamped filter at this damping
			// settles with only a few percent overshoot, comfortably inside this.
			expect(Math.abs(v)).toBeLessThanOrEqual(10);
		}
	});

	it('attenuates by exactly 3dB (gain 1/√2) at the configured bandwidth', () => {
		// Damping 1/√2 is the Butterworth (maximally flat) case, chosen
		// deliberately: it's the one damping value where "-3dB at bandwidth"
		// holds with no resonant peak shifting the crossing point. Confirmed
		// by hand this holds to machine precision in float64; 4 decimal
		// places here clears Float32Array's own precision floor at this
		// magnitude comfortably.
		const gain = measureGain(
			{ bandwidth: 1000, damping: 1 / Math.SQRT2, slewLimit: 1e9 },
			48000,
			1000,
		);
		expect(gain).toBeCloseTo(1 / Math.SQRT2, 4);
	});

	it('rolls off at ~12dB/octave, measured away from Nyquist frequency warping', () => {
		// A low bandwidth relative to sampleRate keeps both test frequencies far
		// from Nyquist. Measured by hand: near Nyquist the bilinear transform's
		// frequency warping steepens the *apparent* slope well past -12dB/oct
		// (e.g. ~-19dB/oct at 16kHz on a 48kHz-rate/1kHz-bandwidth axis) — a
		// known, documented limitation of this discretisation, not something
		// this test should paper over by picking frequencies that hide it.
		const params: ScannerParams = { bandwidth: 100, damping: 1 / Math.SQRT2, slewLimit: 1e9 };
		const sampleRate = 48000;

		const gainLow  = measureGain(params, sampleRate, 800);  // 8x bandwidth
		const gainHigh = measureGain(params, sampleRate, 1600); // 16x bandwidth, one octave up

		const slopeDb = 20 * Math.log10(gainHigh) - 20 * Math.log10(gainLow);
		expect(slopeDb).toBeCloseTo(-12, 0); // within 0.5dB; measured -12.09dB by hand
	});
});
