/**
 * XYRGB Interpolator AudioWorklet Processor
 *
 * Interpolates between discrete vertex data to generate continuous X, Y, R, G, B audio signals.
 * Uses configurable interpolation methods and scan patterns.
 */

/**
 * Name of the worklet processor
 */
export const workletName = 'xyrgb-interpolator';

/**
 * XYRGB Interpolator worklet processor code
 */
export const xyrgbInterpolatorWorklet = /* javascript */ `
  /**
   * Interpolation modes for vertex data
   */
  const InterpolationMode = {
    LINEAR: 'linear',
    CUBIC: 'cubic',
    CIRCULAR: 'circular'
  };

  /**
   * XYRGB Interpolator Audio Processor
   * Generates 5-channel audio output: X, Y, R, G, B
   * Simplified to use sequential traversal like XYscope.js
   */
  class XYRGBInterpolatorProcessor extends AudioWorkletProcessor {
    /**
     * @param {Object} options - AudioWorkletProcessor init options
     */
    constructor(options) {
      super(options);
      
      // Processor state
      this._isActive = false;
      this._vertices = [];
      this._index = 0; // Single index like XYscope
      this._frequency = 30; // Hz - like XYscope's frequency
      this._interpolationMode = InterpolationMode.LINEAR;
      this._smoothing = 0.1; // For smooth transitions
      
      // Interpolation state
      this._lastOutputValues = { x: 0, y: 0, r: 0, g: 0, b: 0 };
      
      console.log('🎵 XYRGB Interpolator processor initialized');
      
      // Message handling
      this.port.onmessage = (event) => {
        const { type, data } = event.data;
        
        switch (type) {
          case 'start':
            this._isActive = true;
            console.log('🎵 XYRGB interpolation started');
            break;
            
          case 'stop':
            this._isActive = false;
            console.log('🎵 XYRGB interpolation stopped');
            break;
            
          case 'vertices':
            this._vertices = data || [];
            this._index = 0;
            break;
            
          case 'scanRate':
            this._frequency = Math.max(0.1, Math.min(1000, data));
            break;
            
          case 'interpolationMode':
            this._interpolationMode = data;
            break;
            
          case 'smoothing':
            this._smoothing = Math.max(0, Math.min(1, data));
            break;
        }
      };
    }

    /**
     * Parameter descriptors for automation
     * @returns {AudioParamDescriptor[]}
     */
    static get parameterDescriptors() {
      return [
        {
          name: 'scanRate',
          defaultValue: 30,
          minValue: 0.1,
          maxValue: 1000,
        },
        {
          name: 'smoothing',
          defaultValue: 0.1,
          minValue: 0,
          maxValue: 1,
        }
      ];
    }

    /**
     * Get interpolated values between two vertices
     * @private
     * @param {Object} v1 - First vertex
     * @param {Object} v2 - Second vertex
     * @param {number} t - Interpolation factor (0-1)
     * @returns {Object} Interpolated values
     */
    _interpolateVertices(v1, v2, t) {
      if (!v1 || !v2) {
        return { x: 0, y: 0, r: 0, g: 0, b: 0 };
      }
      
      let interpolatedT = t;
      
      // Apply interpolation curve
      switch (this._interpolationMode) {
        case InterpolationMode.CUBIC:
          interpolatedT = t * t * (3 - 2 * t); // Smooth step
          break;
          
        case InterpolationMode.CIRCULAR:
          interpolatedT = Math.sin(t * Math.PI * 0.5); // Sine curve
          break;
          
        case InterpolationMode.LINEAR:
        default:
          // Keep linear interpolation
          break;
      }
      
      return {
        x: v1.screen.x + (v2.screen.x - v1.screen.x) * interpolatedT,
        y: v1.screen.y + (v2.screen.y - v1.screen.y) * interpolatedT,
        r: v1.color.r + (v2.color.r - v1.color.r) * interpolatedT,
        g: v1.color.g + (v2.color.g - v1.color.g) * interpolatedT,
        b: v1.color.b + (v2.color.b - v1.color.b) * interpolatedT,
      };
    }

    /**
     * Apply smoothing to output values
     * @private
     * @param {Object} current - Current values
     * @param {Object} target - Target values
     * @param {number} smoothing - Smoothing factor (0 = no smoothing, 1 = maximum smoothing)
     * @returns {Object} Smoothed values
     */
    _applySmoothing(current, target, smoothing) {
      // Clamp smoothing to prevent numerical issues
      const clampedSmoothing = Math.max(0, Math.min(0.99, smoothing));
      
      // Use exponential smoothing with better scaling
      // At high smoothing values, still allow some target influence
      const alpha = 1 - clampedSmoothing;
      
      return {
        x: current.x + alpha * (target.x - current.x),
        y: current.y + alpha * (target.y - current.y),
        r: current.r + alpha * (target.r - current.r),
        g: current.g + alpha * (target.g - current.g),
        b: current.b + alpha * (target.b - current.b),
      };
    }

    /**
     * Process audio samples - simplified XYscope-style approach
     * @param {Float32Array[][]} inputs - Input audio data
     * @param {Float32Array[][]} outputs - Output audio data (5 channels: X, Y, R, G, B)
     * @param {Record<string, Float32Array>} parameters - Parameter values
     * @returns {boolean} true to keep processor alive
     */
    process(inputs, outputs, parameters) {
      const output = outputs[0];
      
      if (!output || output.length < 5) {
        console.warn('🎵 XYRGB Interpolator requires 5 output channels');
        return true;
      }
      
      const frameCount = output[0].length;
      const frequency = parameters.scanRate || this._frequency;
      const smoothing = parameters.smoothing || this._smoothing;
      
      // Update internal frequency if parameter changed
      if (frequency !== this._frequency) {
        this._frequency = frequency;
      }
      
      // Update internal smoothing if parameter changed
      if (smoothing !== this._smoothing) {
        this._smoothing = smoothing;
      }
      
      // Output channels: X, Y, R, G, B
      const [xChannel, yChannel, rChannel, gChannel, bChannel] = output;
      
      // Calculate index increment like XYscope
      const indexIncrement = frequency / sampleRate;
      
      for (let i = 0; i < frameCount; i++) {
        if (!this._isActive || this._vertices.length === 0) {
          // Output silence
          xChannel[i] = 0;
          yChannel[i] = 0;
          rChannel[i] = 0;
          gChannel[i] = 0;
          bChannel[i] = 0;
          continue;
        }
        
        // Get current vertex index (like XYscope)
        const vertexIndex = Math.floor(this._index * this._vertices.length) % this._vertices.length;
        const currentVertex = this._vertices[vertexIndex];
        
        if (!currentVertex) {
          xChannel[i] = 0;
          yChannel[i] = 0;
          rChannel[i] = 0;
          gChannel[i] = 0;
          bChannel[i] = 0;
          continue;
        }
        
        // Get raw values from vertex
        const rawValues = {
          x: currentVertex.screen.x,
          y: currentVertex.screen.y,
          // Convert RGB from [0,1] to [-1,1] range for audio compatibility
          r: (currentVertex.color.r * 2) - 1,
          g: (currentVertex.color.g * 2) - 1,
          b: (currentVertex.color.b * 2) - 1,
        };
        
        // Apply smoothing
        const smoothingValue = Array.isArray(smoothing) ? smoothing[i] : smoothing;
        this._lastOutputValues = this._applySmoothing(
          this._lastOutputValues,
          rawValues,
          smoothingValue
        );
        
        // Debug: Check for NaN or extreme values that could break the connection
        if (isNaN(this._lastOutputValues.x) || isNaN(this._lastOutputValues.y) || 
            isNaN(this._lastOutputValues.r) || isNaN(this._lastOutputValues.g) || 
            isNaN(this._lastOutputValues.b)) {
          // Reset to safe values if we get NaN
          this._lastOutputValues = { x: 0, y: 0, r: 0, g: 0, b: 0 };
        }
        
        // Output final values
        xChannel[i] = this._lastOutputValues.x;
        yChannel[i] = this._lastOutputValues.y;
        rChannel[i] = this._lastOutputValues.r;
        gChannel[i] = this._lastOutputValues.g;
        bChannel[i] = this._lastOutputValues.b;
        
        // Increment index like XYscope
        this._index += indexIncrement;
        
        // Keep index in bounds
        if (this._index >= 1) {
          this._index = this._index % 1;
        }
      }
      
      return true;
    }
  }

  registerProcessor('${workletName}', XYRGBInterpolatorProcessor);
`;
