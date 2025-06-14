/**
 * NoiseProcessor - White noise generator AudioWorklet processor
 *
 * This processor generates white noise using the SingleIOProcessor base class.
 */

import './SingleIOProcessor.worklet';
import { registerProcessor } from '../WorkletGlobalScope';

/**
 * Worklet name for registration
 */
export const workletName = 'noise-processor';

/**
 * White noise generator processor implementation
 * This code will be executed in the AudioWorklet context
 */
export const noiseProcessorWorklet = /* javascript */ `
	/**
	 * Audio processor that implements a white noise generator
	 * 
	 * @extends SingleIOProcessor
	 */
	class NoiseProcessor extends SingleIOProcessor {
		/**
		 * @param {Object} options - AudioWorkletProcessor initialization options
		 */
		constructor(options) {
			super(options);
			
			/**
			 * Flag to indicate if noise generation is active
			 * @type {boolean}
			 * @private
			 */
			this._isActive = false;
			
			console.log('NoiseProcessor initialized');
		}
		
		/**
		 * Define the parameters for this processor
		 * @returns {AudioParamDescriptor[]} Parameter descriptors
		 */
		static get parameterDescriptors() {
			return [
				{
					name: 'volume',
					defaultValue: 0.5,
					minValue: 0.0,
					maxValue: 1.0,
					automationRate: 'a-rate'
				}
			];
		}
		
		/**
		 * Generate white noise sample
		 * 
		 * @param {number} _input - Input sample (unused for noise generator)
		 * @param {number} _channel - Channel index
		 * @param {Object.<string, number>} params - Parameter values
		 * @returns {number} Generated noise sample
		 */
		generate(_input, _channel, params) {
			if (!this._isActive) {
				return 0;
			}
			
			// Generate white noise: random values between -1 and 1
			const noise = Math.random() * 2 - 1;
			
			// Apply volume control
			const volume = params.volume || 0.5;
			return noise * volume;
		}
		
		/**
		 * Handle messages from the main thread
		 * 
		 * @protected
		 * @param {MessageEvent} event - Message event from the main thread
		 */
		_onMessage(event) {
			super._onMessage(event);
			
			const { type, data } = event.data;
			
			switch (type) {
				case 'start':
					this._isActive = true;
					console.log('Noise generation started');
					break;
				case 'stop':
					this._isActive = false;
					console.log('Noise generation stopped');
					break;
				case 'param-update':
					// Handle parameter updates if needed
					if (data) {
						console.log('Noise processor parameter update:', data);
					}
					break;
			}
		}
	}
`;

// Register the processor in the worklet global scope
registerProcessor(workletName, noiseProcessorWorklet);
