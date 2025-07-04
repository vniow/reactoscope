/**
 * BitCrusher AudioWorklet Processor
 *
 * Implements bit reduction and samp	generate(input, channel, parameters) {
		// Increment block		// Debug extreme values to see if we're processing correctly
		if (this.blockCount % 1000 === 0 && channel === 0 && Math.abs(input) > 0.01) {
			this.log(`BitCrusher: dry=${drySignal.toFixed(4)}, wet=${wetSignal.toFixed(4)}, output=${output.toFixed(4)}`);
		}nt for debugging (only on first channel to avoid double counting)
		if (channel === 0) {
			this.blockCount++;
		}
		
		// Debug logging every 1000 samples to see if we're processing
		if (this.blockCount % 1000 === 0 && channel === 0) {
			this.log(`BitCrusher processing: input=${input.toFixed(4)}, bits=${parameters.bits}, sampleRate=${parameters.sampleRate}, wet=${parameters.wet}`);
		}te reduction for lo-fi effects.
 * Extends SingleIOProcessor for sample-by-sample processing.
 */

import '../../core/worklet/SingleIOProcessor.worklet';
import { registerProcessor } from '../../core/WorkletRegistry';

// The processor class as a JavaScript string (executed in worklet context)
const bitCrusherProcessor = /* javascript */ `
/**
 * BitCrusher worklet processor
 * Reduces bit depth and sample rate for lo-fi digital distortion effects
 * 
 * @extends SingleIOProcessor
 */
class ReactoscopeBitCrusherProcessor extends SingleIOProcessor {
	/**
	 * Define the parameters for this processor
	 * @returns {AudioParamDescriptor[]} parameter descriptors
	 */
	static get parameterDescriptors() {
		return [
			{
				name: "bits",
				defaultValue: 8,
				minValue: 1,
				maxValue: 16,
				automationRate: 'k-rate'
			},
			{
				name: "sampleRate",
				defaultValue: 8000,
				minValue: 100,
				maxValue: 48000,
				automationRate: 'k-rate'
			},
			{
				name: "wet",
				defaultValue: 1.0,
				minValue: 0,
				maxValue: 1,
				automationRate: 'a-rate'
			}
		];
	}

	constructor(options) {
		super(options);
		
		/**
		 * Internal state for sample rate reduction
		 * @type {Object}
		 * @private
		 */
		this.state = {
			// Sample rate reduction state
			sampleAccumulator: 0,
			lastOutput: 0,
			// Per-channel state (use object for sparse channels)
			channelStates: {}
		};
		
		this.blockCount = 0;
		this.log("BitCrusher processor initialized");
	}

	/**
	 * Process a single sample with bit crushing and sample rate reduction
	 * 
	 * @param {number} input - input sample value (-1 to 1)
	 * @param {number} channel - channel number (0-based)
	 * @param {Object} parameters - parameter values
	 * @param {number} parameters.bits - bit depth (1-16)
	 * @param {number} parameters.sampleRate - target sample rate for reduction
	 * @param {number} parameters.wet - wet/dry mix (0-1)
	 * @returns {number} processed sample
	 */
	generate(input, channel, parameters) {
		// Increment block count for debugging (only on first channel to avoid double counting)
		if (channel === 0) {
			this.blockCount++;
		}
		
		// Debug logging every 1000 samples to see if we're processing
		if (this.blockCount % 1000 === 0 && channel === 0) {
			this.log("BitCrusher processing: input=" + input.toFixed(4) + ", bits=" + parameters.bits + ", sampleRate=" + parameters.sampleRate + ", wet=" + parameters.wet);
		}
		
		// Ensure we have state for this channel
		if (!this.state.channelStates[channel]) {
			this.state.channelStates[channel] = {
				sampleAccumulator: 0,
				lastOutput: 0
			};
		}
		
		const channelState = this.state.channelStates[channel];
		
		// Sample rate reduction
		let processedSample = input;
		
		if (parameters.sampleRate < this.sampleRate) {
			// Calculate sample reduction ratio
			const reductionRatio = this.sampleRate / parameters.sampleRate;
			channelState.sampleAccumulator += 1;
			
			if (channelState.sampleAccumulator >= reductionRatio) {
				// Time to update the output
				channelState.lastOutput = input;
				channelState.sampleAccumulator = 0;
			}
			
			processedSample = channelState.lastOutput;
		}
		
		// Bit reduction (quantization) - make it more aggressive for testing
		if (parameters.bits < 16) {
			// Calculate step size for the bit depth
			const levels = Math.pow(2, parameters.bits);
			const step = 2.0 / levels; // Full range from -1 to 1
			
			// Quantize the sample to the step size
			processedSample = Math.round(processedSample / step) * step;
			
			// Clamp to prevent overflow
			processedSample = Math.max(-1, Math.min(1, processedSample));
		}
		
		// Wet/dry mix
		const wetSignal = processedSample;
		const drySignal = input;
		const output = drySignal * (1 - parameters.wet) + wetSignal * parameters.wet;
		
		// Debug extreme values to see if we're processing correctly
		if (this.blockCount % 1000 === 0 && channel === 0 && Math.abs(input) > 0.01) {
			this.log("BitCrusher: dry=" + drySignal.toFixed(4) + ", wet=" + wetSignal.toFixed(4) + ", output=" + output.toFixed(4));
		}
		
		return output;
	}
	
	/**
	 * Handle parameter changes for optimization
	 * 
	 * @protected
	 * @param {string} name - parameter name
	 * @param {number} value - new parameter value
	 */
	onParameterChange(name, value) {
		super.onParameterChange(name, value);
		
		if (name === 'sampleRate') {
			// Reset sample rate reduction state when sample rate changes
			this.state.channelStates.forEach(channelState => {
				if (channelState) {
					channelState.sampleAccumulator = 0;
				}
			});
		}
	}
	
	/**
	 * Handle messages from the main thread
	 * 
	 * @protected
	 * @param {MessageEvent} event - message event from the main thread
	 */
	_onMessage(event) {
		super._onMessage(event);
		
		if (event.data?.type === 'reset') {
			// Reset internal state
			this.state.channelStates = [];
			this.log("BitCrusher state reset");
		}
	}
}
`;

// Register the BitCrusher processor with the worklet registry
registerProcessor({
	name: 'reactoscope-bitcrusher',
	classCode: bitCrusherProcessor,
	nodeType: 'bitcrusher',
	description: 'Lo-fi bit crushing effect with sample rate reduction',
	parameterDescriptors: [
		{
			name: 'bits',
			defaultValue: 8,
			minValue: 1,
			maxValue: 16,
			automationRate: 'k-rate',
			description: 'Bit depth for quantization (lower = more distortion)',
		},
		{
			name: 'sampleRate',
			defaultValue: 8000,
			minValue: 100,
			maxValue: 48000,
			automationRate: 'k-rate',
			description: 'Target sample rate for reduction',
		},
		{
			name: 'wet',
			defaultValue: 1.0,
			minValue: 0,
			maxValue: 1,
			automationRate: 'a-rate',
			description: 'Wet/dry mix (0 = dry, 1 = wet)',
		},
	],
	channels: { inputs: 1, outputs: 1 },
});

export const workletName = 'reactoscope-bitcrusher';
