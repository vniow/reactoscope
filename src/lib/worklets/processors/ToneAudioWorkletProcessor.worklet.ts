/**
 * ToneAudioWorkletProcessor - Base AudioWorkletProcessor for Tone.js integration
 *
 * This is the foundational processor class that all other worklet processors extend.
 * It provides common functionality for message handling, parameter management, and lifecycle.
 */

import { addBaseClass } from '../WorkletGlobalScope';

/**
 * Base AudioWorkletProcessor implementation for Tone.js worklets
 * This code will be executed in the AudioWorklet context
 */
export const toneAudioWorkletProcessor = /* javascript */ `
	/**
	 * Base class for all Tone.js AudioWorklet processors
	 * Provides common functionality for message handling and lifecycle management
	 * 
	 * @extends AudioWorkletProcessor
	 */
	class ToneAudioWorkletProcessor extends AudioWorkletProcessor {
		/**
		 * @param {Object} options - AudioWorkletProcessor initialization options
		 */
		constructor(options) {
			super(options);
			
			/**
			 * Track if the processor has been disposed
			 * @type {boolean}
			 * @protected
			 */
			this.disposed = false;
			
			/**
			 * Standard block size for audio processing
			 * @type {number}
			 * @protected
			 */
			this.blockSize = 128;
			
			/**
			 * Sample rate from the audio context
			 * @type {number}
			 * @protected
			 */
			this.sampleRate = sampleRate;
			
			// Set up message port listener
			this.port.onmessage = (event) => {
				this._onMessage(event);
			};
			
			console.log('ToneAudioWorkletProcessor initialized');
		}
		
		/**
		 * Handle messages from the main thread
		 * Override this method in subclasses to handle custom messages
		 * 
		 * @protected
		 * @param {MessageEvent} event - Message event from the main thread
		 */
		_onMessage(event) {
			const { type, data } = event.data;
			
			switch (type) {
				case 'dispose':
					this._dispose();
					break;
				default:
					// Override in subclasses to handle custom message types
					break;
			}
		}
		
		/**
		 * Dispose of the processor and mark it for cleanup
		 * @private
		 */
		_dispose() {
			this.disposed = true;
			console.log('ToneAudioWorkletProcessor disposed');
		}
		
		/**
		 * Default process method - override in subclasses
		 * 
		 * @param {Float32Array[][]} inputs - Input audio data
		 * @param {Float32Array[][]} outputs - Output audio buffers to fill
		 * @param {Object.<string, Float32Array>} parameters - AudioWorklet parameters
		 * @returns {boolean} Whether to keep the processor alive
		 */
		process(inputs, outputs, parameters) {
			// Default implementation - pass through first input to first output
			const input = inputs[0];
			const output = outputs[0];
			
			if (input && output && input.length > 0 && output.length > 0) {
				for (let channel = 0; channel < Math.min(input.length, output.length); channel++) {
					output[channel].set(input[channel]);
				}
			}
			
			// Keep processor alive unless disposed
			return !this.disposed;
		}
	}
`;

// Register the base class in the worklet global scope
addBaseClass(toneAudioWorkletProcessor);
