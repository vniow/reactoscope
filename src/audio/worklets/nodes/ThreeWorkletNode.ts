/**
 * ThreeWorkletNode - White three generator using AudioWorklet
 *
 * This node wraps a white three generator AudioWorklet processor within the Tone.js ecosystem
 * for use in Reactoscope.
 */

import * as Tone from 'tone';
import { ToneWorkletBase } from '../ToneWorkletBase';
import type { WorkletBaseOptions } from '../WorkletTypes';

// Import the processor to ensure it's registered
import '../processors/ThreeProcessor.worklet';

/**
 * Configuration options for the ThreeWorkletNode
 */
export interface ThreeWorkletNodeOptions extends WorkletBaseOptions {
	/**
	 * Whether to start generating three immediately
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
 * White three generator audio node using AudioWorklet
 *
 * @example
 * ```typescript
 * // Basic usage
 * const three = new ThreeWorkletNode();
 * const gainNode = new Tone.Gain(0.5).toDestination();
 * three.connect(gainNode);
 *
 * // Wait for worklet to be ready, then start
 * three.ready.then(() => {
 *   three.start();
 * });
 *
 * // Stop three
 * three.stop();
 * ```
 */
export class ThreeWorkletNode extends ToneWorkletBase<ThreeWorkletNodeOptions> {
	readonly name: string = 'ThreeWorkletNode';

	/**
	 * This is a source node, so input is undefined
	 */
	readonly input: undefined = undefined;

	/**
	 * Output for generated audio
	 */
	readonly output: Tone.Gain;

	/**
	 * Volume parameter for controlling three amplitude
	 */
	readonly volume: Tone.Param<'normalRange'>;

	/**
	 * Track if the three is currently playing
	 */
	private _isPlaying: boolean = false;

	/**
	 * Create a new ThreeWorkletNode
	 *
	 * @param options - Configuration options
	 */
	constructor(options: Partial<ThreeWorkletNodeOptions> = {}) {
		// Input validation
		if (
			options.volume !== undefined &&
			(typeof options.volume !== 'number' ||
				options.volume < 0 ||
				options.volume > 1)
		) {
			console.error(
				'🚨 ThreeWorkletNode: Invalid volume value',
				options.volume
			);
			throw new Error('Volume must be a number between 0 and 1');
		}

		// Merge default options with provided options
		const opts = {
			...ThreeWorkletNode.getDefaults(),
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

		// Auto-start if requested
		if (opts.autostart) {
			this.ready
				.then(() => {
					this.start();
				})
				.catch((error) => {
					if (this.debug) {
						console.error('❌ Failed to auto-start three:', error);
					}
				});
		}
	}

	/**
	 * Provide the name of the AudioWorklet processor to use
	 */
	protected _audioWorkletName(): string {
		return 'three-processor';
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
	}

	/**
	 * Start generating three
	 *
	 * @returns This instance for method chaining
	 */
	start(): this {
		try {
			if (this.isReady && !this._isPlaying) {
				this.postMessage({ type: 'start' });
				this._isPlaying = true;
				console.log('▶️ ThreeWorkletNode started');
			}
		} catch (error) {
			console.error('🚨 Failed to start ThreeWorkletNode:', error);
		}
		return this;
	}

	/**
	 * Stop generating three
	 *
	 * @returns This instance for method chaining
	 */
	stop(): this {
		try {
			if (this.isReady && this._isPlaying) {
				this.postMessage({ type: 'stop' });
				this._isPlaying = false;
				console.log('⏹️ ThreeWorkletNode stopped');
			}
		} catch (error) {
			console.error('🚨 Failed to stop ThreeWorkletNode:', error);
		}
		return this;
	}

	/**
	 * Check if three is currently playing
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
	 * @returns This instance for method chaining
	 */
	setVolume(value: number): this {
		// Input validation
		if (typeof value !== 'number' || value < 0 || value > 1) {
			console.error('🚨 ThreeWorkletNode: Invalid volume value', value);
			throw new Error('Volume must be a number between 0 and 1');
		}

		this.volume.value = value;
		this.updateWorkletVolume();
		return this;
	}

	/**
	 * Get default options for ThreeWorkletNode
	 */
	static getDefaults(): ThreeWorkletNodeOptions {
		return Object.assign(ToneWorkletBase.getDefaults(), {
			autostart: false,
			volume: 0.5,
		});
	}

	/**
	 * Clean up and release resources
	 */
	dispose(): this {
		// Stop three generation if playing
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
