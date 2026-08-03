/**
 * Memory-leak-harness isolation mode, read once from the URL at boot.
 *
 * `?isolate=viz`   — WebGL rendering only; the audio engine never starts.
 * `?isolate=audio` — audio engine only; no canvases mount, and Scene Input's
 *                    worklet is seeded with a static synthetic coord buffer
 *                    instead of a live WebGL scan (see seedSyntheticCoordBuffer
 *                    in audio/sceneInput.ts).
 *
 * See Wayfinder issue #4 (vniow/reactoscope) for the design rationale.
 */

export type IsolationMode = 'audio' | 'viz' | null;

function readIsolationMode(): IsolationMode {
	if (typeof window === 'undefined') return null;
	const value = new URLSearchParams(window.location.search).get('isolate');
	return value === 'audio' || value === 'viz' ? value : null;
}

export const isolationMode: IsolationMode = readIsolationMode();
