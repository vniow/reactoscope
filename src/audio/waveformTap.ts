import { getWaveformData } from './master';
import type { WaveformFrame } from './master';
import { getWaveformDataFromSAB, getWaveformWriteIndex } from './capture';

// ─── Waveform Tap — the read path from Master Output to a renderer ────────────
// Two adapters exist behind this seam: the capture worklet's pushed frames
// (preferred, dedup'd via write-index) and the analyser snapshot (fallback,
// used before the capture worklet's first frame arrives). Readers should not
// need to know which one produced a frame, but they are told whether it
// *continues* the previous one they consumed — a stateful reader (see the
// Scanner Model, src/galvo/scannerModel.ts) cannot be correct without this;
// a stateless one (the existing CRT/Sweep renderers) can simply ignore it.

/**
 * Whether a returned frame can be treated as picking up exactly where the
 * last one left off:
 *  - 'contiguous'   — the capture worklet's write-index advanced by exactly 1
 *  - 'gap'          — it advanced by more than 1 (one or more frames dropped)
 *  - 'sourceChanged'— the analyser fallback is in use, or the buffer length
 *                      changed underneath (setWaveformCaptureSize resizes the
 *                      accumulator without resetting the write-index, so a
 *                      pure index-delta check would miss this)
 *  - 'first'        — this cursor has never successfully read a frame before
 * Anything other than 'contiguous' means: don't assume state carried across
 * this boundary is meaningful — warm-start instead.
 */
export type TapContinuity = 'contiguous' | 'gap' | 'sourceChanged' | 'first';

export interface TapFrame extends WaveformFrame {
	continuity: TapContinuity;
}

/**
 * A reader's position in the capture tap's frame sequence. Each reader keeps
 * its own cursor (e.g. in a useRef) — renderers run on independent loops, so
 * "have I seen this frame" can't be shared state. `lastNSamples` starts at
 * -1, a value the real buffer length can never take, so the first read is
 * unambiguously reported as 'first' rather than coinciding numerically with
 * an ordinary write-index delta of 1.
 */
export type TapCursor = { last: number; lastNSamples: number };

/**
 * Reads the Waveform Tap. Returns the newest frame, or null when the capture
 * tap is live but hasn't produced a new frame since `cursor` — callers should
 * skip the render in that case rather than redraw stale data.
 */
export function readWaveformTap(cursor: TapCursor): TapFrame | null {
	const sab = getWaveformDataFromSAB();

	if (sab === null) {
		// No write-index concept on this path at all — every read is a fresh,
		// arbitrarily-windowed analyser snapshot, never truly contiguous with
		// whatever was read before, even call-to-call while still on this path.
		const frame = getWaveformData();
		cursor.lastNSamples = frame.x.length;
		return { ...frame, continuity: 'sourceChanged' };
	}

	const writeIndex = getWaveformWriteIndex();
	if (writeIndex === cursor.last) return null;

	let continuity: TapContinuity;
	if (cursor.lastNSamples === -1)          continuity = 'first';
	else if (sab.x.length !== cursor.lastNSamples) continuity = 'sourceChanged';
	else if (writeIndex - cursor.last === 1)  continuity = 'contiguous';
	else                                       continuity = 'gap';

	cursor.last = writeIndex;
	cursor.lastNSamples = sab.x.length;
	return { ...sab, continuity };
}
