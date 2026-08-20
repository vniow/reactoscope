/**
 * AudioWorklet processor for the Scene Input node — coordinate-streaming model.
 *
 * Receives a coordinate buffer from the main thread (forwarded from the path
 * worker) and cycles through it at a configurable scan frequency, generating
 * 6-channel audio in real-time. No ring buffer, no SharedArrayBuffer, no Atomics.
 *
 * Coord buffer layout (STRIDE=6 floats per point, interleaved):
 *   [x, y, r, g, b, z]
 *   x, y — beam position in [-1, +1]
 *   r,g,b — color in [-1, +1] audio range
 *   z — analog intensity/blanking channel in [-1, +1]: -1 = beam off,
 *       +1 = full intensity, continuous in between (no boolean blank flag)
 *
 * Messages accepted via port:
 *   { type: 'path',     data: ArrayBuffer, nPoints: number }  — new coord frame
 *   { type: 'scanFreq', value: number }                       — scan Hz (default 50)
 *
 * Self-healing: if no new frame arrives, the worklet loops through the last
 * known coords indefinitely — no audio gap on a dropped frame.
 */

const STRIDE = 6;

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

		this._coords     = null;   // Float32Array — interleaved coord buffer
		this._nPoints    = 0;
		this._index      = 0;      // floating-point position in [0, 1)
		this._scanFreq   = 50;     // Hz — full traces per second
		this._phaseView  = null;   // Float32Array over SharedArrayBuffer from main thread

		this._firstProcess = true;
		this._frameCount   = 0;

		// ─── Memory-leak-harness instrumentation ───────────────────────────────────────
		// The audio thread is invisible to performance.memory, heap snapshots, and
		// renderer.info — this is the only channel that reports what's actually
		// happening inside the worklet over a long run. Throttled to 1/sec so it
		// doesn't add per-block overhead of its own.
		this._processCallCount = 0;
		this._maxNPointsSeen   = 0;
		this._lastStatsTime    = 0;

		this.port.onmessage = (e) => {
			if (e.data.type === 'path') {
				const newCoords  = new Float32Array(e.data.data);
				const newNPoints = e.data.nPoints;

				// Phase-matched buffer swap: find the nearest point in the new buffer
				// to the current beam position so the transition has no spatial jump.
				// Without this, a different orderSegments traversal on the new frame
				// maps the same _index to a different spatial position → spikey glitch.
				if (this._coords && this._nPoints > 0 && newNPoints > 0) {
					const curPos = Math.floor(this._index * this._nPoints) % this._nPoints;
					const curX   = this._coords[curPos * STRIDE];
					const curY   = this._coords[curPos * STRIDE + 1];
					let bestIdx  = 0;
					let bestDist = Infinity;
					for (let i = 0; i < newNPoints; i++) {
						const nx = newCoords[i * STRIDE];
						const ny = newCoords[i * STRIDE + 1];
						const d  = (nx - curX) * (nx - curX) + (ny - curY) * (ny - curY);
						if (d < bestDist) { bestDist = d; bestIdx = i; }
					}
					this._index = bestIdx / newNPoints;
				}

				this._coords  = newCoords;
				this._nPoints = newNPoints;
				this._frameCount++;
				if (this._frameCount === 1) {
					const msg = `First coord frame received — nPoints: ${this._nPoints}, scanFreq: ${this._scanFreq} Hz`;
					this.port.postMessage({ type: 'log', level: 'info', msg });
					console.log(..._OK, msg);
				}
			} else if (e.data.type === 'clear') {
				this._coords  = null;
				this._nPoints = 0;
				this._index   = 0;
			} else if (e.data.type === 'scanFreq') {
				this._scanFreq = e.data.value;
				const msg = `Scan frequency updated — ${this._scanFreq} Hz`;
				this.port.postMessage({ type: 'log', level: 'info', msg });
				console.log(..._INFO, msg);
			} else if (e.data.type === 'phaseBuffer') {
				this._phaseView = new Float32Array(e.data.buffer);
			}
		};

		const msg = `Processor instantiated — sampleRate: ${sampleRate} Hz, mode: coordinate-streaming`;
		this.port.postMessage({ type: 'log', level: 'info', msg });
		console.log(..._INFO, msg);
	}

	process(_inputs, outputs) {
		const out      = outputs[0];
		const nSamples = out[0]?.length ?? 128;

		this._processCallCount++;
		this._maxNPointsSeen = Math.max(this._maxNPointsSeen, this._nPoints);

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
			const scaled = this._index * this._nPoints;
			const pos0   = Math.floor(scaled) % this._nPoints;
			const pos1   = (pos0 + 1) % this._nPoints;
			const frac   = scaled - Math.floor(scaled);
			const o0     = pos0 * STRIDE;
			const o1     = pos1 * STRIDE;

			// Linear interpolation between adjacent coordinate points
			const x = this._coords[o0]     + frac * (this._coords[o1]     - this._coords[o0]);
			const y = this._coords[o0 + 1] + frac * (this._coords[o1 + 1] - this._coords[o0 + 1]);
			const r = this._coords[o0 + 2] + frac * (this._coords[o1 + 2] - this._coords[o0 + 2]);
			const g = this._coords[o0 + 3] + frac * (this._coords[o1 + 3] - this._coords[o0 + 3]);
			const b = this._coords[o0 + 4] + frac * (this._coords[o1 + 4] - this._coords[o0 + 4]);
			const z = this._coords[o0 + 5] + frac * (this._coords[o1 + 5] - this._coords[o0 + 5]);

			// Clamp guards against corrupt buffer data causing runaway deflection
			if (out[0]) out[0][i] = x < -1.5 ? -1 : x > 1.5 ? 1 : x;
			if (out[1]) out[1][i] = y < -1.5 ? -1 : y > 1.5 ? 1 : y;
			if (out[2]) out[2][i] = r;
			if (out[3]) out[3][i] = g;
			if (out[4]) out[4][i] = b;
			if (out[5]) out[5][i] = z;

			this._index = (this._index + step) % 1.0;
		}

		// Publish the phase so the main thread can read the exact cycle position
		// without relying on audioContext.currentTime inference.
		if (this._phaseView) this._phaseView[0] = this._index;

		// Throttled stats ping — once per second of audio time, not per block.
		if (currentTime - this._lastStatsTime >= 1) {
			this._lastStatsTime = currentTime;
			this.port.postMessage({
				type:             'stats',
				processCallCount: this._processCallCount,
				frameSwapCount:   this._frameCount,
				nPoints:          this._nPoints,
				maxNPointsSeen:   this._maxNPointsSeen,
				currentTime,
			});
		}

		return true;
	}
}

registerProcessor('scene-input-processor', SceneInputProcessor);
