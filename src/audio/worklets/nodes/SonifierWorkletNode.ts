/**
 * SonifierWorkletNode - Vertex data audio generator using AudioWorklet
 *
 * This node wraps a vertex data sonification AudioWorklet processor within the Tone.js ecosystem
 * for use in Reactoscope. It generates 5-channel audio from vertex data (x, y, r, g, b).
 */

import * as Tone from 'tone';
import { ToneWorkletBase } from '../ToneWorkletBase';
import type { WorkletBaseOptions } from '../WorkletTypes';

// Import the processor to ensure it's registered
import { workletName } from '../processors/SonifierProcessor.worklet';

/**
 * Configuration options for the SonifierWorkletNode
 */
export interface SonifierWorkletNodeOptions extends WorkletBaseOptions {
	/**
	 * Whether to start generating audio immediately
	 * @default false
	 */
	autostart?: boolean;

	/**
	 * Initial volume level (0.0 - 1.0)
	 * @default 0.5
	 */
	volume?: number;

	/**
	 * Playback speed for vertex data traversal
	 * @default 1.0
	 */
	playbackSpeed?: number;

	/**
	 * Interpolation step factor for smooth vertex transitions
	 * @default 0.1
	 */
	interpolationStep?: number;
}

/**
 * Vertex data sonification audio generator using AudioWorklet
 *
 * @example
 * ```typescript
 * // Basic usage
 * const sonifier = new SonifierWorkletNode();
 * const gainNode = new Tone.Gain(0.5).toDestination();
 *
 * // Connect specific channels
 * sonifier.outputX.connect(gainNode);  // X coordinate
 * sonifier.outputY.connect(gainNode);  // Y coordinate
 * sonifier.outputR.connect(gainNode);  // Red channel
 * sonifier.outputG.connect(gainNode);  // Green channel
 * sonifier.outputB.connect(gainNode);  // Blue channel
 *
 * // Wait for worklet to be ready, then set shared buffer
 * sonifier.ready.then(() => {
 *   const sharedBuffer = new SharedArrayBuffer(1024 * 5 * 4 + 4);
 *   sonifier.setSharedBuffer(sharedBuffer);
 *   sonifier.start();
 * });
 *
 * // Stop playback
 * sonifier.stop();
 * ```
 */
export class SonifierWorkletNode extends ToneWorkletBase<SonifierWorkletNodeOptions> {
	readonly name: string = 'SonifierWorkletNode';

	/**
	 * This is a source node, so input is undefined
	 */
	readonly input: undefined = undefined;

	/**
	 * Main output (for backward compatibility and ToneWorkletBase requirement)
	 */
	readonly output: Tone.Gain;

	/**
	 * Output for X coordinate audio (channel 0)
	 */
	readonly outputX: Tone.Gain;

	/**
	 * Output for Y coordinate audio (channel 1)
	 */
	readonly outputY: Tone.Gain;

	/**
	 * Output for R (red) channel audio (channel 2)
	 */
	readonly outputR: Tone.Gain;

	/**
	 * Output for G (green) channel audio (channel 3)
	 */
	readonly outputG: Tone.Gain;

	/**
	 * Output for B (blue) channel audio (channel 4)
	 */
	readonly outputB: Tone.Gain;

	/**
	 * Internal channel splitter to separate 5 channels
	 */
	private readonly _channelSplitter: Tone.Split;

	/**
	 * Volume parameter for controlling audio amplitude
	 */
	readonly volume: Tone.Param<'normalRange'>;

	/**
	 * Playback speed parameter for vertex data traversal
	 */
	readonly playbackSpeed: Tone.Param<'positive'>;

	/**
	 * Interpolation step parameter for smooth vertex transitions
	 */
	readonly interpolationStep: Tone.Param<'positive'>;

	/**
	 * Track if the audio is currently playing
	 */
	private _isPlaying: boolean = false;

