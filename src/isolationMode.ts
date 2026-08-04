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
 *
 * `?exclude=sceneInput,waveformCapture` — orthogonal to `isolate`: skips
 * bringing up the named audio component(s) in initAudioEngine(), so a soak
 * can bisect within the audio engine itself (Master Output is the
 * unavoidable baseline — nothing excludes it). See Wayfinder issue #9.
 */

export type IsolationMode = 'audio' | 'viz' | null;
export type AudioComponent = 'sceneInput' | 'waveformCapture';

function readIsolationMode(): IsolationMode {
	if (typeof window === 'undefined') return null;
	const value = new URLSearchParams(window.location.search).get('isolate');
	return value === 'audio' || value === 'viz' ? value : null;
}

function readExcludedAudioComponents(): Set<AudioComponent> {
	if (typeof window === 'undefined') return new Set();
	const raw = new URLSearchParams(window.location.search).get('exclude') ?? '';
	const valid: AudioComponent[] = ['sceneInput', 'waveformCapture'];
	return new Set(
		raw.split(',').filter((v): v is AudioComponent => (valid as string[]).includes(v)),
	);
}

export const isolationMode: IsolationMode = readIsolationMode();
export const excludedAudioComponents: Set<AudioComponent> = readExcludedAudioComponents();
