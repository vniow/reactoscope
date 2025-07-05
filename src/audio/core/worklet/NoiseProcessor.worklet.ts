/**
 * Simple white noise generator worklet processor
 */

/**
 * name of worklet
 */
export const workletName = 'noise-processor';

/**
 * simple white noise generator code
 */
export const noiseProcessorWorklet = /* javascript */ `
  /**
   * audio processor that implements a white noise generator
   */
  class NoiseProcessor extends AudioWorkletProcessor {
    /**
     * @param {Object} options - AudioWorkletProcessor init options
     */
    constructor(options) {
      super(options);
      
      /**
       * flag to indicate if noise generation is active
       * @type {boolean}
       * @private
       */
      this._isActive = false;
      
      /**
       * amplitude control parameter
       * @type {number}
       * @private
       */
      this._amplitude = 0.5;
      
      console.log('white noise processor initialized');
      
      // listen for messages from main thread
      this.port.onmessage = (event) => {
        if (event.data.type === 'start') {
          this._isActive = true;
          console.log('white noise generation started');
        } else if (event.data.type === 'stop') {
          this._isActive = false;
          console.log('white noise generation stopped');
        } else if (event.data.type === 'amplitude') {
          this._amplitude = Math.max(0, Math.min(1, event.data.value));
          console.log('white noise amplitude set to:', this._amplitude);
        }
      };
    }

    /**
     * define the parameters for this processor
     * @returns {AudioParamDescriptor[]} Parameter descriptors
     */
    static get parameterDescriptors() {
      return [
        {
          name: 'amplitude',
          defaultValue: 0.5,
          minValue: 0,
          maxValue: 1,
        }
      ];
    }

    /**
     * process audio samples
     * @param {Float32Array[][]} inputs - input audio data
     * @param {Float32Array[][]} outputs - output audio data  
     * @param {Record<string, Float32Array>} parameters - parameter values
     * @returns {boolean} true to keep processor alive
     */
    process(inputs, outputs, parameters) {
      const output = outputs[0];
      
      if (output.length === 0) return true;
      
      const frameCount = output[0].length;
      const amplitude = parameters.amplitude || this._amplitude;
      
      // process each channel
      for (let channel = 0; channel < output.length; channel++) {
        const outputChannel = output[channel];
        
        for (let i = 0; i < frameCount; i++) {
          if (this._isActive) {
            // generate white noise: random values between -1 and 1, scaled by amplitude
            const amplitudeValue = amplitude.length > 1 ? amplitude[i] : amplitude[0];
            outputChannel[i] = (Math.random() * 2 - 1) * amplitudeValue;
          } else {
            outputChannel[i] = 0;
          }
        }
      }
      
      return true;
    }
  }

  registerProcessor('${workletName}', NoiseProcessor);
`;
