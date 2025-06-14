/**
 * SingleIOProcessor - Simplified processor for single input/output worklets
 *
 * This processor extends ToneAudioWorkletProcessor to provide a simplified interface
 * for worklets that process audio one sample at a time.
 */

import './ToneAudioWorkletProcessor.worklet';
import { addBaseClass } from '../WorkletGlobalScope';

/**
 * Single input/output processor for AudioWorklets that process audio sample by sample
 * This code will be executed in the AudioWorklet context
 */
export const singleIOProcessor = /* javascript */ `
	/**
	 * Abstract class for single input/output processors
	 * Provides a simplified interface for processing audio one sample at a time
	 * 
	 * @extends ToneAudioWorkletProcessor
	 */
	class SingleIOProcessor extends ToneAudioWorkletProcessor {
		/**
		 * @param {Object} options - AudioWorkletProcessor initialization options
		 */
		constructor(options) {
			super(Object.assign({}, options, {
				numberOfInputs: 1,
				numberOfOutputs: 1
			}));
			
			/**
			 * Current parameter values for processing
			 * @type {Object.<string, number>}
			 * @protected
			 */
			this.params = {};
		}
		
		/**
		 * Generate a single sample of audio output
		 * Override this method in subclasses to implement audio processing
		 * 
		 * @param {number} input - Input sample value
		 * @param {number} channel - Channel index
		 * @param {Object.<string, number>} params - Current parameter values
		 * @returns {number} Output sample value
		 */
		generate(input, channel, params) {
			// Default implementation - pass through input
			return input;
		}
		
		/**
		 * Update parameter values for the current sample
		 * 
		 * @param {Object.<string, Float32Array>} parameters - Raw parameter arrays
		 * @param {number} sampleIndex - Current sample index
		 * @protected
		 */
		updateParams(parameters, sampleIndex) {
			for (const paramName in parameters) {
				const paramArray = parameters[paramName];
				if (paramArray.length > 1) {
					// Use per-sample values if available
					this.params[paramName] = paramArray[sampleIndex];
				} else {
					// Use constant value for the entire block
					this.params[paramName] = paramArray[0];
				}
			}
		}
		
		/**
		 * Process audio data using the generate method
		 * 
		 * @param {Float32Array[][]} inputs - Input audio data
		 * @param {Float32Array[][]} outputs - Output audio buffers to fill
		 * @param {Object.<string, Float32Array>} parameters - AudioWorklet parameters
		 * @returns {boolean} Whether to keep the processor alive
		 */
		process(inputs, outputs, parameters) {
			if (this.disposed) {
				return false;
			}
			
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
					// Get input sample (or 0 if no input)
					const inputSample = input && input[channel] 
						? input[channel][sampleIndex] 
						: 0;
					
					// Generate output sample
					const outputSample = this.generate(inputSample, channel, this.params);
					
					// Write to output buffer
					if (output[channel]) {
						output[channel][sampleIndex] = outputSample;
					}
				}
			}
			
			// Keep processor alive unless disposed
			return !this.disposed;
		}
	}
`;

// Register the base class in the worklet global scope
addBaseClass(singleIOProcessor);
