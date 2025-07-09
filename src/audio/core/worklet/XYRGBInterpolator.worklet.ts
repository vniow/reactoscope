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
   * XYRGB Interpolator Audio Processor (no interpolation)
   * Outputs the current vertex's values directly, no interpolation.
   */
  class XYRGBInterpolatorProcessor extends AudioWorkletProcessor {
    constructor(options) {
      super(options);
      // Processor state
      this._isActive = false;
      this._vertices = [];
      this._index = 0; // Single index like XYscope
      this._frequency = 30; // Hz
  // No smoothing, no interpolation
      console.log('🎵 XYRGB Interpolator processor initialized (no interpolation)');
      // Message handling
      this.port.onmessage = (event) => {
        const { type, data } = event.data;
        switch (type) {
          case 'start':
            this._isActive = true;
            break;
          case 'stop':
            this._isActive = false;
            break;
          case 'vertices':
            this._vertices = data || [];
            this._index = 0;
            break;
          case 'scanRate':
            this._frequency = Math.max(0.1, Math.min(1000, data));
            break;
      // No smoothing
        }
      };
    }

    static get parameterDescriptors() {
      return [
        {
          name: 'scanRate',
          defaultValue: 30,
          minValue: 0.1,
          maxValue: 1000,
        },
      ];
        // Removed smoothing parameter
      ];
    }



    process(inputs, outputs, parameters) {
      const output = outputs[0];
      if (!output || output.length < 5) {
        return true;
      }
      const frameCount = output[0].length;
      const frequency = parameters.scanRate || this._frequency;
      if (frequency !== this._frequency) {
        this._frequency = frequency;
      }
      const [xChannel, yChannel, rChannel, gChannel, bChannel] = output;
      const indexIncrement = frequency / sampleRate;
      for (let i = 0; i < frameCount; i++) {
        if (!this._isActive || this._vertices.length === 0) {
          xChannel[i] = 0;
          yChannel[i] = 0;
          rChannel[i] = 0;
          gChannel[i] = 0;
          bChannel[i] = 0;
          continue;
        }
        // Get current vertex index (no interpolation, no smoothing)
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
        // Output raw values from vertex
        xChannel[i] = currentVertex.screen.x;
        yChannel[i] = currentVertex.screen.y;
        rChannel[i] = (currentVertex.color.r * 2) - 1;
        gChannel[i] = (currentVertex.color.g * 2) - 1;
        bChannel[i] = (currentVertex.color.b * 2) - 1;
        // Increment index
        this._index += indexIncrement;
        if (this._index >= 1) {
          this._index = this._index % 1;
        }
      }
      return true;
    }
  }

  registerProcessor('${workletName}', XYRGBInterpolatorProcessor);
`;
