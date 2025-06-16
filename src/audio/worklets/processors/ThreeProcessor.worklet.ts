/**
 * ThreeProcessor - Coordinate-based stereo audio generator
 *
 * This processor generates stereo audio from triangle coordinate data using the SingleIOProcessor base class.
 * Left channel uses X coordinates, right channel uses Y coordinates for spatial audio effects.
 */

import './SingleIOProcessor.worklet';
import { registerProcessor } from '../WorkletGlobalScope';

/**
 * Worklet name for registration
 */
export const workletName = 'three-processor';

/**
 * Coordinate-based stereo audio generator processor implementation
 * This code will be executed in the AudioWorklet context
 */
export const threeProcessorWorklet = /* javascript */ `
	/**
	 * Audio processor that generates stereo audio from triangle coordinates
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
			 * Flag to indicate if coordinate playback is active
			 * @type {boolean}
			 * @private
			 */
			this._isActive = false;
			
			/**
			 * Buffer containing coordinate data [x1, y1, x2, y2, ...]
			 * @type {Float32Array}
			 * @private
			 */
			this._coordinateBuffer = new Float32Array(0);
			
			/**
			 * Current playback position in the coordinate buffer
			 * @type {number}
			 * @private
			 */
			this._bufferPosition = 0;
			
			/**
			 * Playback speed multiplier for coordinate traversal
			 * @type {number}
			 * @private
			 */
			this._playbackSpeed = 1.0;
			
			/**
			 * Interpolation factor for smooth coordinate transitions
			 * @type {number}
			 * @private
			 */
			this._interpolationFactor = 0.0;
			
			console.log('🎵 ThreeProcessor initialized for coordinate-based stereo audio');
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
				},
				{
					name: 'playbackSpeed',
					defaultValue: 1.0,
					minValue: 0.1,
					maxValue: 4.0,
					automationRate: 'a-rate'
				}
			];
		}
		
		/**
		 * Generate stereo audio from coordinate data
		 * 
		 * @param {number} _input - Input sample (unused for coordinate generator)
		 * @param {number} channel - Channel index (0 = left/X, 1 = right/Y)
		 * @param {Object.<string, number>} params - Parameter values
		 * @returns {number} Generated audio sample
		 */
		generate(_input, channel, params) {
			if (!this._isActive || this._coordinateBuffer.length === 0) {
				return 0;
			}
			
			const volume = params.volume || 0.5;
			const playbackSpeed = params.playbackSpeed || 1.0;
			
			// Update playback position
			this._interpolationFactor += playbackSpeed * 0.001; // Adjust speed factor as needed
			
			if (this._interpolationFactor >= 1.0) {
				this._bufferPosition += 2; // Move to next coordinate pair (x, y)
				this._interpolationFactor = 0.0;
				
				// Loop back to start if we've reached the end
				if (this._bufferPosition >= this._coordinateBuffer.length) {
					this._bufferPosition = 0;
				}
			}
			
			// Get current and next coordinate pairs for interpolation
			const currentIndex = this._bufferPosition;
			const nextIndex = (currentIndex + 2) % this._coordinateBuffer.length;
			
			// Interpolate between current and next coordinates
			const t = this._interpolationFactor;
			let sample = 0;
			
			if (channel === 0) {
				// Left channel: use X coordinates
				const currentX = this._coordinateBuffer[currentIndex];
				const nextX = this._coordinateBuffer[nextIndex];
				sample = currentX + (nextX - currentX) * t;
			} else {
				// Right channel: use Y coordinates
				const currentY = this._coordinateBuffer[currentIndex + 1];
				const nextY = this._coordinateBuffer[nextIndex + 1];
				sample = currentY + (nextY - currentY) * t;
			}
			
			// Apply volume and ensure sample is in valid range
			return Math.max(-1, Math.min(1, sample * volume));
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
				case 'coordinate-data':
					// Receive coordinate buffer from main thread
					if (data && data.coordinates && Array.isArray(data.coordinates)) {
						// Convert coordinates to interleaved format [x1, y1, x2, y2, ...]
						const flatCoords = [];
						for (const coord of data.coordinates) {
							flatCoords.push(coord.x, coord.y);
						}
						this._coordinateBuffer = new Float32Array(flatCoords);
						console.log('📊 Received coordinate buffer:', this._coordinateBuffer.length / 2, 'points');
					}
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
