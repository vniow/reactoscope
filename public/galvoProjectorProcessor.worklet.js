/**
 * AudioWorklet — galvo + laser-modulator transducer stage.
 *
 * Taps the same 6-channel master output bus the waveform-capture worklet does,
 * runs the signal through the galvo physics, and writes the post-transducer
 * stream into a continuous ring buffer in a SharedArrayBuffer. In laser mode
 * the visualiser reads "samples since last frame" from this ring and deposits
 * only that arc with wall-clock decay (persistence-of-vision), so brightness
 * and flicker track the real scan rate. Scope mode still reads the waveform SAB.
 *
 * Channels: x, y, r, g, b, a. The first five run through filters; `a` (alpha /
 * intensity authoring channel) passes through untouched.
 *
 *   x, y  — 2nd-order LPF biquad per axis (mass-spring-damper servo)
 *   r,g,b — 1-pole LPF per channel (modulator rise/fall time)
 *
 * Math mirrors src/laser/galvoModel.ts — keep them in sync. The TS module is
 * the canonical reference and has unit tests; the worklet duplicates the
 * formulas because AudioWorklet modules can't pull in ES imports without
 * additional bundling.
 *
 * Messages accepted via port:
 *   { type: 'sabBuffer', buffer: SharedArrayBuffer, ringLen: number }
 *   { type: 'resize',    buffer: SharedArrayBuffer, ringLen: number }
 *   { type: 'params',    bandwidthHz, dampingRatio, modulatorTauUs }
 *
 * SAB layout:
 *   [writeCount: Uint32(4B)] + [ch0..ch5: Float32[ringLen] each]
 *   writeCount = total samples ever written (monotonic, wraps at 2^32). The
 *   live ring index for sample n is (n % ringLen).
 */

const CH = 6;

// ─── Console styling ──────────────────────────────────────────────────────────
const _INFO = [
	'%c GalvoProjector Worklet %c',
	'background:#1a1a2e;color:#ffb74d;font-weight:bold;padding:2px 6px;border-radius:3px',
	'color:inherit',
];
const _OK = [
	'%c GalvoProjector Worklet %c',
	'background:#1b5e20;color:#a5d6a7;font-weight:bold;padding:2px 6px;border-radius:3px',
	'color:inherit',
];

function biquadLpf(fc, zeta, sr) {
	const fcMax  = sr * 0.45;
	const fcSafe = Math.min(Math.max(fc, 1), fcMax);
	const Q      = 1 / (2 * Math.max(zeta, 1e-3));
	const w0     = 2 * Math.PI * fcSafe / sr;
	const cosW0  = Math.cos(w0);
	const sinW0  = Math.sin(w0);
	const alpha  = sinW0 / (2 * Q);

	const a0 =  1 + alpha;
	return {
		b0: ((1 - cosW0) / 2) / a0,
		b1: ( 1 - cosW0)       / a0,
		b2: ((1 - cosW0) / 2) / a0,
		a1: (-2 * cosW0)       / a0,
		a2: ( 1 - alpha)       / a0,
	};
}

function onePoleAlpha(tauUs, sr) {
	if (tauUs <= 0) return 1;
	return 1 - Math.exp(-(1 / sr) / (tauUs * 1e-6));
}

