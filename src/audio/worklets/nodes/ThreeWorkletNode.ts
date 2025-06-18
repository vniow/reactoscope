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
	 * Playback speed for coordinate traversal
	 * @default 1.0
	 */
	playbackSpeed?: number;

	/**
	 * Interpolation step factor for smooth coordinate transitions
	 * @default 0.1
	 */
	interpolationStep?: number;
}

/**
 * Interface for coordinate data
 */
export interface CoordinatePoint {
	x: number;
	y: number;
}

/**
 * Coordinate-based stereo audio generator using AudioWorklet
 *
 * @example
 * ```typescript
 * // Basic usage
 * const coordGen = new ThreeWorkletNode();
 * const gainNode = new Tone.Gain(0.5).toDestination();
 * coordGen.connect(gainNode);
 *
 * // Wait for worklet to be ready, then send coordinates
 * coordGen.ready.then(() => {
 *   const coords = [
 *     { x: -0.5, y: 0.8 },
 *     { x: 0.5, y: -0.8 },
 *     { x: 0.0, y: 0.8 }
 *   ];
 *   coordGen.setCoordinates(coords);
 *   coordGen.start();
 * });
 *
 * // Stop playback
 * coordGen.stop();
 * ```
 */
export class ThreeWorkletNode extends ToneWorkletBase<ThreeWorkletNodeOptions> {
	readonly name: string = 'ThreeWorkletNode';

	/**
	 * This is a source node, so input is undefined
	 */
	readonly input: undefined = undefined;

	/**
	 * Main output (for backward compatibility and ToneWorkletBase requirement)
	 */
	readonly output: Tone.Gain;

	/**
	 * Output for X coordinate audio (left channel)
	 */
	readonly outputX: Tone.Gain;

	/**
	 * Output for Y coordinate audio (right channel)
	 */
	readonly outputY: Tone.Gain;

	/**
	 * Internal splitter to separate stereo channels
	 */
	private readonly _channelSplitter: Tone.Split;

	/**
	 * Volume parameter for controlling audio amplitude
	 */
	readonly volume: Tone.Param<'normalRange'>;

	/**
	 * Playback speed parameter for coordinate traversal
	 */
	readonly playbackSpeed: Tone.Param<'positive'>;

	/**
	 * Interpolation step parameter for smooth coordinate transitions
	 */
	readonly interpolationStep: Tone.Param<'positive'>;

	/**
	 * Track if the audio is currently playing
	 */
	private _isPlaying: boolean = false;

	/**
	 * Current coordinate buffer
	 */
	private _coordinates: CoordinatePoint[] = [];

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

		if (
			options.playbackSpeed !== undefined &&
			(typeof options.playbackSpeed !== 'number' || options.playbackSpeed <= 0)
		) {
			console.error(
				'🚨 ThreeWorkletNode: Invalid playbackSpeed value',
				options.playbackSpeed
			);
			throw new Error('PlaybackSpeed must be a positive number');
		}

		// Merge default options with provided options
		const opts = {
			...ThreeWorkletNode.getDefaults(),
			...options,
		};

		super(opts);

		// Create main output gain node (for backward compatibility)
		this.output = new Tone.Gain({
			context: this.context,
			gain: 1.0,
		});

		// Create channel splitter to separate stereo into two mono channels
		this._channelSplitter = new Tone.Split({
			context: this.context,
			channels: 2,
		});

		// Create separate output gain nodes for X and Y channels
		this.outputX = new Tone.Gain({
			context: this.context,
			gain: 1.0,
		});

		this.outputY = new Tone.Gain({
			context: this.context,
			gain: 1.0,
		});

