/**
 * Base processor class for Reactoscope worklets
 *
 * Features:
 * - Message handling for parameter updates
 * - Debug logging support
 * - Lifecycle management
 * - Performance monitoring hooks
 */

import { addBaseClass } from '../WorkletRegistry.ts';

const reactoscopeWorkletProcessor = /* javascript */ `
/**
 * Base processor class for all Reactoscope AudioWorklets
 * 
 * @extends AudioWorkletProcessor
 */
class ReactoscopeWorkletProcessor extends AudioWorkletProcessor {
	/**
	 * @param {AudioWorkletNodeOptions} options - AudioWorkletProcessor initialization options
	 */
	constructor(options) {
		super(options);
		
		/**
		 * Flag to track if processor has been disposed
		 * @type {boolean}
		 */
		this.disposed = false;
		
		/**
		 * Debug mode flag - enables performance monitoring and logging
		 * @type {boolean}
		 */
		this.debug = options.processorOptions?.debug || false;
		
		/**
		 * Size of processing blocks from the audio context
		 * @type {number}
		 * @readonly
		 */
		this.blockSize = 128;
		
		/**
		 * Sample rate from the audio context
		 * @type {number}
		 * @readonly
		 */
		this.sampleRate = sampleRate;
		
		/**
		 * Block counter for performance monitoring
		 * @type {number}
		 * @private
		 */
		this.blockCount = 0;
		
		/**
		 * Performance monitoring data
		 * @type {Object}
		 * @private
		 */
		this.performance = {
			processTime: 0,
			maxProcessTime: 0,
			avgProcessTime: 0
		};
		
		// Set up message handling from main thread
		this.port.onmessage = (event) => {
			if (event.data === "dispose") {
				this.disposed = true;
				this.log("Processor disposed via message");
			} else if (event.data?.type === "setDebug") {
				this.debug = event.data.value;
				this.log(\`Debug mode \${this.debug ? 'enabled' : 'disabled'}\`);
			} else {
				// Handle other message types in subclasses
				this._onMessage(event);
			}
		};
		
		this.log("ReactoscopeWorkletProcessor initialized");
	}
	
	/**
	 * Handle messages from the main thread
	 * Override in subclasses to handle custom messages
	 * 
	 * @protected
	 * @param {MessageEvent} event - the message event from the main thread
	 */
	_onMessage(event) {
		// Default implementation - override in subclasses
		this.log("Unhandled message:", event.data);
	}
	
	/**
	 * Called when a parameter value changes
	 * Override in subclasses for parameter-specific logic
	 * 
	 * @protected
	 * @param {string} name - parameter name
	 * @param {number} value - new parameter value
	 */
	onParameterChange(name, value) {
		// Default implementation - override in subclasses
		if (this.debug) {
			this.log(\`Parameter \${name} changed to \${value}\`);
		}
	}
	
	/**
	 * Debug logging helper
	 * Only logs when debug mode is enabled
	 * 
	 * @protected
	 * @param {string} message - log message
	 * @param {...any} args - additional arguments
	 */
	log(message, ...args) {
		if (this.debug) {
			console.log(\`[ReactoscopeWorklet] \${message}\`, ...args);
		}
	}
	
	/**
	 * Monitor processing performance
	 * Call at the beginning and end of process() method
	 * 
	 * @protected
	 * @param {boolean} start - true to start timing, false to end
	 * @returns {number|undefined} - processing time in ms (when start=false)
	 */
	monitorPerformance(start) {
		if (!this.debug) return;
		
		if (start) {
			this.performance.startTime = performance.now();
		} else {
			const processTime = performance.now() - this.performance.startTime;
			this.performance.processTime = processTime;
			this.performance.maxProcessTime = Math.max(this.performance.maxProcessTime, processTime);
			
			// Calculate rolling average
			this.performance.avgProcessTime = (this.performance.avgProcessTime * 0.99) + (processTime * 0.01);
			
			// Report performance every 1000 blocks (~23ms at 44.1kHz)
			if (this.blockCount % 1000 === 0) {
				this.port.postMessage({
					type: 'performance',
					data: {
						avgTime: this.performance.avgProcessTime,
						maxTime: this.performance.maxProcessTime,
						lastTime: processTime,
						blockCount: this.blockCount
					}
				});
			}
			
			return processTime;
		}
	}
	
	/**
	 * Base process method - handles performance monitoring
	 * Override in subclasses but call super.process() for monitoring
	 * 
	 * @param {Float32Array[][]} inputs - input audio data
	 * @param {Float32Array[][]} outputs - output audio buffers to fill
	 * @param {Object.<string, Float32Array>} parameters - AudioWorklet parameters
	 * @returns {boolean} - true to keep processor alive
	 */
	process(inputs, outputs, parameters) {
		this.monitorPerformance(true);
		this.blockCount++;
		
		// Default pass-through implementation
		const input = inputs[0];
		const output = outputs[0];
		
		if (input && output) {
			for (let channel = 0; channel < Math.min(input.length, output.length); channel++) {
				output[channel].set(input[channel]);
			}
		}
		
		this.monitorPerformance(false);
		return !this.disposed;
	}
}
`;

// Add the processor base class to the worklet global scope
addBaseClass(reactoscopeWorkletProcessor);