	/**
	 * Current SharedArrayBuffer containing vertex data
	 */
	private _sharedBuffer: SharedArrayBuffer | null = null;

	/**
	 * Create a new SonifierWorkletNode
	 *
	 * @param options - Configuration options
	 */
	constructor(options: Partial<SonifierWorkletNodeOptions> = {}) {
		// Merge default options with provided options
		const opts = {
			...SonifierWorkletNode.getDefaults(),
			...options,
		};

		super(opts);

		// Create main output gain node (for backward compatibility)
		this.output = new Tone.Gain({
			context: this.context,
			gain: 1,
		});

		// Create channel splitter to separate 5 channels
		this._channelSplitter = new Tone.Split({
			context: this.context,
			channels: 5,
		});

		// Create individual channel outputs
		this.outputX = new Tone.Gain({ context: this.context, gain: 1.0 });
		this.outputY = new Tone.Gain({ context: this.context, gain: 1.0 });
		this.outputR = new Tone.Gain({ context: this.context, gain: 1.0 });
		this.outputG = new Tone.Gain({ context: this.context, gain: 1.0 });
		this.outputB = new Tone.Gain({ context: this.context, gain: 1.0 });

		// Connect the splitter to the separate outputs
		this._channelSplitter.connect(this.outputX, 0, 0); // Channel 0 -> X output
		this._channelSplitter.connect(this.outputY, 1, 0); // Channel 1 -> Y output
		this._channelSplitter.connect(this.outputR, 2, 0); // Channel 2 -> R output
		this._channelSplitter.connect(this.outputG, 3, 0); // Channel 3 -> G output
		this._channelSplitter.connect(this.outputB, 4, 0); // Channel 4 -> B output

		// Connect all individual channels to main output for a mix
		this.outputX.connect(this.output);
		this.outputY.connect(this.output);
		this.outputR.connect(this.output);
		this.outputG.connect(this.output);
		this.outputB.connect(this.output);

		// Create volume parameter
		this.volume = new Tone.Param<'normalRange'>({
			context: this.context,
			value: opts.volume ?? 0.5,
			units: 'normalRange',
			param: this._dummyParam,
			swappable: true,
		});

		// Create playback speed parameter
		this.playbackSpeed = new Tone.Param<'positive'>({
			context: this.context,
			value: opts.playbackSpeed ?? 1.0,
			units: 'positive',
			param: this._dummyParam,
			swappable: true,
		});

		// Create interpolation step parameter
		this.interpolationStep = new Tone.Param<'positive'>({
			context: this.context,
			value: opts.interpolationStep ?? 0.1,
			units: 'positive',
			param: this._dummyParam,
			swappable: true,
		});

		// Auto-start if requested
		if (opts.autostart) {
			this.ready.then(() => this.start()).catch(console.error);
		}
	}

	/**
	 * Provide the name of the AudioWorklet processor to use
	 */
	protected _audioWorkletName(): string {
		return workletName;
	}

	/**
	 * Set up connections when the AudioWorkletNode is ready
	 *
	 * @param node - The AudioWorkletNode instance
	 */
	protected onReady(node: AudioWorkletNode): void {
		// Connect the worklet to our main output
		Tone.connect(node, this.output);

		// Connect the worklet to the channel splitter for multi-channel outputs
		Tone.connect(node, this._channelSplitter);

		// Set up parameter synchronization
		if (node.parameters.has('volume')) {
			const volumeParam = node.parameters.get('volume')!;
			volumeParam.value = this.volume.value;
		}

		if (node.parameters.has('playbackSpeed')) {
			const speedParam = node.parameters.get('playbackSpeed')!;
			speedParam.value = this.playbackSpeed.value;
		}

		if (node.parameters.has('interpolationStep')) {
			const interpParam = node.parameters.get('interpolationStep')!;
			interpParam.value = this.interpolationStep.value;
		}

		// Send shared buffer if we have one
		if (this._sharedBuffer) {
			this.setSharedBuffer(this._sharedBuffer);
		}
	}

