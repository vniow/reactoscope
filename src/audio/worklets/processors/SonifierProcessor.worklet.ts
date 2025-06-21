/**
 * SonifierProcessor - Multi-channel vertex data audio generator
 *
 * This processor generates 5-channel audio from vertex data (x, y, r, g, b) using the SingleIOProcessor base class.
 * Reads vertex data from a SharedArrayBuffer and outputs it as multi-channel audio signals.
 */

import './SingleIOProcessor.worklet';
import { registerProcessor } from '../WorkletGlobalScope';

/**
 * Worklet name for registration
 */
export const workletName = 'sonifier-processor';

/**
 * Multi-channel vertex data audio generator processor implementation
 * This code will be executed in the AudioWorklet context
 */
export const sonifierProcessorWorklet = /* javascript */ `
	/**
	 * Audio processor that generates multi-channel audio from vertex data
	 * 
	 * @extends SingleIOProcessor
	 */
	class SonifierProcessor extends SingleIOProcessor {
		/**
		 * @param {Object} options - AudioWorkletProcessor initialization options
		 */
		constructor(options) {
			super(options);
			
			/**
			 * Flag to indicate if vertex sonification is active
			 * @type {boolean}
			 * @private
			 */
			this._isActive = false;
			
			/**
			 * SharedArrayBuffer containing vertex data
			 * @type {SharedArrayBuffer|null}
			 * @private
			 */
			this._sharedBuffer = null;
			
			/**
			 * Float32Array view of the SharedArrayBuffer
			 * @type {Float32Array|null}
			 * @private
			 */
			this._dataView = null;
			
			/**
			 * Current playback position in the vertex buffer
			 * @type {number}
			 * @private
			 */
			this._bufferPosition = 0;
			
			/**
			 * Number of vertices available in the buffer
			 * @type {number}
			 * @private
			 */
			this._vertexCount = 0;
			
			/**
			 * Playback speed multiplier
			 * @type {number}
			 * @private
			 */
			this._playbackSpeed = 1.0;
			
			/**
			 * Interpolation factor for smooth transitions
			 * @type {number}
			 * @private
			 */
			this._interpolationStep = 0.1;
			
			/**
			 * Previous vertex data for interpolation [x, y, r, g, b]
			 * @type {number[]}
			 * @private
			 */
			this._previousVertex = [0, 0, 0, 0, 0];
			
			/**
			 * Current interpolated vertex data [x, y, r, g, b]
			 * @type {number[]}
			 * @private
			 */
			this._currentVertex = [0, 0, 0, 0, 0];
		}
		
		/**
		 * Define the parameters for this processor
		 * @returns {AudioParamDescriptor[]} Parameter descriptors
		 */
		static get parameterDescriptors() {
			return [
				{
					name: 'volume',
					defaultValue: 1,
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
				},
				{
					name: 'interpolationStep',
					defaultValue: 0.1,
					minValue: 0.001,
					maxValue: 1.0,
					automationRate: 'a-rate'
				}
			];
		}
		
		/**
		 * Generate multi-channel audio from vertex data
		 * 
		 * @param {number} _input - Input sample (unused for vertex generator)
		 * @param {number} channel - Channel index (0=x, 1=y, 2=r, 3=g, 4=b)
		 * @param {Object.<string, number>} params - Parameter values
		 * @returns {number} Generated audio sample
		 */
		generate(_input, channel, params) {
			if (!this._isActive || !this._dataView || this._vertexCount === 0) {
				return 0;
			}
			
			// Update playback parameters
			this._playbackSpeed = params.playbackSpeed || 1.0;
			this._interpolationStep = params.interpolationStep || 0.1;
			
			// Read current vertex count from the shared buffer
			this._vertexCount = Math.floor(this._dataView[0]);
			
			if (this._vertexCount === 0) {
				return 0;
			}
			
			// Calculate current buffer position with playback speed
			const advanceRate = this._playbackSpeed / sampleRate * 60; // 60 FPS equivalent
			this._bufferPosition += advanceRate;
			
			// Wrap position when reaching end of buffer
			if (this._bufferPosition >= this._vertexCount) {
				this._bufferPosition = 0;
			}
			
			// Get integer and fractional parts for interpolation
			const currentIndex = Math.floor(this._bufferPosition);
			const nextIndex = (currentIndex + 1) % this._vertexCount;
			const fraction = this._bufferPosition - currentIndex;
			
			// Read current and next vertex data from shared buffer
			// Format: [vertexCount, x1, y1, r1, g1, b1, x2, y2, r2, g2, b2, ...]
			const currentOffset = 1 + currentIndex * 5;
			const nextOffset = 1 + nextIndex * 5;
			
			// Ensure we don't read beyond buffer bounds
			if (nextOffset + 4 >= this._dataView.length) {
				return 0;
			}
			
			// Get current and next vertex values for the requested channel
			const currentValue = this._dataView[currentOffset + channel] || 0;
			const nextValue = this._dataView[nextOffset + channel] || 0;
			
			// Linear interpolation between current and next vertex
			const interpolatedValue = currentValue + (nextValue - currentValue) * fraction;
			
			// Apply smooth interpolation for temporal continuity
			this._currentVertex[channel] += (interpolatedValue - this._currentVertex[channel]) * this._interpolationStep;
			
			// Apply volume and ensure output is within valid range
			const volume = params.volume || 0.5;
			const output = this._currentVertex[channel] * volume;
			
			// Clamp output to prevent clipping
			return Math.max(-1, Math.min(1, output));
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
					this._bufferPosition = 0;
					// Reset interpolation state
					this._currentVertex = [0, 0, 0, 0, 0];
					this._previousVertex = [0, 0, 0, 0, 0];
					break;
					
				case 'stop':
					this._isActive = false;
					break;
					
				case 'sab':
					// Receive SharedArrayBuffer from main thread
					this._sharedBuffer = data;
					if (this._sharedBuffer) {
						this._dataView = new Float32Array(this._sharedBuffer);
					}
					break;
					
				case 'set-position':
					// Allow external control of buffer position
					this._bufferPosition = Math.max(0, Math.min(data || 0, this._vertexCount - 1));
					break;
					
				case 'param-update':
					// Handle parameter updates if needed
					if (data.playbackSpeed !== undefined) {
						this._playbackSpeed = data.playbackSpeed;
					}
					if (data.interpolationStep !== undefined) {
						this._interpolationStep = data.interpolationStep;
					}
					break;
			}
		}
	}
`;

// Register the processor in the global scope
registerProcessor(workletName, sonifierProcessorWorklet);
