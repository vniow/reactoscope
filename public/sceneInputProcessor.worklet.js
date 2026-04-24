/**
 * AudioWorklet processor for the Scene Input node — coordinate-streaming model.
 *
 * Receives a coordinate buffer from the main thread (forwarded from the path
 * worker) and cycles through it at a configurable scan frequency, generating
 * 6-channel audio in real-time. No ring buffer, no SharedArrayBuffer, no Atomics.
 *
 * Coord buffer layout (STRIDE=7 floats per point, interleaved):
 *   [x, y, r, g, b, a, blank]
 *   x, y  — beam position in [-1, +1]
 *   r,g,b,a — color/intensity in [-1, +1] audio range
 *   blank — 0.0 = visible, 1.0 = blanked beam travel (color channels → -1)
 *
 * Messages accepted via port:
 *   { type: 'path',     data: ArrayBuffer, nPoints: number }  — new coord frame
 *   { type: 'scanFreq', value: number }                       — scan Hz (default 50)
 *
 * Self-healing: if no new frame arrives, the worklet loops through the last
 * known coords indefinitely — no audio gap on a dropped frame.
 */

const STRIDE = 7;

// ─── Console styling ──────────────────────────────────────────────────────────
const _INFO = [
	'%c SceneInput Worklet %c',
	'background:#1a1a2e;color:#4fc3f7;font-weight:bold;padding:2px 6px;border-radius:3px',
	'color:inherit',
];
const _OK = [
	'%c SceneInput Worklet %c',
	'background:#1b5e20;color:#a5d6a7;font-weight:bold;padding:2px 6px;border-radius:3px',
	'color:inherit',
];
const _WARN = [
	'%c SceneInput Worklet %c',
	'background:#e65100;color:#fff;font-weight:bold;padding:2px 6px;border-radius:3px',
	'color:inherit',
];

class SceneInputProcessor extends AudioWorkletProcessor {
	constructor(options) {
		super(options);

		this._coords   = null;   // Float32Array — interleaved coord buffer
		this._nPoints  = 0;
		this._index    = 0;      // floating-point position in [0, 1)
		this._scanFreq = 50;     // Hz — full traces per second

		this._firstProcess = true;
		this._frameCount   = 0;

		this.port.onmessage = (e) => {
			if (e.data.type === 'path') {
				this._coords  = new Float32Array(e.data.data);
				this._nPoints = e.data.nPoints;
				this._frameCount++;
				// Do NOT reset _index — smooth transition between frames
				if (this._frameCount === 1) {
					const msg = `First coord frame received — nPoints: ${this._nPoints}, scanFreq: ${this._scanFreq} Hz`;
					this.port.postMessage({ type: 'log', level: 'info', msg });
					console.log(..._OK, msg);
				}
			} else if (e.data.type === 'scanFreq') {
				this._scanFreq = e.data.value;
				const msg = `Scan frequency updated — ${this._scanFreq} Hz`;
				this.port.postMessage({ type: 'log', level: 'info', msg });
				console.log(..._INFO, msg);
			}
		};

		const msg = `Processor instantiated — sampleRate: ${sampleRate} Hz, mode: coordinate-streaming`;
		this.port.postMessage({ type: 'log', level: 'info', msg });
		console.log(..._INFO, msg);
	}

	process(_inputs, outputs) {
		const out      = outputs[0];
		const nSamples = out[0]?.length ?? 128;

		if (this._firstProcess) {
			this._firstProcess = false;
			console.log(
				..._OK,
				`First process() — frame: ${currentFrame}, time: ${currentTime.toFixed(3)} s`,
			);
		}

		// No coords yet — output silence
		if (!this._coords || this._nPoints === 0) {
			for (const ch of out) if (ch) ch.fill(0);
			return true;
		}

		// step = fraction of the coord array to advance per sample
		// At scanFreq Hz, one full cycle = sampleRate / scanFreq samples
		const step = this._scanFreq / sampleRate;

		for (let i = 0; i < nSamples; i++) {
			const pos   = Math.floor(this._index * this._nPoints) % this._nPoints;
			const o     = pos * STRIDE;
			const x     = this._coords[o];
			const y     = this._coords[o + 1];
			const r     = this._coords[o + 2];
			const g     = this._coords[o + 3];
			const b     = this._coords[o + 4];
			const a     = this._coords[o + 5];
			const blank = this._coords[o + 6] > 0.5;

			if (out[0]) out[0][i] = x;
			if (out[1]) out[1][i] = y;
			// Blank travel: beam still moves (XY) but color channels are silent
			if (out[2]) out[2][i] = blank ? -1 : r;
			if (out[3]) out[3][i] = blank ? -1 : g;
			if (out[4]) out[4][i] = blank ? -1 : b;
			if (out[5]) out[5][i] = blank ? -1 : a;

			this._index = (this._index + step) % 1.0;
		}

		return true;
	}
}

registerProcessor('scene-input-processor', SceneInputProcessor);
