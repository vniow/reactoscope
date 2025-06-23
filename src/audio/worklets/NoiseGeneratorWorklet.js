// NoiseGeneratorWorklet.js
// Audio worklet processor for generating various types of noise

class NoiseGeneratorProcessor extends AudioWorkletProcessor {
	constructor(options) {
		super();

		// Initialize parameters
		this.noiseType = 'white'; // white, pink, brown
		this.amplitude = 0.5;
		this.isPlaying = false;

		// Pink noise filter state
		this.pinkState = {
			b0: 0,
			b1: 0,
			b2: 0,
			b3: 0,
			b4: 0,
			b5: 0,
			b6: 0,
		};

		// Brown noise state
		this.brownState = 0;

		// Handle parameter changes from main thread
		this.port.onmessage = (event) => {
			const { type, value } = event.data;
			switch (type) {
				case 'noiseType':
					this.noiseType = value;
					break;
				case 'amplitude':
					this.amplitude = Math.max(0, Math.min(1, value));
					break;
				case 'playing':
					this.isPlaying = value;
					break;
			}
		};
	}

	// White noise generator
	generateWhiteNoise() {
		return (Math.random() * 2 - 1) * this.amplitude;
	}

	// Pink noise generator (1/f noise)
	generatePinkNoise() {
		const white = Math.random() * 2 - 1;

		this.pinkState.b0 = 0.99886 * this.pinkState.b0 + white * 0.0555179;
		this.pinkState.b1 = 0.99332 * this.pinkState.b1 + white * 0.0750759;
		this.pinkState.b2 = 0.969 * this.pinkState.b2 + white * 0.153852;
		this.pinkState.b3 = 0.8665 * this.pinkState.b3 + white * 0.3104856;
		this.pinkState.b4 = 0.55 * this.pinkState.b4 + white * 0.5329522;
		this.pinkState.b5 = -0.7616 * this.pinkState.b5 - white * 0.016898;

		const pink =
			this.pinkState.b0 +
			this.pinkState.b1 +
			this.pinkState.b2 +
			this.pinkState.b3 +
			this.pinkState.b4 +
			this.pinkState.b5 +
			this.pinkState.b6 +
			white * 0.5362;

		this.pinkState.b6 = white * 0.115926;

		return pink * this.amplitude * 0.11; // Scale down pink noise
	}

	// Brown noise generator (Brownian/red noise)
	generateBrownNoise() {
		const white = Math.random() * 2 - 1;
		this.brownState = (this.brownState + 0.02 * white) / 1.02;
		this.brownState = Math.max(-1, Math.min(1, this.brownState)); // Clamp
		return this.brownState * this.amplitude * 3.5; // Scale up brown noise
	}

	process(inputs, outputs, parameters) {
		const output = outputs[0];
		const channel = output[0];

		if (!this.isPlaying) {
			// Output silence when not playing
			channel.fill(0);
			return true;
		}

		// Generate noise samples
		for (let i = 0; i < channel.length; i++) {
			let sample;

			switch (this.noiseType) {
				case 'pink':
					sample = this.generatePinkNoise();
					break;
				case 'brown':
					sample = this.generateBrownNoise();
					break;
				case 'white':
				default:
					sample = this.generateWhiteNoise();
					break;
			}

			channel[i] = sample;
		}

		return true;
	}
}

registerProcessor('noise-generator', NoiseGeneratorProcessor);
