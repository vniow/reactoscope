/**
 * Single input/output processor for AudioWorklet
 *
 * Provides a simplified interface for processing audio one sample at a time.
 * Extends ReactoscopeWorkletProcessor with sample-by-sample processing pattern.
 */

import './ReactoscopeWorkletProcessor.worklet';
import { addBaseClass } from '../WorkletRegistry';

const singleIOProcessor = /* javascript */ `
/**
 * Abstract class for single input/output audio processing
 * Provides a simplified interface for processing audio one sample at a time
 * 
 * @extends ReactoscopeWorkletProcessor
 */
class SingleIOProcessor extends ReactoscopeWorkletProcessor {
	/**
	 * @param {AudioWorkletNodeOptions} options - AudioWorkletProcessor init options
	 */
	constructor(options) {
		super(Object.assign({}, options, {
			numberOfInputs: 1,
			numberOfOutputs: 1
		}));
		
		/**
		 * Current parameter values - updated on each sample
		 * @type {Object.<string, number>}
		 * @protected
		 */
		this.params = {};
		
		this.log("SingleIOProcessor initialized");
	}
	
	/**
	 * Generate a single sample of audio output
	 * Override this method in subclasses to implement audio processing
	 * 
	 * @param {number} input - input sample value (-1 to 1)
	 * @param {number} channel - channel index (0-based)
	 * @param {Object.<string, number>} params - current parameter values
	 * @returns {number} output sample value (-1 to 1)
	 */
	generate(input, channel, params) {
		// Default implementation is pass-through
		// Override in subclasses for actual processing
		return input;
	}

	/**
	 * Update parameter values for the current sample
	 * Handles both k-rate and a-rate parameters
	 * 
	 * @param {Object.<string, Float32Array>} parameters - raw parameter arrays from AudioWorklet
	 * @param {number} sampleIndex - current sample index in the block
	 * @protected
	 */
	updateParams(parameters, sampleIndex) {
		for (const paramName in parameters) {
			const paramArray = parameters[paramName];
			
			// Handle both k-rate (length 1) and a-rate (length = blockSize) parameters
			if (paramArray.length > 1) {
				// A-rate parameter - use sample-specific value
				this.params[paramName] = paramArray[sampleIndex];
			} else {
				// K-rate parameter - use single value for entire block
				this.params[paramName] = paramArray[0];
			}
		}
	}

	/**
	 * Process audio data
	 * Handles the main processing loop with per-sample parameter updates
	 * 
	 * @param {Float32Array[][]} inputs - input audio data [input][channel][sample]
	 * @param {Float32Array[][]} outputs - output audio buffers to fill [output][channel][sample]
	 * @param {Object.<string, Float32Array>} parameters - AudioWorklet parameters
	 * @returns {boolean} - true to keep processor alive
	 */
	process(inputs, outputs, parameters) {
		// Start performance monitoring
		this.monitorPerformance(true);
		
		const input = inputs[0];
		const output = outputs[0];
		
		// Determine channel count from available inputs/outputs
		const channelCount = Math.max(
			input && input.length || 0, 
			output.length
		);
		
		// Process each sample in the block
		for (let sampleIndex = 0; sampleIndex < this.blockSize; sampleIndex++) {
			// Update parameter values for this sample
			this.updateParams(parameters, sampleIndex);
			
			// Process each channel
			for (let channel = 0; channel < channelCount; channel++) {
				// Get input sample (or 0 if no input available)
				const inputSample = input && input.length > channel 
					? input[channel][sampleIndex] 
					: 0;
				
				// Generate output sample using the overridden generate method
				const outputSample = this.generate(inputSample, channel, this.params);
				
				// Ensure output buffer exists for this channel
				if (output[channel]) {
					output[channel][sampleIndex] = outputSample;
				}
			}
		}
		
		// End performance monitoring
		this.monitorPerformance(false);
		
		// Increment block counter
		this.blockCount++;
		
		// Keep processor alive unless disposed
		return !this.disposed;
	}
	
	/**
	 * Handle parameter changes - override for parameter-specific logic
	 * 
	 * @protected
	 * @param {string} name - parameter name
	 * @param {number} value - new parameter value
	 */
	onParameterChange(name, value) {
		super.onParameterChange(name, value);
		// Additional parameter change handling can be added in subclasses
	}
}
`;

// Add the SingleIOProcessor class to the worklet global scope
addBaseClass(singleIOProcessor);
