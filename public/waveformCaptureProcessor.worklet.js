class WaveformCaptureProcessor extends AudioWorkletProcessor {
	constructor(options) {
		super(options);
		this._nSamples = options?.processorOptions?.nSamples ?? 2048;
		this._accumPos = 0;
		this._accum = Array.from(
			{ length: 6 },
			() => new Float32Array(this._nSamples),
		);

		// ─── Bisection-map liveness instrumentation ────────────────────────────────
		// This worklet is created via the same createAudioWorkletNode path as Scene
		// Input's (see issue #6 — that worklet can stop being pulled entirely after
		// 2 render quanta in some configs). A flat memory reading from this worklet
		// running alone is only meaningful if it's provably still being called —
		// this ping is that proof. Throttled to 1/sec, mirrors
		// sceneInputProcessor.worklet.js's stats mechanism.
		this._processCallCount = 0;
		this._flushCount       = 0;
		this._lastStatsTime    = 0;

		this.port.onmessage = (e) => {
			const { type, nSamples } = e.data;
			if (type === 'resize') {
				this._nSamples = nSamples;
				this._accumPos = 0;
				this._accum = Array.from(
					{ length: 6 },
					() => new Float32Array(nSamples),
				);
			}
		};
	}

	// Packs the 6 completed-frame channels into one transferable buffer
	// ([ch0 samples][ch1 samples]...[ch5 samples]) and posts it — replaces the
	// previous SharedArrayBuffer + Atomics push model. See Wayfinder issue #7:
	// testing whether concurrent Atomics-based shared-memory writes from two
	// AudioWorkletNodes (this one + Scene Input's) was the leak's actual
	// trigger, independent of "two worklets coexisting" in general.
	_flushFrame() {
		const packed = new Float32Array(6 * this._nSamples);
		for (let ch = 0; ch < 6; ch++) {
			packed.set(this._accum[ch], ch * this._nSamples);
		}
		this.port.postMessage(
			{ type: 'frame', data: packed.buffer, nSamples: this._nSamples },
			[packed.buffer],
		);
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
