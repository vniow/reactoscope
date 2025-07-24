/**
 * SixChannelNoiseProcessor.worklet.ts
 *
 * AudioWorkletProcessor that generates white noise into 6 channels based on active toggles.
 */

/** name of worklet */
export const workletName = 'six-channel-noise-processor';

/** processor code */
export const sixChannelNoiseProcessorWorklet = /* javascript */ `
class SixChannelNoiseProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super(options);
    this._isActive = false;
    this._amplitude = 0.5;
    // all channels enabled by default
    this._activeChannels = [true, true, true, true, true, true];

    this.port.onmessage = (event) => {
      const data = event.data;
      if (data.type === 'start') {
        this._isActive = true;
      } else if (data.type === 'stop') {
        this._isActive = false;
      } else if (data.type === 'amplitude') {
        this._amplitude = Math.max(0, Math.min(1, data.value));
      } else if (data.type === 'setChannels') {
        if (Array.isArray(data.channels) && data.channels.length === 6) {
          this._activeChannels = data.channels.map(v => !!v);
        }
      }
    };
  }

  static get parameterDescriptors() {
    return [{ name: 'amplitude', defaultValue: 0.5, minValue: 0, maxValue: 1 }];
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    if (output.length < 6) return true;
    const frameCount = output[0].length;
    const amplitudes = parameters.amplitude || []; // might be mono or per-frame

    for (let ch = 0; ch < 6; ch++) {
      const channelActive = this._isActive && this._activeChannels[ch];
      const channelOutput = output[ch];
      for (let i = 0; i < frameCount; i++) {
        if (channelActive) {
          const amp = amplitudes.length > 1 ? amplitudes[i] : (amplitudes[0] ?? this._amplitude);
          channelOutput[i] = (Math.random() * 2 - 1) * amp;
        } else {
          channelOutput[i] = 0;
        }
      }
    }

    return true;
  }
}

  registerProcessor('six-channel-noise-processor', SixChannelNoiseProcessor);
`;
