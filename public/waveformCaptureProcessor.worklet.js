class WaveformCaptureProcessor extends AudioWorkletProcessor {
	constructor(options) {
		super(options);
		this._nSamples = options?.processorOptions?.nSamples ?? 2048;
		this._accumPos = 0;
		this._accum = Array.from(
			{ length: 6 },
			() => new Float32Array(this._nSamples),
		);
		this._writeIndexView = null;
		this._channelViews = null;

		// ─── Bisection-map liveness instrumentation ────────────────────────────────
		// This worklet is created via the same Tone.js-ponyfilled createAudioWorkletNode
		// path as Scene Input's (see issue #6 — that worklet can stop being pulled
		// entirely after 2 render quanta in some configs). A flat memory reading from
		// this worklet running alone is only meaningful if it's provably still being
		// called — this ping is that proof. Throttled to 1/sec, mirrors
		// sceneInputProcessor.worklet.js's stats mechanism.
		this._processCallCount = 0;
		this._flushCount       = 0;
		this._lastStatsTime    = 0;

		this.port.onmessage = (e) => {
			const { type, buffer, nSamples } = e.data;
			if (type === 'sabBuffer' || type === 'resize') {
				this._nSamples = nSamples;
				this._accumPos = 0;
				this._accum = Array.from(
					{ length: 6 },
					() => new Float32Array(nSamples),
				);
				this._setupSAB(buffer, nSamples);
			}
		};
	}

	_setupSAB(buffer, nSamples) {
		this._writeIndexView = new Uint32Array(buffer, 0, 1);
		this._channelViews = [];
		for (let ch = 0; ch < 6; ch++) {
			this._channelViews.push(
				new Float32Array(buffer, 4 + ch * nSamples * 4, nSamples),
			);
		}
	}

	_flushFrame() {
		if (!this._writeIndexView || !this._channelViews) return;
		for (let ch = 0; ch < 6; ch++) this._channelViews[ch].set(this._accum[ch]);
		Atomics.add(this._writeIndexView, 0, 1);
		this.port.postMessage({ type: 'frame', nSamples: this._nSamples });
	}

	process(inputs) {
		this._processCallCount++;

		// Throttled liveness ping — once per second of audio time, unconditional
		// (fires even with no input connected), so a bisection soak can tell "this
		// worklet stopped being pulled" apart from "this worklet has nothing to do."
		if (currentTime - this._lastStatsTime >= 1) {
			this._lastStatsTime = currentTime;
			this.port.postMessage({
				type:             'stats',
				processCallCount: this._processCallCount,
				flushCount:       this._flushCount,
				currentTime,
			});
		}

		const input = inputs[0];
		if (!input || !input[0]) return true;

		const blockSize = input[0].length;
		let srcOffset = 0;

		while (srcOffset < blockSize) {
			const remaining = this._nSamples - this._accumPos;
			const toCopy = Math.min(blockSize - srcOffset, remaining);

			for (let ch = 0; ch < 6; ch++) {
				const src = input[ch] ?? input[0];
				const dst = this._accum[ch];
				for (let i = 0; i < toCopy; i++) {
					dst[this._accumPos + i] = src[srcOffset + i] ?? 0;
				}
			}

			this._accumPos += toCopy;
			srcOffset += toCopy;

			if (this._accumPos >= this._nSamples) {
				this._flushFrame();
				this._accumPos = 0;
				this._flushCount++;
			}
		}

		return true;
	}
}

registerProcessor('waveform-capture', WaveformCaptureProcessor);
