// Pure-math Quasistatic Model — the MEMS Laser's Scanner Model. See
// docs/mems-laser-emulator.md for the design spec and
// docs/adr/0012-mems-laser-beam-emulator.md for why it has this shape.
// Framework-free, like src/galvo/scannerModel.ts, for the same reason: this is
// the piece whose bugs are invisible by inspection.
//
// Modelled on the PlayzerX repository (mems/playzerx-master), Mirrorcle's own
// product SDK, in its quasistatic mode:
//
//   command
//     ─► amplitude clamp          MTIDeviceLimits VdifferenceMax
//     ─► zero-order hold          PlayzerX SetSampleRate — the Controller reads
//                                 its buffer at a fixed samples/sec, so a
//                                 commanded position only updates that often
//     ─► software filter          MTIDataGenerator SetupSoftwareFilter(type,
//                                 order, cutoffFreq, sampleFreq), optionally
//                                 zero-phase per FilterData(zeroPhase = true)
//     ─► high-Q mirror            the physical device, always causal
//
// Note what is *not* here: a slew-rate clamp. The Galvo Scanner Model needs one
// because a linear filter is scale-invariant and would price a full-scale jump
// as free. Here the band limit already bounds the rate of change, so a second
// constraint on the same quantity would only let two parameters contradict each
// other (ADR-0012, sub-decision 4).

import { lowpassSections, type FilterFamily } from '../dsp/filterDesign';
import { createBiquadSection, rbjLowpass, type BiquadSection } from '../dsp/biquad';
import { createFractionalDelay, zvShaper } from '../dsp/fractionalDelay';
import type { ScannerAxis } from '../dsp/scannerAxis';

/** PlayzerX-Demo rejects anything outside this and falls back to 5000. */
export const MIN_DEVICE_SPS = 500;
export const MAX_DEVICE_SPS = 60000;

/** X/Y cross the USB wire as 0..4095 over [-1,+1] — twelve bits. */
export const DEVICE_POSITION_BITS = 12;

/** One position step at a given bit depth, in normalised [-1,+1] units. */
export function positionLsb(bits: number): number {
	return 2 / (Math.pow(2, bits) - 1);
}

export interface QuasistaticParams {
	/**
	 * The Controller's own output rate in samples/sec — PlayzerX's
	 * `SetSampleRate`. Distinct from reactoscope's audio rate: the device
	 * consumes its buffer at this rate, so commanded position steps rather than
	 * moving continuously. The demo treats anything outside 500..60000 as
	 * invalid; the API documents 200..50000 with a 22000 default.
	 */
	deviceSampleRate: number;
	/** Software filter family — MTIDataGenerator's FilterType (Bessel is 1, Butterworth 2). */
	filterType: FilterFamily;
	/** Filter order. Free in SetupSoftwareFilter; clamped to 1..8 here. */
	filterOrder: number;
	/** Software filter -3dB cutoff, in Hz. */
	cutoff: number;
	/**
	 * Forward-backward filtering, the default in `FilterData(..., zeroPhase)`.
	 * Removes group delay entirely at the cost of doubling the effective order
	 * (so the corner sits at -6dB rather than -3dB) and of being non-causal,
	 * which is only meaningful because the content is prepared as a whole buffer.
	 */
	zeroPhase: boolean;
	/** Normalised deflection ceiling — the MTIDeviceLimits VdifferenceMax analog. */
	angleLimit: number;
	/**
	 * Quantise the command to the device's position grid. X/Y reach the
	 * Controller as 12-bit integers, and the device's own repeatability
	 * (<0.01°) sits just under one step (0.0166°), so the grid does not wash
	 * out in mechanical noise. It also makes "settled" well-defined: settling
	 * below one step is meaningless on a device that cannot represent it.
	 */
	quantiseEnabled: boolean;
	/** Position grid depth in bits. The device is 12; other values are for exploring. */
	positionBits: number;
	/**
	 * Zero-vibration input shaping, the open-loop technique Mirrorcle documents
	 * as beating a plain lowpass by more than 12x. Measured here at roughly 4x
	 * more settled moves per second — but only when tuned accurately.
	 */
	shaperEnabled: boolean;
	/**
	 * The resonance the shaper is built for, which need not be the resonance the
	 * mirror actually has. Detuning this is the point: 5% of mismatch takes the
	 * shaper from 6x better than a lowpass to worse than none at all, which is
	 * the whole reason closed-loop control exists.
	 */
	shaperFreq: number;
	/** Whether to model the mirror's own mechanical response at all. */
	resonanceEnabled: boolean;
	/** The mirror's mechanical resonance, in Hz. */
	resonanceFreq: number;
	/** Resonance sharpness. ζ = 1/(2Q), so Q=100 is ζ=0.005. */
	resonanceQ: number;
}

export interface QuasistaticAxis extends ScannerAxis {
	clampedCount(): number;
}

