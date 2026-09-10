import type { TapContinuity } from './waveformTap';

// ─── Tap throughput meter ───────────────────────────────────────────────────
// Measures the Master Output's actual point rate (kpps) directly from the
// Waveform Tap, rather than reading the AudioContext's nominal sample rate.
// One point = one audio sample (the ILDA/real-DAC convention — see
// docs/galvo-laser-emulator.md's Readouts section), so under normal playback
// this converges on the sample rate, but it genuinely dips when the tap
// stalls (a dropped rAF, a backgrounded tab) — that's the point of measuring
// it instead of just reporting a constant. Device-neutral: this has nothing
// to do with the Scanner Model, so it lives in src/audio, not src/galvo.
//
// Pure math, no audio/DOM/React dependency, so it's testable the same way
// scannerModel.ts is — the caller supplies wall-clock time and a
// pre-computed sample count per call, since only it (holding the TapCursor)
// knows how many samples a given read actually represents.

export interface TapThroughputMeter {
	/**
	 * Call once per tap read that yielded a new frame. `samplesThisFrame` is
	 * the number of audio samples that frame represents — for a 'gap' read
	 * this must include the dropped frames too (writeIndex delta × frame
	 * size), not just the latest frame's own length, or a gap would silently
	 * under-report the true rate.
	 *
	 * 'sourceChanged' and 'first' reads discard the current window instead of
	 * accumulating it: an analyser-fallback frame is an arbitrarily-windowed
	 * snapshot with no "new samples since last read" meaning, and a buffer
	 * resize changes what a sample count even means mid-window.
	 */
	recordFrame(samplesThisFrame: number, continuity: TapContinuity, nowMs: number): void;
	/** Most recently completed window's rate, in kpps. `null` until the first window closes. */
	readonly kpps: number | null;
}

const DEFAULT_MIN_WINDOW_SECONDS = 0.25;

export function createTapThroughputMeter(minWindowSeconds = DEFAULT_MIN_WINDOW_SECONDS): TapThroughputMeter {
	let windowSamples = 0;
	let windowStartMs: number | null = null;
	let lastKpps: number | null = null;

	return {
		recordFrame(samplesThisFrame, continuity, nowMs) {
			if (continuity === 'sourceChanged' || continuity === 'first') {
				windowSamples = 0;
				windowStartMs = nowMs;
				return;
			}

			if (windowStartMs === null) windowStartMs = nowMs;
			windowSamples += samplesThisFrame;

			const elapsedSeconds = (nowMs - windowStartMs) / 1000;
			if (elapsedSeconds >= minWindowSeconds) {
				lastKpps = windowSamples / elapsedSeconds / 1000;
				windowSamples = 0;
				windowStartMs = nowMs;
			}
		},
		get kpps() {
			return lastKpps;
		},
	};
}
