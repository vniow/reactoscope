/**
 * NoiseNode - Simple noise generator using AudioWorklet
 */
import * as Tone from 'tone';
import {
	noiseProcessorWorklet,
	workletName,
} from './worklet/NoiseProcessor.worklet';

export interface NoiseNodeOptions {
	amplitude?: number;
	autostart?: boolean;
	debug?: boolean;
}

/**
 * Simple white noise generator using AudioWorklet
 */
export class NoiseNode {
	readonly name: string = 'NoiseNode';
	readonly output: Tone.Gain;

	private _workletNode: AudioWorkletNode | null = null;
	private _isPlaying: boolean = false;
	private _amplitude: number = 0.5;
	private _isReady: boolean = false;
	private _readyPromise: Promise<void>;
	private _resolveReady!: () => void;
	private _debug: boolean = false;

	/**
	 * create a new NoiseNode
	 */
	constructor(options: NoiseNodeOptions = {}) {
		this._amplitude = options.amplitude ?? 0.5;
		this._debug = options.debug ?? false;

		// create output node
		this.output = new Tone.Gain({
			context: Tone.getContext(),
			gain: 1,
		});

		// setup ready promise
		this._readyPromise = new Promise((resolve) => {
			this._resolveReady = resolve;
		});

		this._initializeWorklet();

		if (options.autostart) {
			this._readyPromise.then(() => {
				this.start();
			});
		}
	}

	/**
	 * Initialize the AudioWorklet
	 */
	private async _initializeWorklet(): Promise<void> {
		try {
			// Use Tone.js context to register the worklet - this is the proper way per GitHub issue #1138
			const workletBlob = new Blob([noiseProcessorWorklet], {
				type: 'text/javascript',
			});
			const workletUrl = URL.createObjectURL(workletBlob);

			try {
				// Use Tone.getContext().addAudioWorkletModule() instead of raw context
				await Tone.getContext().addAudioWorkletModule(workletUrl);
			} finally {
				URL.revokeObjectURL(workletUrl);
			}

			// Use Tone.getContext().createAudioWorkletNode() - this is the recommended approach
			this._workletNode = Tone.getContext().createAudioWorkletNode(
				workletName,
				{
					numberOfInputs: 0,
					numberOfOutputs: 1,
					outputChannelCount: [2],
					parameterData: {
						amplitude: this._amplitude,
					},
				}
			);

			// Connect to output.input since worklet nodes aren't full ToneAudioNodes
			// This is the key insight from the GitHub issue
			this._workletNode.connect(this.output.input);

			this._isReady = true;
			this._resolveReady();

			if (this._debug) {
				console.log('✅ NoiseNode initialized successfully');
			}
		} catch (error) {
			console.error('❌ Failed to initialize NoiseNode:', error);
			throw error;
		}
	}

	/**
	 * Start noise generation
	 */
	start(): this {
		if (this._workletNode && this._isReady && !this._isPlaying) {
			this._workletNode.port.postMessage({ type: 'start' });
			this._isPlaying = true;

			if (this._debug) {
				console.log('▶️ NoiseNode started');
			}
		}
		return this;
	}

	/**
	 * Stop noise generation
	 */
	stop(): this {
		if (this._workletNode && this._isReady && this._isPlaying) {
			this._workletNode.port.postMessage({ type: 'stop' });
			this._isPlaying = false;

			if (this._debug) {
				console.log('⏹️ NoiseNode stopped');
			}
		}
		return this;
	}

	/**
	 * Set amplitude
	 */
	setAmplitude(value: number): this {
		this._amplitude = Math.max(0, Math.min(1, value));

		if (this._workletNode && this._isReady) {
			// Use both parameter automation and message for immediate response
			const param = this._workletNode.parameters.get('amplitude');
			if (param) {
				param.setValueAtTime(this._amplitude, Tone.getContext().currentTime);
			}

			this._workletNode.port.postMessage({
				type: 'amplitude',
				value: this._amplitude,
			});
		}

		return this;
	}

	/**
	 * Get current amplitude
	 */
	get amplitude(): number {
		return this._amplitude;
	}

	/**
	 * Check if playing
	 */
	get isPlaying(): boolean {
		return this._isPlaying;
	}

	/**
	 * Check if ready
	 */
	get isReady(): boolean {
		return this._isReady;
	}

	/**
	 * Get ready promise
	 */
	get ready(): Promise<void> {
		return this._readyPromise;
	}

	/**
	 * Connect to another node
	 */
	connect(destination: Tone.InputNode): this {
		this.output.connect(destination);
		return this;
	}

	/**
	 * Disconnect from all destinations
	 */
	disconnect(): this {
		this.output.disconnect();
		return this;
	}

	/**
	 * Clean up resources
	 */
	dispose(): this {
		if (this._isPlaying) {
			this.stop();
		}

		if (this._workletNode) {
			this._workletNode.disconnect();
			this._workletNode = null;
		}

		this.output.dispose();

		if (this._debug) {
			console.log('🧹 NoiseNode disposed');
		}

		return this;
	}
}
