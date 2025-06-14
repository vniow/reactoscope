/**
 * NoiseWorkletNode - White noise generator using AudioWorklet
 *
 * This node wraps a white noise generator AudioWorklet processor within the Tone.js ecosystem
 * for use in Reactoscope.
 */

import * as Tone from 'tone';
import { ToneWorkletBase } from '../ToneWorkletBase';
import type { WorkletBaseOptions } from '../WorkletTypes';

// Import the processor to ensure it's registered
import '../processors/NoiseProcessor.worklet';

/**
 * Configuration options for the NoiseWorkletNode
 */
export interface NoiseWorkletNodeOptions extends WorkletBaseOptions {
	/**
	 * Whether to start generating noise immediately
	 * @default false
	 */
	autostart?: boolean;

	/**
	 * Initial volume level (0.0 - 1.0)
	 * @default 0.5
	 */
	volume?: number;
}

/**
 * White noise generator audio node using AudioWorklet
 *
 * @example
 * ```typescript
 * // Basic usage
 * const noise = new NoiseWorkletNode();
 * const gainNode = new Tone.Gain(0.5).toDestination();
 * noise.connect(gainNode);
 *
 * // Wait for worklet to be ready, then start
 * noise.ready.then(() => {
 *   noise.start();
 * });
 *
 * // Stop noise
 * noise.stop();
 * ```
 */
export class NoiseWorkletNode extends ToneWorkletBase<NoiseWorkletNodeOptions> {
	readonly name: string = 'NoiseWorkletNode';

	/**
	 * This is a source node, so input is undefined
	 */
	readonly input: undefined = undefined;

	/**
	 * Output for generated audio
	 */
	readonly output: Tone.Gain;

	/**
	 * Volume parameter for controlling noise amplitude
	 */
	readonly volume: Tone.Param<'normalRange'>;

	/**
	 * Track if the noise is currently playing
	 */
	private _isPlaying: boolean = false;

	/**
	 * Create a new NoiseWorkletNode
	 *
	 * @param options - Configuration options
	 */
	constructor(options: Partial<NoiseWorkletNodeOptions> = {}) {
		// Merge default options with provided options
		const opts = {
			...NoiseWorkletNode.getDefaults(),
			...options,
		};

		super(opts);

		// Create output gain node
		this.output = new Tone.Gain({
			context: this.context,
			gain: 1.0,
		});

		// Create volume parameter
		this.volume = new Tone.Param<'normalRange'>({
			context: this.context,
			value: opts.volume ?? 0.5,
			units: 'normalRange',
			param: this._dummyParam,
			swappable: true,
		});

		if (this.debug) {
			console.log('🎛️ Created NoiseWorkletNode');
		}

		// Auto-start if requested
		if (opts.autostart) {
			this.ready
				.then(() => {
					this.start();
				})
				.catch((error) => {
					if (this.debug) {
						console.error('❌ Failed to auto-start noise:', error);
					}
				});
		}
	}

	/**
	 * Provide the name of the AudioWorklet processor to use
	 */
	protected _audioWorkletName(): string {
		return 'noise-processor';
	}

	/**
	 * Set up connections when the AudioWorkletNode is ready
	 *
	 * @param node - The AudioWorkletNode instance
	 */
	protected onReady(node: AudioWorkletNode): void {
		// Connect the worklet to our output
		Tone.connect(node, this.output);

		// Set up parameter synchronization
		if (node.parameters.has('volume')) {
			const volumeParam = node.parameters.get('volume')!;
			// Sync initial value
			volumeParam.value = this.volume.value;
		}

		if (this.debug) {
			console.log('✅ NoiseWorkletNode setup complete');
		}
	}

	/**
	 * Start generating noise
	 */
	start(): this {
		if (this.isReady && !this._isPlaying) {
			this.postMessage({ type: 'start' });
			this._isPlaying = true;

			if (this.debug) {
				console.log('▶️ Starting noise generation');
			}
		} else if (this.debug) {
			console.warn(
				'⚠️ Cannot start noise: worklet not ready or already playing'
			);
		}
		return this;
	}

	/**
	 * Stop generating noise
	 */
	stop(): this {
		if (this.isReady && this._isPlaying) {
			this.postMessage({ type: 'stop' });
			this._isPlaying = false;

			if (this.debug) {
				console.log('⏹️ Stopping noise generation');
			}
		}
		return this;
	}

	/**
	 * Check if noise is currently playing
	 */
	get isPlaying(): boolean {
		return this._isPlaying;
	}

	/**
	 * Update the worklet's volume parameter to match our Tone.js parameter
	 */
	private updateWorkletVolume(): void {
		if (this.isReady && this.workletNode?.parameters.has('volume')) {
			const volumeParam = this.workletNode.parameters.get('volume')!;
			volumeParam.value = this.volume.value;
		}
	}

	/**
	 * Set the volume level
	 *
	 * @param value - Volume level (0.0 - 1.0)
	 */
	setVolume(value: number): this {
		this.volume.value = value;
		this.updateWorkletVolume();
		return this;
	}

	/**
	 * Get default options for NoiseWorkletNode
	 */
	static getDefaults(): NoiseWorkletNodeOptions {
		return Object.assign(ToneWorkletBase.getDefaults(), {
			autostart: false,
			volume: 0.5,
		});
	}

	/**
	 * Clean up and release resources
	 */
	dispose(): this {
		if (this.debug) {
			console.log('🧹 Disposing NoiseWorkletNode');
		}

		// Stop noise generation if playing
		if (this._isPlaying) {
			this.stop();
		}

		// Dispose of Tone.js components
		this.volume.dispose();
		this.output.dispose();

		// Call parent dispose
		super.dispose();

		return this;
	}
}
