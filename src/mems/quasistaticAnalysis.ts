// Measured characterisation of a Quasistatic Model configuration.
//
// Every quantitative error found while building this emulator came from a
// number that was asserted rather than measured — a cutoff set from a system
// bandwidth figure, a settling time derived from a filter corner, a moves/sec
// readout that was 13x optimistic. In each case the model already knew the
// right answer and nothing was asking it.
//
// So these run the actual axis rather than reasoning about its coefficients:
// they cannot drift from what the renderer is doing, because they are the same
// code path. Cost is a few hundred thousand multiply-adds on a parameter
// change, which is nothing — this is not on the frame path.

import {
	createQuasistaticAxis,
	positionLsb,
	type QuasistaticParams,
} from './quasistaticModel';

export interface QuasistaticAnalysis {
	/** System -3dB point in Hz — the whole chain, not the filter's own corner. */
	systemBandwidthHz: number;
	/** Time for a full-scale step to stay within one position step of its target. */
	settleSeconds: number;
	/** Peak excursion past the target, as a fraction (0.05 = 5% overshoot). */
	overshoot: number;
	/** Fully-settled point-to-point moves per second. */
	movesPerSecond: number;
}

/** Runs a fresh axis over `input`, warm-started at rest. */
function drive(sampleRate: number, params: QuasistaticParams, input: Float32Array): Float32Array {
	const axis = createQuasistaticAxis(sampleRate, params);
	axis.reset(0);
	return axis.process(input);
}

function rmsGain(sampleRate: number, params: QuasistaticParams, freq: number): number {
	// Amplitude 0.8 keeps quantisation negligible without risking the clamp.
	// The window has to cover whole cycles or the RMS is of a partial one — at
	// least eight periods, which matters at the bottom of the sweep.
	const guard  = 2048;
	const window = Math.max(2048, Math.ceil((8 * sampleRate) / Math.max(freq, 1)));
	const input  = new Float32Array(guard + window);
	for (let n = 0; n < input.length; n++) {
		input[n] = 0.8 * Math.sin((2 * Math.PI * freq * n) / sampleRate);
	}
	const out = drive(sampleRate, params, input);

	let sIn = 0, sOut = 0;
	for (let n = guard; n < input.length; n++) {
		sIn  += input[n] * input[n];
		sOut += out[n] * out[n];
	}
	return sIn > 0 ? Math.sqrt(sOut / sIn) : 0;
}

export function analyseQuasistatic(
	sampleRate: number,
	params: QuasistaticParams,
): QuasistaticAnalysis {
	// ── step response ──────────────────────────────────────────────────────
	// 4096 samples is 85ms at 48kHz, comfortably past any settling this model
	// produces (the slowest plausible case, an unfiltered Q=500 mirror, is a
	// few tens of ms).
	const step = new Float32Array(4096).fill(1);
	const resp = drive(sampleRate, params, step);

	// The target is wherever the chain actually lands, which is the angle limit
	// rather than 1.0 when the clamp is engaged.
	const target = resp[resp.length - 1];
	const band   = positionLsb(params.quantiseEnabled ? params.positionBits : 12);

	let peak = target;
	let lastOutside = 0;
	for (let n = 0; n < resp.length; n++) {
		if (resp[n] > peak) peak = resp[n];
		if (Math.abs(resp[n] - target) > band) lastOutside = n;
	}
	const settleSeconds = (lastOutside + 1) / sampleRate;

	// ── system bandwidth ───────────────────────────────────────────────────
	// DC gain comes from where the step actually landed, not from a very low
	// sine — at 1Hz an 8k window is a fifth of a cycle and its RMS means nothing.
	const targetGain = Math.abs(target) * Math.SQRT1_2;

	// Search only up to the Nyquist of the *device's* output rate. Above that
	// the zero-order hold aliases — a 24kHz probe against a 22kHz hold folds
	// down to 2kHz and sails through the passband, which is real behaviour but
	// makes the response non-monotonic and the crossing ambiguous. The device
	// cannot represent anything up there anyway.
	const ceiling = Math.min(sampleRate / 2, params.deviceSampleRate / 2) * 0.95;

	let lo = 20;
	let hi = ceiling;
	if (rmsGain(sampleRate, params, hi) > targetGain) {
		// Never crosses inside the representable band.
		lo = hi;
	} else {
		for (let i = 0; i < 16; i++) {
			const mid = Math.sqrt(lo * hi); // geometric — the axis is logarithmic
			if (rmsGain(sampleRate, params, mid) > targetGain) lo = mid;
			else hi = mid;
		}
	}

	return {
		systemBandwidthHz: Math.sqrt(lo * hi),
		settleSeconds,
		overshoot: target !== 0 ? Math.max(0, peak / target - 1) : 0,
		movesPerSecond: settleSeconds > 0 ? 1 / settleSeconds : Infinity,
	};
}
