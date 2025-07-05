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
   * Scan patterns for vertex traversal
   */
  const ScanPattern = {
    SEQUENTIAL: 'sequential',
    PING_PONG: 'ping_pong',
    RANDOM: 'random'
  };

  /**
   * XYRGB Interpolator Audio Processor
   * Generates 5-channel audio output: X, Y, R, G, B
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
      this._currentPosition = 0;
      this._direction = 1; // For ping-pong pattern
      this._scanRate = 30; // Hz
      this._interpolationMode = InterpolationMode.LINEAR;
      this._scanPattern = ScanPattern.SEQUENTIAL;
      this._amplitude = 1.0;
      this._smoothing = 0.1; // For smooth transitions
      
      // Interpolation state
      this._lastOutputValues = { x: 0, y: 0, r: 0, g: 0, b: 0 };
      this._targetValues = { x: 0, y: 0, r: 0, g: 0, b: 0 };
      this._samplesPerScan = 0;
      this._sampleCounter = 0;
      
      // Calculate initial scan timing
      this._updateScanTiming();
      
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
            this._currentPosition = 0;
            // console.log('🎵 Updated vertices: \${this._vertices.length} vertices\`);
            break;
            
          case 'scanRate':
            this._scanRate = Math.max(0.1, Math.min(1000, data));
            this._updateScanTiming();
            // console.log(\`🎵 Scan rate: \${this._scanRate}Hz\`);
            break;
            
          case 'interpolationMode':
            this._interpolationMode = data;
            // console.log(\`🎵 Interpolation mode: \${data}\`);
            break;
            
          case 'scanPattern':
            this._scanPattern = data;
            // console.log(\`🎵 Scan pattern: \${data}\`);
            break;
            
          case 'amplitude':
            this._amplitude = Math.max(0, Math.min(2, data));
            // console.log(\`🎵 Amplitude: \${this._amplitude}\`);
            break;
            
          case 'smoothing':
            this._smoothing = Math.max(0, Math.min(1, data));
            // console.log(\`🎵 Smoothing: \${this._smoothing}\`);
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
          name: 'amplitude',
          defaultValue: 1.0,
          minValue: 0,
          maxValue: 2,
        },
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
     * Update scan timing based on scan rate
     * @private
     */
    _updateScanTiming() {
      this._samplesPerScan = Math.max(1, Math.floor(sampleRate / this._scanRate));
    }

    /**
     * Get next vertex position based on scan pattern
     * @private
     * @returns {number} Next vertex index
     */
    _getNextPosition() {
      if (this._vertices.length === 0) return 0;
      
      switch (this._scanPattern) {
        case ScanPattern.PING_PONG:
          this._currentPosition += this._direction;
          if (this._currentPosition >= this._vertices.length - 1) {
            this._direction = -1;
            this._currentPosition = this._vertices.length - 1;
          } else if (this._currentPosition <= 0) {
            this._direction = 1;
            this._currentPosition = 0;
          }
          break;
          
        case ScanPattern.RANDOM:
          this._currentPosition = Math.floor(Math.random() * this._vertices.length);
          break;
          
        case ScanPattern.SEQUENTIAL:
        default:
          this._currentPosition = (this._currentPosition + 1) % this._vertices.length;
          break;
      }
      
      return this._currentPosition;
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
     * @param {number} smoothing - Smoothing factor
     * @returns {Object} Smoothed values
     */
    _applySmoothing(current, target, smoothing) {
      const factor = 1 - smoothing;
      return {
        x: current.x * smoothing + target.x * factor,
        y: current.y * smoothing + target.y * factor,
        r: current.r * smoothing + target.r * factor,
        g: current.g * smoothing + target.g * factor,
        b: current.b * smoothing + target.b * factor,
      };
    }

    /**
     * Process audio samples
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
      const amplitude = parameters.amplitude || this._amplitude;
      const scanRate = parameters.scanRate || this._scanRate;
      const smoothing = parameters.smoothing || this._smoothing;
      
      // Update scan rate if changed
      if (scanRate !== this._scanRate) {
        this._scanRate = scanRate;
        this._updateScanTiming();
      }
      
      // Output channels: X, Y, R, G, B
      const [xChannel, yChannel, rChannel, gChannel, bChannel] = output;
      
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
        
        // Check if we need to advance to next vertex
        this._sampleCounter++;
        if (this._sampleCounter >= this._samplesPerScan) {
          this._sampleCounter = 0;
          
          // Get current and next vertex
          const currentIdx = this._currentPosition;
          const nextIdx = this._getNextPosition();
          
          const currentVertex = this._vertices[currentIdx];
          const nextVertex = this._vertices[nextIdx];
          
          // Calculate interpolation factor for smooth transition
          this._targetValues = this._interpolateVertices(currentVertex, nextVertex, 0);
        }
        
        // Interpolate within current scan period
        const t = this._sampleCounter / this._samplesPerScan;
        const currentIdx = this._currentPosition;
        const nextIdx = (this._currentPosition + 1) % Math.max(1, this._vertices.length);
        
        const currentVertex = this._vertices[currentIdx];
        const nextVertex = this._vertices[nextIdx] || currentVertex;
        
        // Get interpolated values
        const interpolated = this._interpolateVertices(currentVertex, nextVertex, t);
        
        // Apply smoothing
        const smoothingValue = Array.isArray(smoothing) ? smoothing[i] : smoothing;
        this._lastOutputValues = this._applySmoothing(
          this._lastOutputValues,
          interpolated,
          smoothingValue
        );
        
        // Apply amplitude and output
        const amplitudeValue = Array.isArray(amplitude) ? amplitude[i] : amplitude;
        
        xChannel[i] = this._lastOutputValues.x * amplitudeValue;
        yChannel[i] = this._lastOutputValues.y * amplitudeValue;
        rChannel[i] = this._lastOutputValues.r * amplitudeValue;
        gChannel[i] = this._lastOutputValues.g * amplitudeValue;
        bChannel[i] = this._lastOutputValues.b * amplitudeValue;
      }
      
      return true;
    }
  }

  registerProcessor('${workletName}', XYRGBInterpolatorProcessor);
`;
