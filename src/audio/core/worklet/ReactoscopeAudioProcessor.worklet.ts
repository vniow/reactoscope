/**
 * Name of the worklet processor
 */
export const workletName = 'reactoscope-processor';

/**
 * XYRGB Interpolator worklet processor code
 */

export const reactoscopeProcessorWorklet = /* javascript */ `
  /**
   * Reactoscope Audio Processor (no interpolation)
   * Outputs the current vertex's values directly, no interpolation.
   */
  class ReactoscopeProcessor extends AudioWorkletProcessor {
    constructor(options) {
      super(options);
      // Processor state
      this._isActive = false;
      this._vertices = [];
      this._index = 0; // Single index for vertex selection
      this._frequency = 60; // Hz
      
      console.log('🎵 Reactoscope processor initialized (no interpolation)');
      
      // Message handling
      this.port.onmessage = (event) => {
        const { type, data } = event.data;
        switch (type) {
          case 'start':
            this._isActive = true;
            console.log('🎵 Reactoscope processor started');
            break;
          case 'stop':
            this._isActive = false;
            console.log('🎵 Reactoscope processor stopped');
            break;
          case 'vertices':
            this._vertices = data || [];
            this._index = 0;
            break;
          case 'scanRate':
            this._frequency = Math.max(0.1, Math.min(1000, data));
            break;
        }
      };
    }

    static get parameterDescriptors() {
      return [
        {
          name: 'scanRate',
          defaultValue: 60,
          minValue: 0.1,
          maxValue: 1000,
        },
      ];
    }

    process(inputs, outputs, parameters) {
      const output = outputs[0];
      if (!output || output.length < 6) {
        return true;
      }
      const frameCount = output[0].length;
      const frequency = parameters.scanRate || this._frequency;
      if (frequency !== this._frequency) {
        this._frequency = frequency;
      }
      const [xChannel, yChannel, rChannel, gChannel, bChannel, zChannel] = output;
      const indexIncrement = frequency / sampleRate;
      
      for (let i = 0; i < frameCount; i++) {
        // Always output silence when not active, regardless of vertex data
        if (!this._isActive || this._vertices.length === 0) {
          xChannel[i] = 0;
          yChannel[i] = 0;
          rChannel[i] = 0;
          gChannel[i] = 0;
          bChannel[i] = 0;
          zChannel[i] = 0;
          continue;
        }
        
        // Get current vertex index (no interpolation)
        const vertexIndex = Math.floor(this._index * this._vertices.length) % this._vertices.length;
        const currentVertex = this._vertices[vertexIndex];
        if (!currentVertex) {
          xChannel[i] = 0;
          yChannel[i] = 0;
          rChannel[i] = 0;
          gChannel[i] = 0;
          bChannel[i] = 0;
          zChannel[i] = 0;
          continue;
        }
        
        // Output raw values from vertex (no interpolation)
        xChannel[i] = currentVertex.screen.x;
        yChannel[i] = currentVertex.screen.y;
        rChannel[i] = (currentVertex.color.r * 2) - 1; // Convert 0-1 to -1-1
        gChannel[i] = (currentVertex.color.g * 2) - 1;
        bChannel[i] = (currentVertex.color.b * 2) - 1;
        zChannel[i] = 1 - currentVertex.screen.z; // Added zChannel: 0=max luminance, 1=no luminance
        
        // Increment index
        this._index += indexIncrement;
        if (this._index >= 1) {
          this._index = this._index % 1;
        }
      }
      return true;
    }
  }

  registerProcessor('${workletName}', ReactoscopeProcessor);
`;