	/**
	 * Set SharedArrayBuffer for vertex data
	 *
	 * @param sharedBuffer - SharedArrayBuffer containing vertex data
	 * @returns This instance for method chaining
	 */
	setSharedBuffer(sharedBuffer: SharedArrayBuffer): this {
		this._sharedBuffer = sharedBuffer;

		// Send to worklet if ready
		if (this.isReady) {
			this.postMessage({
				type: 'sab',
				data: sharedBuffer,
			});
		}

		return this;
	}

	/**
	 * Start generating audio from vertex data
	 *
	 * @returns This instance for method chaining
	 */
	start(): this {
		if (this.isReady && !this._isPlaying) {
			this.postMessage({ type: 'start' });
			this._isPlaying = true;
		}
		return this;
	}

	/**
	 * Stop generating audio
	 *
	 * @returns This instance for method chaining
	 */
	stop(): this {
		if (this.isReady && this._isPlaying) {
			this.postMessage({ type: 'stop' });
			this._isPlaying = false;
		}
		return this;
	}

	/**
	 * Check if audio is currently playing
	 */
	get isPlaying(): boolean {
		return this._isPlaying;
	}

	/**
	 * Get current shared buffer
	 */
	get sharedBuffer(): SharedArrayBuffer | null {
		return this._sharedBuffer;
	}

	/**
	 * Set the volume level
	 *
	 * @param value - Volume level (0.0 - 1.0)
	 * @returns This instance for method chaining
	 */
	setVolume(value: number): this {
		this.volume.setValueAtTime(value, this.context.currentTime);
		if (this.isReady && this._worklet.parameters.has('volume')) {
			this._worklet.parameters.get('volume')!.value = value;
		}
		return this;
	}

	/**
	 * Set the playback speed
	 *
	 * @param value - Playback speed (positive number)
	 * @returns This instance for method chaining
	 */
	setPlaybackSpeed(value: number): this {
		this.playbackSpeed.setValueAtTime(value, this.context.currentTime);
		if (this.isReady && this._worklet.parameters.has('playbackSpeed')) {
			this._worklet.parameters.get('playbackSpeed')!.value = value;
		}
		return this;
	}

	/**
	 * Set the interpolation step factor
	 *
	 * @param value - Interpolation step factor (positive number, typically 0.001 to 1.0)
	 * @returns This instance for method chaining
	 */
	setInterpolationStep(value: number): this {
		this.interpolationStep.setValueAtTime(value, this.context.currentTime);
		if (this.isReady && this._worklet.parameters.has('interpolationStep')) {
			this._worklet.parameters.get('interpolationStep')!.value = value;
		}
		return this;
	}

	/**
	 * Set buffer playback position
	 *
	 * @param position - Buffer position (0 to buffer length)
	 * @returns This instance for method chaining
	 */
	setPosition(position: number): this {
		if (this.isReady) {
			this.postMessage({
				type: 'set-position',
				data: position,
			});
		}
		return this;
	}

	/**
	 * Get default options for SonifierWorkletNode
	 */
	static getDefaults(): Required<SonifierWorkletNodeOptions> {
		const baseDefaults = ToneWorkletBase.getDefaults();
		return {
			...baseDefaults,
			debug: false,
			workletOptions: {},
			autostart: false,
			volume: 0.5,
			playbackSpeed: 1.0,
			interpolationStep: 0.1,
		};
	}

	/**
	 * Clean up resources
	 */
	dispose(): this {
		super.dispose();

		// Clean up individual outputs
		this.outputX.dispose();
		this.outputY.dispose();
		this.outputR.dispose();
		this.outputG.dispose();
		this.outputB.dispose();

		// Clean up routing
		this._channelSplitter.dispose();

		// Clean up parameters
		this.volume.dispose();
		this.playbackSpeed.dispose();
		this.interpolationStep.dispose();

		return this;
	}
}
