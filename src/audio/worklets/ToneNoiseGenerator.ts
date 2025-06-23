import * as Tone from 'tone';

export class ToneNoiseGenerator extends Tone.ToneAudioNode<Tone.ToneAudioNodeOptions> {
	readonly name = 'ToneNoiseGenerator';
	readonly input = undefined;
	readonly output: Tone.Gain;

	private _workletNode: AudioWorkletNode | null = null;
	private _customContext: AudioContext | null = null; // Store our custom AudioContext
	private _mediaStreamSource: MediaStreamAudioSourceNode | null = null; // Store the media stream source
	private _noiseType: 'white' | 'pink' | 'brown' = 'white';
	private _amplitude: number = 0.5;
	private _isPlaying: boolean = false;

	constructor(
		options?: Partial<{
			noiseType: 'white' | 'pink' | 'brown';
			amplitude: number;
		}>
	) {
		super();

		this.output = new Tone.Gain();

		this._noiseType = options?.noiseType ?? 'white';
		this._amplitude = options?.amplitude ?? 0.5;
	}

	public async initialize() {
		try {
			// Start Tone.js to ensure audio can play
			await Tone.start();

			// Log detailed debugging info about the context
			console.log('Context inspection before initialization:', {
				toneContext: Tone.getContext(),
				contextState: Tone.getContext().state,
				rawContextType: typeof Tone.getContext().rawContext,
				isBaseAudioContext:
					Tone.getContext().rawContext instanceof BaseAudioContext,
				isAudioContext: Tone.getContext().rawContext instanceof AudioContext,
				constructorName: Tone.getContext().rawContext?.constructor?.name,
				state: Tone.getContext().state,
			});

			// Create a new AudioContext directly - this avoids issues with Tone.js context
			// Based on the github issue you linked, we need a proper AudioContext for AudioWorkletNode
			this._customContext = new AudioContext();
			console.log(
				'Created a fresh AudioContext for worklet:',
				this._customContext
			);

			// Ensure the context is running
			if (this._customContext.state !== 'running') {
				console.log(
					`Resuming audio context (current state: ${this._customContext.state})`
				);
				await this._customContext.resume();
				console.log(
					`Audio context resumed, new state: ${this._customContext.state}`
				);
			}

			// A small delay can help stabilize the context
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Load the worklet module into our dedicated context
			try {
				// Try to load the worklet with an absolute path first (most reliable in Vite)
				const modulePath = '/src/audio/worklets/NoiseGeneratorWorklet.js';
				console.log(`Loading worklet from: ${modulePath}`);
				await this._customContext.audioWorklet.addModule(modulePath);
				console.log('Worklet module added successfully');
			} catch (e) {
				console.warn('Error adding worklet with absolute path, trying URL:', e);
				try {
					// If absolute path fails, try URL
					const workletPath = new URL(
						'/src/audio/worklets/NoiseGeneratorWorklet.js',
						import.meta.url
					).toString();
					console.log(`Trying URL path: ${workletPath}`);
					await this._customContext.audioWorklet.addModule(workletPath);
					console.log('Worklet module added successfully via URL');
				} catch (e2) {
					console.error('All attempts to add worklet module failed:', e2);
					throw e2;
				}
			}

			// Create the worklet node in our dedicated context
			this._workletNode = new AudioWorkletNode(
				this._customContext,
				'noise-generator',
				{
					numberOfInputs: 0,
					numberOfOutputs: 1,
					outputChannelCount: [1], // Mono output
				}
			);

			console.log('Created noise generator in Tone context:', {
				workletContext: this._workletNode.context,
				workletState: this._workletNode.context.state,
				outputContext: this.output.context.rawContext,
				outputState: this.output.context.state,
			});

			// Create a GainNode in our dedicated audio context to control amplitude
			const rawGain = this._customContext.createGain();
			rawGain.gain.value = this._amplitude;

			// Connect worklet to the gain node
			this._workletNode.connect(rawGain);

			// We need to bridge between our AudioContext and Tone.js context
			// Create a MediaStreamDestination in our AudioContext
			const mediaStreamDest =
				this._customContext.createMediaStreamDestination();
			rawGain.connect(mediaStreamDest);

			// Create a MediaStreamSource node in Tone.js context to receive our audio
			this._mediaStreamSource = Tone.context.createMediaStreamSource(
				mediaStreamDest.stream
			);

			// Connect the media stream to our output node
			// We need to use the internal node since Web Audio API and Tone.js have different connection methods
			this._mediaStreamSource.connect(
				this.output.input as unknown as AudioNode
			);

			// Send initial parameters
			this._updateWorkletParameters();

			console.log('Noise generator worklet initialized successfully');
		} catch (error) {
			console.error('Failed to initialize noise generator worklet:', error);
			// Re-throw the error to be handled by the caller in the audio slice
			throw error;
		}
	}

	private _updateWorkletParameters() {
		if (!this._workletNode) {
			// Worklet not ready yet, parameters will be set when it initializes
			return;
		}

		this._workletNode.port.postMessage({
			type: 'noiseType',
			value: this._noiseType,
		});

		this._workletNode.port.postMessage({
			type: 'amplitude',
			value: this._amplitude,
		});

		this._workletNode.port.postMessage({
			type: 'playing',
			value: this._isPlaying,
		});
	}

	get isReady(): boolean {
		return this._workletNode !== null;
	}

	get noiseType(): 'white' | 'pink' | 'brown' {
		return this._noiseType;
	}

	set noiseType(type: 'white' | 'pink' | 'brown') {
		this._noiseType = type;
		this._updateWorkletParameters();
	}

	get amplitude(): number {
		return this._amplitude;
	}

	set amplitude(amp: number) {
		this._amplitude = Math.max(0, Math.min(1, amp));
		this._updateWorkletParameters();
	}

	start(): this {
		this._isPlaying = true;
		this._updateWorkletParameters();
		return this;
	}

	stop(): this {
		this._isPlaying = false;
		this._updateWorkletParameters();
		return this;
	}

	dispose(): this {
		if (this._workletNode) {
			this._workletNode.disconnect();
			this._workletNode = null;
		}

		if (this._mediaStreamSource) {
			this._mediaStreamSource.disconnect();
			this._mediaStreamSource = null;
		}

		if (this._customContext) {
			if (this._customContext.state !== 'closed') {
				this._customContext
					.close()
					.catch((e) => console.error('Error closing custom context:', e));
			}
			this._customContext = null;
		}

		super.dispose();
		return this;
	}

	static getDefaults(): Tone.ToneAudioNodeOptions {
		return Object.assign(Tone.ToneAudioNode.getDefaults(), {
			noiseType: 'white' as const,
			amplitude: 0.5,
		});
	}
}