		// Connect the splitter to the separate outputs
		this._channelSplitter.connect(this.outputX, 0, 0); // Left channel to outputX
		this._channelSplitter.connect(this.outputY, 1, 0); // Right channel to outputY

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
			this.ready
				.then(() => {
					this.start();
				})
				.catch((error) => {
					if (this.debug) {
						console.error(
							'❌ Failed to auto-start coordinate generator:',
							error
						);
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
		// Connect the worklet to our main output (for backward compatibility)
		Tone.connect(node, this.output);

		// Connect the worklet to the channel splitter for dual mono outputs
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
	}

	/**
	 * Set coordinate data for audio generation
	 * Optimized to reduce memory allocations and improve performance
	 *
	 * @param coordinates - Array of coordinate points
	 * @returns This instance for method chaining
	 */
	setCoordinates(coordinates: CoordinatePoint[]): this {
		// Input validation
		if (!Array.isArray(coordinates)) {
			console.error('🚨 ThreeWorkletNode: coordinates must be an array');
			throw new Error('Coordinates must be an array');
		}

		if (coordinates.length === 0) {
			console.warn('⚠️ ThreeWorkletNode: empty coordinate array provided');
			return this;
		}

		// Validate coordinate format more efficiently
		const firstInvalidIndex = coordinates.findIndex(
			(coord) =>
				typeof coord !== 'object' ||
				typeof coord.x !== 'number' ||
				typeof coord.y !== 'number' ||
				!Number.isFinite(coord.x) ||
				!Number.isFinite(coord.y)
		);

		if (firstInvalidIndex !== -1) {
			console.error(
				`🚨 ThreeWorkletNode: invalid coordinate at index ${firstInvalidIndex}:`,
				coordinates[firstInvalidIndex]
			);
			throw new Error(
				`Invalid coordinate format at index ${firstInvalidIndex}`
			);
		}

		// Avoid unnecessary copying if coordinates haven't changed
		if (
			this._coordinates.length === coordinates.length &&
			this._coordinates.every(
				(coord, i) =>
					coord.x === coordinates[i].x && coord.y === coordinates[i].y
			)
		) {
			return this; // No change, skip update
		}

		this._coordinates = [...coordinates];

		// Send to worklet if ready
		if (this.isReady) {
			this.postMessage({
				type: 'coordinate-data',
				data: { coordinates: this._coordinates },
			});
		}

		return this;
	}

	/**
	 * Start generating audio from coordinates
	 *
	 * @returns This instance for method chaining
	 */
	start(): this {
		try {
			if (this.isReady && !this._isPlaying) {
				// Send coordinates if we have them
				if (this._coordinates.length > 0) {
					this.postMessage({
						type: 'coordinate-data',
						data: { coordinates: this._coordinates },
					});
				}

				this.postMessage({ type: 'start' });
				this._isPlaying = true;
			}
		} catch (error) {
			console.error('🚨 Failed to start ThreeWorkletNode:', error);
		}
		return this;
	}

	/**
	 * Stop generating audio
	 *
	 * @returns This instance for method chaining
	 */
	stop(): this {
		try {
			if (this.isReady && this._isPlaying) {
				this.postMessage({ type: 'stop' });
				this._isPlaying = false;
			}
		} catch (error) {
			console.error('🚨 Failed to stop ThreeWorkletNode:', error);
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
	 * Get current coordinates
	 */
	get coordinates(): CoordinatePoint[] {
		return [...this._coordinates];
	}

	/**
	 * Update the worklet's parameters to match our Tone.js parameters
	 */
	private updateWorkletParameters(): void {
		if (this.isReady && this.workletNode) {
			if (this.workletNode.parameters.has('volume')) {
				const volumeParam = this.workletNode.parameters.get('volume')!;
				volumeParam.value = this.volume.value;
			}
			if (this.workletNode.parameters.has('playbackSpeed')) {
				const speedParam = this.workletNode.parameters.get('playbackSpeed')!;
				speedParam.value = this.playbackSpeed.value;
			}
			if (this.workletNode.parameters.has('interpolationStep')) {
				const interpParam =
					this.workletNode.parameters.get('interpolationStep')!;
				interpParam.value = this.interpolationStep.value;
			}
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
		this.updateWorkletParameters();
		return this;
	}

	/**
	 * Set the playback speed
	 *
	 * @param value - Playback speed (positive number)
	 * @returns This instance for method chaining
	 */
	setPlaybackSpeed(value: number): this {
		// Input validation
		if (typeof value !== 'number' || value <= 0) {
			console.error('🚨 ThreeWorkletNode: Invalid playbackSpeed value', value);
			throw new Error('PlaybackSpeed must be a positive number');
		}

		this.playbackSpeed.value = value;
		this.updateWorkletParameters();
		return this;
	}

	/**
	 * Set the interpolation step factor
	 *
	 * @param value - Interpolation step factor (positive number, typically 0.001 to 1.0)
	 * @returns This instance for method chaining
	 */
	setInterpolationStep(value: number): this {
		// Input validation
		if (typeof value !== 'number' || value <= 0) {
			console.error(
				'🚨 ThreeWorkletNode: Invalid interpolationStep value',
				value
			);
			throw new Error('InterpolationStep must be a positive number');
		}

		this.interpolationStep.value = value;
		this.updateWorkletParameters();
		return this;
	}

	/**
	 * Get default options for ThreeWorkletNode
	 */
	static getDefaults(): ThreeWorkletNodeOptions {
		return Object.assign(ToneWorkletBase.getDefaults(), {
			autostart: false,
			volume: 0.5,
			playbackSpeed: 1.0,
			interpolationStep: 0.1,
		});
	}

	/**
	 * Clean up and release resources
	 */
	dispose(): this {
		// Stop audio generation if playing
		if (this._isPlaying) {
			this.stop();
		}

		// Dispose of Tone.js components
		this.volume.dispose();
		this.playbackSpeed.dispose();
		this.interpolationStep.dispose();
		this.output.dispose();
		this.outputX.dispose();
		this.outputY.dispose();
		this._channelSplitter.dispose();

		// Clear coordinate data
		this._coordinates = [];

		// Call parent dispose
		super.dispose();

		return this;
	}
}
