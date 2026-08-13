/**
 * Audio context setup — reads sample-rate and ring-buffer settings from
 * localStorage and pre-configures Tone.js BEFORE any Tone objects are created.
 *
 * Call initToneContext() once at application startup, before any module that
 * uses Tone.js is imported.  daw.ts calls getContext() synchronously on module
 * load, so initToneContext() must fire before daw.ts is first imported.
 */
import { setContext, Context as ToneContext } from 'tone';

// ─── Sample rate ──────────────────────────────────────────────────────────────

export const SAMPLE_RATE_OPTIONS = [44100, 48000, 96000, 192000] as const;
export type SampleRate = (typeof SAMPLE_RATE_OPTIONS)[number];

const SAMPLE_RATE_KEY = 'reactoscope-sample-rate';

export function getStoredSampleRate(): SampleRate {
	try {
		const parsed = parseInt(localStorage.getItem(SAMPLE_RATE_KEY) ?? '', 10);
		if ((SAMPLE_RATE_OPTIONS as readonly number[]).includes(parsed)) return parsed as SampleRate;
	} catch { /* storage unavailable */ }
	return 48000;
}

export function setStoredSampleRate(rate: SampleRate): void {
	try { localStorage.setItem(SAMPLE_RATE_KEY, String(rate)); } catch {}
}

// ─── Ring buffer frames ───────────────────────────────────────────────────────

export const RING_FRAMES_OPTIONS = [10, 20, 30, 60] as const;
export type RingFrames = (typeof RING_FRAMES_OPTIONS)[number];

const RING_FRAMES_KEY = 'reactoscope-ring-frames';

export function getStoredRingFrames(): RingFrames {
	try {
		const parsed = parseInt(localStorage.getItem(RING_FRAMES_KEY) ?? '', 10);
		if ((RING_FRAMES_OPTIONS as readonly number[]).includes(parsed)) return parsed as RingFrames;
	} catch {}
	return 60;
}

export function setStoredRingFrames(frames: RingFrames): void {
	try { localStorage.setItem(RING_FRAMES_KEY, String(frames)); } catch {}
}

// ─── Tone.js context initialisation ──────────────────────────────────────────

/**
 * Create an AudioContext with the stored sample rate and register it with
 * Tone.js.  Must be called before any Tone object is instantiated — Tone's
 * default context is otherwise created lazily on the first getContext() call
 * (which happens inside daw.ts on module load).
 */
export function initToneContext(): void {
	const sampleRate = getStoredSampleRate();
	try {
		const audioCtx = new AudioContext({ sampleRate });
		setContext(new ToneContext(audioCtx));
	} catch {
		// If the browser rejects the requested rate, fall through to Tone's default.
	}
}
