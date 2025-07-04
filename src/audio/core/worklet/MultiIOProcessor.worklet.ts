/**
 * Multi input/output processor for AudioWorklet
 *
 * Provides an interface for complex audio processing with multiple inputs and outputs.
 * Useful for advanced effects like multiband processors, stereo effects, or analysis nodes.
 */

import './ReactoscopeWorkletProcessor.worklet';
import { addBaseClass } from '../WorkletRegistry';

const multiIOProcessor = /* javascript */ `
/**
 * Abstract class for multi input/output audio processing
 * Provides an interface for complex routing and processing scenarios
 * 
 * @extends ReactoscopeWorkletProcessor
 */
class MultiIOProcessor extends ReactoscopeWorkletProcessor {
	/**
	 * @param {AudioWorkletNodeOptions} options - AudioWorkletProcessor init options
	 */
	constructor(options) {
		super(options);
		
		/**
		 * Current parameter values - updated per block
		 * @type {Object.<string, number>}
		 * @protected
		 */
		this.params = {};
		
		/**
		 * Number of input channels expected
		 * @type {number}
		 * @protected
		 */
		this.inputChannels = options.numberOfInputs || 2;
		
		/**
		 * Number of output channels to produce
		 * @type {number}
		 * @protected
		 */
		this.outputChannels = options.numberOfOutputs || 2;
		
		/**
		 * Internal buffers for intermediate processing
		 * @type {Float32Array[]}
		 * @protected
		 */
		this.internalBuffers = [];
		
		// Initialize internal buffers
		for (let i = 0; i < Math.max(this.inputChannels, this.outputChannels); i++) {
			this.internalBuffers[i] = new Float32Array(this.blockSize);
		}
		
		this.log(\`MultiIOProcessor initialized with \${this.inputChannels} inputs, \${this.outputChannels} outputs\`);
	}
	
	/**
	 * Process a block of audio with multiple inputs/outputs
	 * Override this method in subclasses to implement audio processing
	 * 
	 * @param {Float32Array[]} inputBuffers - array of input channel buffers
	 * @param {Float32Array[]} outputBuffers - array of output channel buffers to fill
	 * @param {Object.<string, number>} params - current parameter values
	 * @param {number} blockSize - number of samples in this block (usually 128)
	 * @protected
	 */
	processBlock(inputBuffers, outputBuffers, params, blockSize) {
		// Default implementation copies input to output
		// Override in subclasses for actual processing
		const channelCount = Math.min(inputBuffers.length, outputBuffers.length);
		
		for (let channel = 0; channel < channelCount; channel++) {
			if (inputBuffers[channel] && outputBuffers[channel]) {
				outputBuffers[channel].set(inputBuffers[channel]);
			}
		}
	}

	/**
	 * Update parameter values for the current block
	 * Averages a-rate parameters across the block for stability
	 * 
	 * @param {Object.<string, Float32Array>} parameters - raw parameter arrays from AudioWorklet
	 * @protected
	 */
	updateParams(parameters) {
		for (const paramName in parameters) {
			const paramArray = parameters[paramName];
			
			if (paramArray.length > 1) {
				// A-rate parameter - calculate average across the block
				let sum = 0;
				for (let i = 0; i < paramArray.length; i++) {
					sum += paramArray[i];
				}
				this.params[paramName] = sum / paramArray.length;
			} else {
				// K-rate parameter - use single value
				this.params[paramName] = paramArray[0];
			}
		}
	}
	
	/**
	 * Get input buffer for a specific channel, with safety checks
	 * 
	 * @param {Float32Array[][]} inputs - input arrays from process()
	 * @param {number} inputIndex - input node index (usually 0)
	 * @param {number} channel - channel index
	 * @returns {Float32Array|null} - input buffer or null if not available
	 * @protected
	 */
	getInputBuffer(inputs, inputIndex, channel) {
		return inputs[inputIndex] && inputs[inputIndex][channel] ? inputs[inputIndex][channel] : null;
	}
	
	/**
	 * Get output buffer for a specific channel, with safety checks
	 * 
	 * @param {Float32Array[][]} outputs - output arrays from process()
	 * @param {number} outputIndex - output node index (usually 0)
	 * @param {number} channel - channel index
	 * @returns {Float32Array|null} - output buffer or null if not available
	 * @protected
	 */
	getOutputBuffer(outputs, outputIndex, channel) {
		return outputs[outputIndex] && outputs[outputIndex][channel] ? outputs[outputIndex][channel] : null;
	}

	/**
	 * Process audio data - main entry point
	 * 
	 * @param {Float32Array[][]} inputs - input audio data [input][channel][sample]
	 * @param {Float32Array[][]} outputs - output audio buffers to fill [output][channel][sample]
	 * @param {Object.<string, Float32Array>} parameters - AudioWorklet parameters
	 * @returns {boolean} - true to keep processor alive
	 */
	process(inputs, outputs, parameters) {
		// Start performance monitoring
		this.monitorPerformance(true);
		
		// Update parameter values for this block
		this.updateParams(parameters);
		
		// Prepare input buffers
		const inputBuffers = [];
		const input = inputs[0] || [];
		
		for (let channel = 0; channel < this.inputChannels; channel++) {
			inputBuffers[channel] = input[channel] || new Float32Array(this.blockSize);
		}
		
		// Prepare output buffers
		const outputBuffers = [];
		const output = outputs[0] || [];
		
		for (let channel = 0; channel < this.outputChannels; channel++) {
			outputBuffers[channel] = output[channel] || new Float32Array(this.blockSize);
		}
		
		// Process the block
		this.processBlock(inputBuffers, outputBuffers, this.params, this.blockSize);
		
		// Copy processed buffers back to outputs
		for (let channel = 0; channel < this.outputChannels; channel++) {
			if (output[channel] && outputBuffers[channel]) {
				output[channel].set(outputBuffers[channel]);
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
	 * Helper method to apply gain to a buffer
	 * 
	 * @param {Float32Array} buffer - audio buffer to modify
	 * @param {number} gain - gain value to apply
	 * @protected
	 */
	applyGain(buffer, gain) {
		for (let i = 0; i < buffer.length; i++) {
			buffer[i] *= gain;
		}
	}
	
	/**
	 * Helper method to mix two buffers together
	 * 
	 * @param {Float32Array} destination - destination buffer (modified in place)
	 * @param {Float32Array} source - source buffer to mix in
	 * @param {number} mixLevel - mix level (0-1, where 1 = equal mix)
	 * @protected
	 */
	mixBuffers(destination, source, mixLevel = 0.5) {
		const invMix = 1 - mixLevel;
		for (let i = 0; i < Math.min(destination.length, source.length); i++) {
			destination[i] = destination[i] * invMix + source[i] * mixLevel;
		}
	}
}
`;

// Add the MultiIOProcessor class to the worklet global scope
addBaseClass(multiIOProcessor);
