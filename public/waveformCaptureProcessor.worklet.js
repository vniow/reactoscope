class WaveformCaptureProcessor extends AudioWorkletProcessor {
	constructor(options) {
		super(options);
		this._nSamples  = options?.processorOptions?.nSamples ?? 2048;
		this._accumPos  = 0;
		this._accum     = Array.from({ length: 6 }, () => new Float32Array(this._nSamples));
		this._writeIndexView = null;
		this._channelViews   = null;

		this.port.onmessage = (e) => {
			const { type, buffer, nSamples } = e.data;
			if (type === 'sabBuffer' || type === 'resize') {
				this._nSamples  = nSamples;
				this._accumPos  = 0;
				this._accum     = Array.from({ length: 6 }, () => new Float32Array(nSamples));
				this._setupSAB(buffer, nSamples);
			}
		};
	}

	_setupSAB(buffer, nSamples) {
		this._writeIndexView = new Uint32Array(buffer, 0, 1);
		this._channelViews   = [];
		for (let ch = 0; ch < 6; ch++) {
			this._channelViews.push(new Float32Array(buffer, 4 + ch * nSamples * 4, nSamples));
		}
	}

	_flushFrame() {
		if (!this._writeIndexView || !this._channelViews) return;
		for (let ch = 0; ch < 6; ch++) this._channelViews[ch].set(this._accum[ch]);
		Atomics.add(this._writeIndexView, 0, 1);
		this.port.postMessage({ type: 'frame', nSamples: this._nSamples });
	}

	process(inputs) {
		const input = inputs[0];
		if (!input || !input[0]) return true;

		const blockSize = input[0].length;
		let srcOffset   = 0;

		while (srcOffset < blockSize) {
			const remaining = this._nSamples - this._accumPos;
			const toCopy    = Math.min(blockSize - srcOffset, remaining);

			for (let ch = 0; ch < 6; ch++) {
				const src = input[ch] ?? input[0];
				const dst = this._accum[ch];
				for (let i = 0; i < toCopy; i++) {
					dst[this._accumPos + i] = src[srcOffset + i] ?? 0;
				}
			}

			this._accumPos += toCopy;
			srcOffset      += toCopy;

			if (this._accumPos >= this._nSamples) {
				this._flushFrame();
				this._accumPos = 0;
			}
		}

		return true;
	}
}

registerProcessor('waveform-capture', WaveformCaptureProcessor);
