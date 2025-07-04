/**
 * BitCrusher Worklet Node Implementation
 *
 * Provides a Tone.js-compatible interface for the BitCrusher worklet processor.
 * Extends ReactoscopeWorkletBase for consistent parameter handling and lifecycle management.
 */

import * as Tone from 'tone';
import {
	ReactoscopeWorkletBase,
	type ReactoscopeWorkletOptions,
} from '../../core/ReactoscopeWorkletBase';
import type { BitCrusherParams } from '../../types';

// Import the worklet processor to register it
import '../../worklets/processors/BitCrusher.worklet';

/**
 * Options interface for BitCrusher worklet node
 */
export interface BitCrusherWorkletNodeOptions
	extends ReactoscopeWorkletOptions {
	bits?: number;
	sampleRate?: number;
	wet?: number;
}

/**
 * BitCrusher worklet node implementation
 *
 * Provides lo-fi bit crushing and sample rate reduction effects using AudioWorklets
 * for high-performance real-time processing.
 *
 * @example
 * ```typescript
 * // Create a bit crusher with 4-bit quantization
 * const bitCrusher = new BitCrusherWorkletNode({ bits: 4, wet: 0.8 });
 *
 * // Connect to audio graph
 * oscillator.connect(bitCrusher).toDestination();
 *
 * // Animate parameters
 * bitCrusher.bits.rampTo(1, 2); // Extreme crushing over 2 seconds
 * bitCrusher.wet.value = 0.5; // 50% wet/dry mix
 * ```
 */
export class BitCrusherWorkletNode extends ReactoscopeWorkletBase<BitCrusherWorkletNodeOptions> {
	readonly name = 'BitCrusherWorkletNode';

	// Tone.js style I/O nodes
	readonly input: Tone.Gain;
	readonly output: Tone.Gain;

	// Audio parameters with automation support
	readonly bits: Tone.Param<'positive'>;
	readonly sampleRateReduction: Tone.Param<'positive'>;
	readonly wet: Tone.Param<'normalRange'>;

	constructor(options: Partial<BitCrusherWorkletNodeOptions> = {}) {
		const opts = { ...BitCrusherWorkletNode.getDefaults(), ...options };
		super(opts);

		// Create I/O nodes for audio routing
		this.input = new Tone.Gain({ context: this.context });
		this.output = new Tone.Gain({ context: this.context });

		// Create automatable parameters
		this.bits = this.createParameter('bits', opts.bits!, 'positive', 1, 16);
		this.sampleRateReduction = this.createParameter(
			'sampleRate',
			opts.sampleRate!,
			'positive',
			100,
			48000
		);
		this.wet = this.createParameter('wet', opts.wet!, 'normalRange', 0, 1);

		if (this.debug) {
			console.log(
				`🎛️ BitCrusher initialized: bits=${opts.bits}, sampleRate=${opts.sampleRate}, wet=${opts.wet}`
			);
		}
	}

	/**
	 * Get the worklet processor name
	 * @protected
	 */
	protected getProcessorName(): string {
		return 'reactoscope-bitcrusher';
	}

	/**
	 * Set up audio routing and parameter mapping when worklet is ready
	 * @protected
	 */
	protected onWorkletReady(worklet: AudioWorkletNode): void {
		// Set up audio signal routing
		// Input -> Worklet -> Output
		this.input.connect(worklet).connect(this.output);

		// Map Tone.js parameters to worklet AudioParams
		const bitsParam = worklet.parameters.get('bits');
		const sampleRateParam = worklet.parameters.get('sampleRate');
		const wetParam = worklet.parameters.get('wet');

		this.mapParameterToWorklet('bits', this.bits, bitsParam!);
		this.mapParameterToWorklet(
			'sampleRate',
			this.sampleRateReduction,
			sampleRateParam!
		);
		this.mapParameterToWorklet('wet', this.wet, wetParam!);

		if (this.debug) {
			console.log('✅ BitCrusher audio routing and parameters configured');
		}
	}

	/**
	 * Reset the internal state of the bit crusher
	 */
	reset(): void {
		this.sendMessageToWorklet({ type: 'reset' });

		if (this.debug) {
			console.log('🔄 BitCrusher state reset');
		}
	}

	/**
	 * Set bit depth with validation
	 */
	setBits(bits: number): void {
		const clampedBits = Math.max(1, Math.min(16, Math.round(bits)));
		this.bits.value = clampedBits;

		if (this.debug) {
			console.log(`🔧 BitCrusher bits set to: ${clampedBits}`);
		}
	}

	/**
	 * Set sample rate reduction with validation
	 */
	setSampleRate(sampleRate: number): void {
		const clampedRate = Math.max(100, Math.min(48000, sampleRate));
		this.sampleRateReduction.value = clampedRate;

		if (this.debug) {
			console.log(`🔧 BitCrusher sample rate set to: ${clampedRate}`);
		}
	}

	/**
	 * Set wet/dry mix with validation
	 */
	setWet(wet: number): void {
		const clampedWet = Math.max(0, Math.min(1, wet));
		this.wet.value = clampedWet;

		if (this.debug) {
			console.log(`🔧 BitCrusher wet mix set to: ${clampedWet}`);
		}
	}

	/**
	 * Get current parameter values for saving/loading
	 */
	getState(): BitCrusherParams {
		return {
			bits: this.bits.value,
			sampleRate: this.sampleRateReduction.value,
			wet: this.wet.value,
		};
	}

	/**
	 * Load parameter values from state
	 */
	setState(params: Partial<BitCrusherParams>): void {
		if (params.bits !== undefined) this.setBits(params.bits);
		if (params.sampleRate !== undefined) this.setSampleRate(params.sampleRate);
		if (params.wet !== undefined) this.setWet(params.wet);
	}

	/**
	 * Get default configuration
	 */
	static getDefaults(): BitCrusherWorkletNodeOptions {
		return {
			...ReactoscopeWorkletBase.getDefaults(),
			nodeType: 'bitcrusher',
			bits: 4, // More extreme default for testing
			sampleRate: 4000, // More extreme sample rate reduction
			wet: 1.0,
			debug: true, // Enable debug logging for testing
		};
	}

	/**
	 * Clean up resources
	 */
	dispose(): this {
		if (this.debug) {
			console.log('🧹 Disposing BitCrusher worklet node');
		}

		// Dispose parameters
		this.bits.dispose();
		this.sampleRateReduction.dispose();
		this.wet.dispose();

		// Dispose I/O nodes
		this.input.dispose();
		this.output.dispose();

		// Call parent dispose
		super.dispose();

		return this;
	}
}
