/**
 * ThreeProcessor - White three generator AudioWorklet processor
 *
 * This processor generates white three using the SingleIOProcessor base class.
 */

import './SingleIOProcessor.worklet';
import { registerProcessor } from '../WorkletGlobalScope';

/**
 * Worklet name for registration
 */
export const workletName = 'three-processor';

/**
 * White three generator processor implementation
 * This code will be executed in the AudioWorklet context
 */
export const threeProcessorWorklet = /* javascript */ `
	/**
	 * Audio processor that implements a white three generator
	 * 
	 * @extends SingleIOProcessor
	 */
	class ThreeProcessor extends SingleIOProcessor {
		/**
		 * @param {Object} options - AudioWorkletProcessor initialization options
		 */
		constructor(options) {
			super(options);
			
			/**
			 * Flag to indicate if three generation is active
			 * @type {boolean}
			 * @private
			 */
			this._isActive = false;
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
		 * Generate white three sample
		 * 
		 * @param {number} _input - Input sample (unused for three generator)
		 * @param {number} _channel - Channel index
		 * @param {Object.<string, number>} params - Parameter values
		 * @returns {number} Generated three sample
		 */
		generate(_input, _channel, params) {
			if (!this._isActive) {
				return 0;
			}
			
			// Generate white three: random values between -1 and 1
			const three = Math.random() * 2 - 1;
			
			// Apply volume control
			const volume = params.volume || 0.5;
			return three * volume;
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
					break;
				case 'stop':
					this._isActive = false;
					break;
				case 'param-update':
					// Handle parameter updates if needed
					break;
			}
		}
	}
`;

// Register the processor in the worklet global scope
registerProcessor(workletName, threeProcessorWorklet);
