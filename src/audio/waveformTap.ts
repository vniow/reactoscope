import { getWaveformData } from './master';
import type { WaveformFrame } from './master';
import { getWaveformDataFromSAB, getWaveformWriteIndex } from './capture';

// ─── Waveform Tap — the read path from Master Output to a renderer ────────────
// Two adapters exist behind this seam: the capture worklet's pushed frames
// (preferred, dedup'd via write-index) and the analyser snapshot (fallback,
// used before the capture worklet's first frame arrives). Callers should not
// need to know which one produced a given frame.

/**
 * A reader's position in the capture tap's frame sequence. Each reader keeps
 * its own cursor (e.g. in a useRef) — renderers run on independent loops, so
 * "have I seen this frame" can't be shared state.
 */
export type TapCursor = { last: number };

/**
 * Reads the Waveform Tap. Returns the newest frame, or null when the capture
 * tap is live but hasn't produced a new frame since `cursor` — callers should
 * skip the render in that case rather than redraw stale data.
 */
export function readWaveformTap(cursor: TapCursor): WaveformFrame | null {
	const sab = getWaveformDataFromSAB();
	if (sab === null) return getWaveformData();

	const writeIndex = getWaveformWriteIndex();
	if (writeIndex === cursor.last) return null;
	cursor.last = writeIndex;
	return sab;
}