function makeFilterStages(
	sampleRate: number,
	params: QuasistaticParams,
): BiquadSection[] {
	return lowpassSections(
		sampleRate,
		Math.min(params.cutoff, sampleRate / 4),
		params.filterType,
		params.filterOrder,
	).map(createBiquadSection);
}

export function createQuasistaticAxis(
	sampleRate: number,
	params: QuasistaticParams,
): QuasistaticAxis {
	const filter = makeFilterStages(sampleRate, params);

	// Second, independent copy of the same filter for the reverse pass. Only
	// built when zero-phase is on, and reset every frame — a backward pass that
	// carried state between frames would be running time backwards across a
	// seam.
	const reverseFilter = params.zeroPhase ? makeFilterStages(sampleRate, params) : null;

	// The mirror. Deliberately outside the zero-phase pass: a physical structure
	// cannot respond before it is driven, whatever the content pipeline did.
	const mirror: BiquadSection | null = params.resonanceEnabled
		? createBiquadSection(rbjLowpass(
			sampleRate,
			Math.min(params.resonanceFreq, sampleRate / 4),
			1 / (2 * Math.max(params.resonanceQ, 0.5)),
		))
		: null;

	const limit = Math.abs(params.angleLimit);

	// Input shaper, ahead of the filter: it shapes the command, it does not
	// filter it. Built from the *assumed* resonance (shaperFreq), which is
	// deliberately allowed to differ from the mirror's actual resonanceFreq.
	const shaperZeta = 1 / (2 * Math.max(params.resonanceQ, 0.5));
	const shaper = params.shaperEnabled
		? zvShaper(sampleRate, params.shaperFreq, shaperZeta)
		: null;
	const shaperDelay = shaper ? createFractionalDelay(shaper.delaySamples) : null;

	// Position grid. 4095 intervals across [-1,+1] for the device's 12 bits.
	const bits     = Math.min(24, Math.max(2, Math.round(params.positionBits)));
	const levels   = Math.pow(2, bits) - 1;
	const quantise = params.quantiseEnabled;

	// Device samples advanced per audio sample. At or above the audio rate the
	// hold is a no-op, which is the honest behaviour — the device is then
	// updating at least as often as we have data for it.
	const sps      = Math.min(Math.max(params.deviceSampleRate, MIN_DEVICE_SPS), MAX_DEVICE_SPS);
	const holdStep = sps / sampleRate;

	let holdPhase = 1;
	let held      = 0;
	let clamped   = 0;

	function runForward(buf: Float32Array): void {
		for (let n = 0; n < buf.length; n++) {
			let v = buf[n];
			for (let s = 0; s < filter.length; s++) v = filter[s].process(v);
			buf[n] = v;
		}
	}

	function runReverse(buf: Float32Array): void {
		const stages = reverseFilter!;
		for (const s of stages) s.reset(buf[buf.length - 1]);
		for (let n = buf.length - 1; n >= 0; n--) {
			let v = buf[n];
			for (let s = 0; s < stages.length; s++) v = stages[s].process(v);
			buf[n] = v;
		}
	}

	return {
		process(input: Float32Array): Float32Array {
			const out = new Float32Array(input.length);
			clamped = 0;

			for (let n = 0; n < input.length; n++) {
				// The clamp sits on the *command*, ahead of everything else,
				// because on real hardware the limit is on drive voltage — it
				// models a Controller that refuses to ask for an unsafe angle, not
				// a mirror physically prevented from reaching one.
				let v = input[n];
				if (v > limit)       { v = limit;  clamped++; }
				else if (v < -limit) { v = -limit; clamped++; }

				// Quantise to the position grid the command actually crosses the
				// wire on, before the hold — the Controller receives integers.
				if (quantise) {
					v = Math.round(((v + 1) / 2) * levels) / levels * 2 - 1;
				}

				// Zero-order hold at the device's own output rate.
				holdPhase += holdStep;
				if (holdPhase >= 1) {
					holdPhase -= Math.floor(holdPhase);
					held = v;
				}

				// Input shaping acts on the held command, splitting it into two
				// impulses whose mirror responses cancel.
				out[n] = shaper !== null
					? shaper.a1 * held + shaper.a2 * shaperDelay!.process(held)
					: held;
			}

			runForward(out);
			if (reverseFilter !== null) runReverse(out);

			if (mirror !== null) {
				for (let n = 0; n < out.length; n++) out[n] = mirror.process(out[n]);
			}
			return out;
		},

		reset(value: number): void {
			// Warm-start, never zero — same contract as the galvo axis. Every
			// section has unity DC gain, so a cascade settled at `value` has all
			// of its histories equal to it.
			const settled = Math.min(Math.max(value, -limit), limit);
			for (const s of filter) s.reset(settled);
			if (reverseFilter !== null) for (const s of reverseFilter) s.reset(settled);
			mirror?.reset(settled);
			shaperDelay?.reset(settled);
			held = settled;
			holdPhase = 1;
		},

		clampedCount(): number {
			return clamped;
		},
	};
}
