/**
 * SimpleNoiseProcessor - Basic white noise generator for AudioWorklet
 *
 * This is a minimal implementation that generates white noise directly
 * without any base class dependencies.
 */

class SimpleNoiseProcessor extends AudioWorkletProcessor {
	static get parameterDescriptors() {
		return [
			{
				name: 'volume',
				defaultValue: 0.5,
				minValue: 0.0,
				maxValue: 1.0,
				automationRate: 'a-rate',
			},
			{
				name: 'isPlaying',
				defaultValue: 0,
				minValue: 0,
				maxValue: 1,
				automationRate: 'k-rate',
			},
		];
	}

	constructor() {
		super();
		this.isPlaying = false;

		// Listen for messages from the main thread
		this.port.onmessage = (event) => {
			const { type, data } = event.data;

			switch (type) {
				case 'start':
					this.isPlaying = true;
					break;
				case 'stop':
					this.isPlaying = false;
					break;
				case 'dispose':
					// Clean up if needed
					break;
			}
		};
	}

	process(inputs, outputs, parameters) {
		const output = outputs[0];
		const volumeParam = parameters.volume;
		const isPlayingParam = parameters.isPlaying;

		// Check if we should be playing
		const shouldPlay = this.isPlaying || isPlayingParam[0] > 0.5;

		if (!shouldPlay) {
			// Output silence when not playing
			for (let channel = 0; channel < output.length; channel++) {
				output[channel].fill(0);
			}
			return true;
		}

		// Generate white noise for each channel
		for (let channel = 0; channel < output.length; channel++) {
			const outputChannel = output[channel];

			for (let i = 0; i < outputChannel.length; i++) {
				// Generate white noise (-1 to 1)
				const noise = Math.random() * 2 - 1;

				// Apply volume (support per-sample automation)
				const volume = volumeParam.length > 1 ? volumeParam[i] : volumeParam[0];

				outputChannel[i] = noise * volume;
			}
		}

		return true;
	}
}

// Register the processor
registerProcessor('simple-noise-processor', SimpleNoiseProcessor);
