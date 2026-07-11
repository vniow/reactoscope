/* eslint-disable @typescript-eslint/no-explicit-any */
// Minimal in-memory stand-in for the 'tone' package, shaped for the audio
// engine's tests. Mirrors only the semantics the engine relies on:
//  - sources are single-use (state machine start/stop, never restartable is
//    NOT enforced here — the engine recreates before restart, tests assert it)
//  - option-object constructors materialise signal params as { value }
//  - connect/dispose are recorded so tests can assert wiring and cleanup

const SIGNAL_KEYS = new Set([
	'frequency', 'detune', 'modulationIndex', 'harmonicity',
	'width', 'modulationFrequency', 'volume',
]);

export class MockToneNode {
	state: 'stopped' | 'started' = 'stopped';
	disposed = false;
	connections: unknown[] = [];
	onstop: (() => void) | null = null;

	constructor(opts?: unknown) {
		if (opts && typeof opts === 'object') {
			for (const [k, v] of Object.entries(opts)) {
				(this as any)[k] = SIGNAL_KEYS.has(k) ? { value: v } : v;
			}
		}
	}

	start() { this.state = 'started'; return this; }
	stop()  { this.state = 'stopped'; this.onstop?.(); return this; }
	dispose() { this.disposed = true; return this; }
	connect(dest: unknown) { this.connections.push(dest); return this; }
	disconnect() { return this; }
	toDestination() { return this; }
}

export class Oscillator      extends MockToneNode {}
export class Noise           extends MockToneNode {}
export class LFO             extends MockToneNode {}
export class FMOscillator    extends MockToneNode {}
export class AMOscillator    extends MockToneNode {}
export class FatOscillator   extends MockToneNode {}
export class PulseOscillator extends MockToneNode {}
export class PWMOscillator   extends MockToneNode {}

export class Gain extends MockToneNode {
	gain: { value: number };
	constructor(v: number = 1) {
		super();
		this.gain = { value: v };
	}
}

export class Signal extends MockToneNode {
	value: number;
	constructor(v: number = 0) {
		super();
		this.value = v;
	}
}

export class Analyser extends MockToneNode {
	size: number;
	constructor(_type: string, size: number) {
		super();
		this.size = size;
	}
	getValue() { return new Float32Array(this.size); }
}

export class Merge extends MockToneNode {
	output = { connect: () => {} };
}

export class Split extends MockToneNode {
	input  = new MockToneNode();
	output = { connect: () => {}, disconnect: () => {} };
}

export class Player extends MockToneNode {
	loaded = false;
	mute = false;
	loop = false;
	playbackRate = 1;
	buffer = { duration: 0 };
	async load() { this.loaded = true; return this; }
}

export class GrainPlayer extends MockToneNode {
	mute = false;
	buffer = {
		loaded: false,
		duration: 0,
		load: async () => {},
	};
}

export class UserMedia extends MockToneNode {
	opened = false;
	async open() { this.opened = true; return this; }
	close() { this.opened = false; return this; }
}

export class Reverb           extends MockToneNode {}
export class JCReverb         extends MockToneNode {}
export class Freeverb         extends MockToneNode {}
export class Delay            extends MockToneNode {}
export class FeedbackDelay    extends MockToneNode {}
export class PingPongDelay    extends MockToneNode {}
export class Distortion       extends MockToneNode {}
export class Chebyshev        extends MockToneNode {}
export class BitCrusher       extends MockToneNode {}
export class FrequencyShifter extends MockToneNode {}
export class PitchShift       extends MockToneNode {}
export class StereoWidener    extends MockToneNode {}
export class Chorus           extends MockToneNode {}
export class Phaser           extends MockToneNode {}
export class Tremolo          extends MockToneNode {}
export class Vibrato          extends MockToneNode {}
export class AutoFilter       extends MockToneNode {}
export class AutoPanner       extends MockToneNode {}
export class AutoWah          extends MockToneNode {}

const _transport = {
	seconds: 0,
	stop: () => {},
	start: () => {},
};

export function getTransport() { return _transport; }

export function getContext() {
	return {
		rawContext: { sampleRate: 48000, currentTime: 0 },
		createAudioWorkletNode: () => {
			throw new Error('AudioWorklets are not available in tests');
		},
	};
}

export async function start() { /* audio context resume — no-op in tests */ }
