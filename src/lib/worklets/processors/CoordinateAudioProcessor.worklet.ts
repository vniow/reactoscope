/**
 * CoordinateAudioProcessor.worklet.ts
 * AudioWorklet processor that converts 3D coordinate data to audio
 */

import { addProcessor } from '../WorkletGlobalScope';

const processorCode = `
class CoordinateAudioProcessor extends AudioWorkletProcessor {
	constructor(options) {
		super();

		// Initialize default values
		this.bufferSize = 512;
		this.axis = 'x'; // Default to x-axis
		this.sampleIndex = 0;
		this.gain = 0.5;
		this.frequency = 1.0; // Playback speed multiplier

		// Create initial empty buffer
		this.coordinateBuffer = new Float32Array(this.bufferSize);

		// Handle initialization options
		if (options && options.processorOptions) {
			const { axis, bufferSize, gain, frequency } = options.processorOptions;
			this.axis = axis || this.axis;
			this.bufferSize = bufferSize || this.bufferSize;
			this.gain = gain !== undefined ? gain : this.gain;
			this.frequency = frequency !== undefined ? frequency : this.frequency;
			this.coordinateBuffer = new Float32Array(this.bufferSize);
		}

		// Listen for messages from main thread
		this.port.onmessage = (event) => {
			const { type, data } = event.data;

			switch (type) {
				case 'updateBuffer':
					// Receive new coordinate buffer from main thread
					if (data && data.length === this.bufferSize) {
						this.coordinateBuffer.set(data);
					}
					break;

				case 'setGain':
					this.gain = Math.max(0, Math.min(1, data)); // Clamp between 0-1
					break;

				case 'setFrequency':
					this.frequency = Math.max(0.1, Math.min(10, data)); // Clamp between 0.1-10x
					break;

				case 'setAxis':
					this.axis = data === 'y' ? 'y' : 'x';
					break;
			}
		};
	}

	process(inputs, outputs) {
		const output = outputs[0];
		if (!output || output.length === 0) return true;

		const outputChannel = output[0];
		const frameCount = outputChannel.length;

		// Generate audio from coordinate buffer
		for (let i = 0; i < frameCount; i++) {
			// Calculate which coordinate to use based on axis
			// Buffer layout: [x0, y0, x1, y1, x2, y2, ...]
			const coordinateIndex =
				Math.floor(this.sampleIndex / 2) * 2 + (this.axis === 'x' ? 0 : 1);

			// Get coordinate value (already normalized to -1 to 1)
			let sample = 0;
			if (coordinateIndex < this.coordinateBuffer.length) {
				sample = this.coordinateBuffer[coordinateIndex];
			}

			// Apply gain
			sample *= this.gain;

			// Output the sample
			outputChannel[i] = sample;

			// Advance sample index with frequency control
			this.sampleIndex += this.frequency;

			// Wrap around when we reach the end of coordinate pairs
			const maxCoordinateIndex = this.bufferSize / 2 - 1;
			if (this.sampleIndex >= maxCoordinateIndex * 2) {
				this.sampleIndex = 0;
			}
		}

		return true; // Keep the processor alive
	}

	// Required method for parameter automation
	static get parameterDescriptors() {
		return [
			{
				name: 'gain',
				defaultValue: 0.5,
				minValue: 0,
				maxValue: 1,
				automationRate: 'a-rate',
			},
			{
				name: 'frequency',
				defaultValue: 1.0,
				minValue: 0.1,
				maxValue: 10,
				automationRate: 'a-rate',
			},
		];
	}
}

// Register the processor
registerProcessor('coordinate-audio-processor', CoordinateAudioProcessor);
`;

// Add this processor to the worklet registry
addProcessor(processorCode);