class GalvoProjectorProcessor extends AudioWorkletProcessor {
	constructor(options) {
		super(options);
		// Continuous ring buffer: the worklet writes every post-galvo sample into
		// a circular per-channel buffer and publishes a monotonic writeCount. The
		// visualiser reads "samples since I last looked" and deposits only that arc
		// with wall-clock decay — so the rendered brightness/flicker tracks the
		// real scan rate (PPS) instead of a fixed analysis window.
		this._ringLen      = options?.processorOptions?.ringLen ?? 24000;
		this._writeCount   = 0;     // total samples written (monotonic, wraps at 2^32)
		this._countView    = null;  // Uint32 at SAB offset 0
		this._channelViews = null;  // 6 × Float32Array(ringLen)

		// Galvo / modulator state — DF2T biquads for X, Y; 1-pole state for R, G, B.
		this._bandwidthHz    = 18_000;
		this._dampingRatio   = 0.65;
		this._modulatorTauUs = 5;
		this._coeffs = biquadLpf(this._bandwidthHz, this._dampingRatio, sampleRate);
		this._alpha  = onePoleAlpha(this._modulatorTauUs, sampleRate);
		this._zX1 = 0; this._zX2 = 0;
		this._zY1 = 0; this._zY2 = 0;
		this._yR  = 0; this._yG  = 0; this._yB = 0;

		this.port.onmessage = (e) => {
			const { type, buffer, ringLen, bandwidthHz, dampingRatio, modulatorTauUs } = e.data;
			if (type === 'sabBuffer' || type === 'resize') {
				this._ringLen    = ringLen;
				this._writeCount = 0;
				this._setupSAB(buffer, ringLen);
			} else if (type === 'params') {
				if (typeof bandwidthHz    === 'number') this._bandwidthHz    = bandwidthHz;
				if (typeof dampingRatio   === 'number') this._dampingRatio   = dampingRatio;
				if (typeof modulatorTauUs === 'number') this._modulatorTauUs = modulatorTauUs;
				this._coeffs = biquadLpf(this._bandwidthHz, this._dampingRatio, sampleRate);
				this._alpha  = onePoleAlpha(this._modulatorTauUs, sampleRate);
				const msg = `Params — bw=${this._bandwidthHz} Hz ζ=${this._dampingRatio} τ=${this._modulatorTauUs} µs`;
				this.port.postMessage({ type: 'log', level: 'info', msg });
				console.log(..._INFO, msg);
			}
		};

		const msg = `Processor instantiated — sampleRate: ${sampleRate} Hz`;
		this.port.postMessage({ type: 'log', level: 'info', msg });
		console.log(..._OK, msg);
	}

	_setupSAB(buffer, ringLen) {
		this._countView    = new Uint32Array(buffer, 0, 1);
		this._channelViews = [];
		for (let ch = 0; ch < CH; ch++) {
			this._channelViews.push(new Float32Array(buffer, 4 + ch * ringLen * 4, ringLen));
		}
		Atomics.store(this._countView, 0, 0);
	}

	process(inputs) {
		const input = inputs[0];
		if (!input || !input[0]) return true;
		if (!this._channelViews) return true;

		const blockSize = input[0].length;
		const ringLen   = this._ringLen;
		const c = this._coeffs;
		const a = this._alpha;

		const inX = input[0];
		const inY = input[1] ?? input[0];
		const inR = input[2] ?? input[0];
		const inG = input[3] ?? input[0];
		const inB = input[4] ?? input[0];
		const inA = input[5] ?? input[0];

		const ringX = this._channelViews[0];
		const ringY = this._channelViews[1];
		const ringR = this._channelViews[2];
		const ringG = this._channelViews[3];
		const ringB = this._channelViews[4];
		const ringA = this._channelViews[5];

		let zX1 = this._zX1, zX2 = this._zX2;
		let zY1 = this._zY1, zY2 = this._zY2;
		let yR  = this._yR,  yG  = this._yG,  yB = this._yB;
		let wc  = this._writeCount;

		for (let i = 0; i < blockSize; i++) {
			const ix = inX[i] ?? 0;
			const iy = inY[i] ?? 0;
			const ir = inR[i] ?? 0;
			const ig = inG[i] ?? 0;
			const ib = inB[i] ?? 0;
			const ia = inA[i] ?? 0;

			// DF2T biquad: y = b0·x + z1; z1' = b1·x - a1·y + z2; z2' = b2·x - a2·y
			const ox = c.b0 * ix + zX1;
			zX1 = c.b1 * ix - c.a1 * ox + zX2;
			zX2 = c.b2 * ix - c.a2 * ox;

			const oy = c.b0 * iy + zY1;
			zY1 = c.b1 * iy - c.a1 * oy + zY2;
			zY2 = c.b2 * iy - c.a2 * oy;

			yR += (ir - yR) * a;
			yG += (ig - yG) * a;
			yB += (ib - yB) * a;

			const idx = wc % ringLen;
			ringX[idx] = ox;
			ringY[idx] = oy;
			ringR[idx] = yR;
			ringG[idx] = yG;
			ringB[idx] = yB;
			ringA[idx] = ia; // intensity / authoring channel passes through
			wc = (wc + 1) >>> 0; // keep within Uint32 range
		}

		this._zX1 = zX1; this._zX2 = zX2;
		this._zY1 = zY1; this._zY2 = zY2;
		this._yR  = yR;  this._yG  = yG;  this._yB = yB;
		this._writeCount = wc;

		// Commit the new write position once per block (sub-3ms granularity).
		Atomics.store(this._countView, 0, wc);

		return true;
	}
}

registerProcessor('galvo-projector', GalvoProjectorProcessor);
