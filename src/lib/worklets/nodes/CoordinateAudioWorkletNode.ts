/**
 * CoordinateAudioWorkletNode - Coordinate data to audio converter using AudioWorklet
 *
 * This node converts 3D coordinate data to audio using AudioWorklet within the Tone.js ecosystem
 * for use in Reactoscope.
 */

import * as Tone from 'tone';
import { ToneWorkletBase } from '../ToneWorkletBase';
import type { WorkletBaseOptions } from '../WorkletTypes';

// Import the processor to ensure it's registered
import '../processors/CoordinateAudioProcessor.worklet';

/**
 * Configuration options for the CoordinateAudioWorkletNode
 */
export interface CoordinateAudioWorkletNodeOptions extends WorkletBaseOptions {
	/**
	 * Which axis to convert to audio ('x' or 'y')
	 * @default 'x'
	 */
	axis?: 'x' | 'y';

	/**
	 * Buffer size for coordinate data
	 * @default 512
	 */
	bufferSize?: number;

	/**
	 * Initial gain level (0.0 - 1.0)
	 * @default 0.5
	 */
	gain?: number;

	/**
	 * Playback frequency multiplier
	 * @default 1.0
	 */
	frequency?: number;
}

/**
 * Coordinate data to audio converter audio node using AudioWorklet
 *
 * @example
 * ```typescript
 * // Basic usage
 * const coordinateAudio = new CoordinateAudioWorkletNode({ axis: 'x' });
 * const gainNode = new Tone.Gain(0.5).toDestination();
 * coordinateAudio.connect(gainNode);
 *
 * // Wait for worklet to be ready, then update buffer
 * coordinateAudio.ready.then(() => {
 *   const coordinateBuffer = new Float32Array(512);
 *   // Fill buffer with coordinate data...
 *   coordinateAudio.updateBuffer(coordinateBuffer);
 * });
 * ```
 */
export class CoordinateAudioWorkletNode extends ToneWorkletBase<CoordinateAudioWorkletNodeOptions> {
	readonly name: string = 'CoordinateAudioWorkletNode';

	/**
	 * This is a source node, so input is undefined
	 */
	readonly input: undefined = undefined;

	/**
	 * Output for generated audio
	 */
	readonly output: Tone.Gain;

	/**
	 * Gain parameter for controlling coordinate audio amplitude
	 */
	readonly gain: Tone.Param<'normalRange'>;

	/**
	 * Frequency parameter for controlling playback speed
	 */
	readonly frequency: Tone.Param<'positive'>;

	/**
	 * Current axis being converted to audio
	 */
	private _axis: 'x' | 'y';

	/**
	 * Buffer size for coordinate data
	 */
	private _bufferSize: number;

	/**
	 * Create a new CoordinateAudioWorkletNode
	 *
	 * @param options - Configuration options
	 */
	constructor(options: Partial<CoordinateAudioWorkletNodeOptions> = {}) {
		// Merge default options with provided options
		const opts = {
			...CoordinateAudioWorkletNode.getDefaults(),
			...options,
		};

		super(opts);

		this._axis = opts.axis ?? 'x';
		this._bufferSize = opts.bufferSize ?? 512;

		// Create output gain node
		this.output = new Tone.Gain({
			context: this.context,
			gain: 1.0,
		});

		// Create gain parameter
		this.gain = new Tone.Param<'normalRange'>({
			context: this.context,
			value: opts.gain ?? 0.5,
			units: 'normalRange',
			param: this._dummyParam,
			swappable: true,
		});

		// Create frequency parameter
		this.frequency = new Tone.Param<'positive'>({
			context: this.context,
			value: opts.frequency ?? 1.0,
			units: 'positive',
			param: this._dummyParam,
			swappable: true,
		});

		// Set worklet options for the processor
		this.workletOptions = {
			processorOptions: {
				axis: this._axis,
				bufferSize: this._bufferSize,
				gain: opts.gain ?? 0.5,
				frequency: opts.frequency ?? 1.0,
			},
		};
	}

	/**
	 * Get default options for the node
	 */
	static getDefaults(): CoordinateAudioWorkletNodeOptions {
		return {
			...ToneWorkletBase.getDefaults(),
			axis: 'x',
			bufferSize: 512,
			gain: 0.5,
			frequency: 1.0,
		};
	}

	/**
	 * Get the AudioWorklet processor name
	 */
	protected _audioWorkletName(): string {
		return 'coordinate-audio-processor';
	}

	/**
	 * Called when the AudioWorkletNode is ready
	 */
	protected onReady(node: AudioWorkletNode): void {
		// Connect the worklet to the output
		node.connect(this.output.input);
	}

	/**
	 * Update the coordinate buffer
	 *
	 * @param buffer - Float32Array containing coordinate data
	 */
	updateBuffer(buffer: Float32Array): void {
		if (this._worklet && buffer.length === this._bufferSize) {
			this._worklet.port.postMessage({
				type: 'updateBuffer',
				data: Array.from(buffer),
			});
		}
	}

	/**
	 * Set the gain level
	 *
	 * @param gain - Gain level (0.0 - 1.0)
	 */
	setGain(gain: number): void {
		if (this._worklet) {
			this._worklet.port.postMessage({
				type: 'setGain',
				data: Math.max(0, Math.min(1, gain)),
			});
		}
	}

	/**
	 * Set the frequency (playback speed)
	 *
	 * @param frequency - Frequency multiplier (0.1 - 10.0)
	 */
	setFrequency(frequency: number): void {
		if (this._worklet) {
			this._worklet.port.postMessage({
				type: 'setFrequency',
				data: Math.max(0.1, Math.min(10, frequency)),
			});
		}
	}

	/**
	 * Set the axis to convert to audio
	 *
	 * @param axis - 'x' or 'y'
	 */
	setAxis(axis: 'x' | 'y'): void {
		this._axis = axis;
		if (this._worklet) {
			this._worklet.port.postMessage({
				type: 'setAxis',
				data: axis,
			});
		}
	}

	/**
	 * Get the current axis
	 */
	get axis(): 'x' | 'y' {
		return this._axis;
	}

	/**
	 * Get the buffer size
	 */
	get bufferSize(): number {
		return this._bufferSize;
	}

	/**
	 * Dispose of the node and clean up resources
	 */
	dispose(): this {
		this.gain.dispose();
		this.frequency.dispose();
		this.output.dispose();
		return super.dispose();
	}
}
