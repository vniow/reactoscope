import * as Tone from 'tone';

export interface ToneAudioWorkletOptions extends Tone.ToneAudioNodeOptions {
  workletName: string;
  workletUrl: string;
  numberOfInputs?: number;
  numberOfOutputs?: number;
  workletOptions?: AudioWorkletNodeOptions;
}

export class ToneAudioWorklet<
  O extends ToneAudioWorkletOptions,
> extends Tone.ToneAudioNode<O> {
  readonly name: string = 'ToneAudioWorklet';
  readonly input: Tone.InputNode;
  readonly output: Tone.OutputNode;

  protected _worklet: AudioWorkletNode;
  readonly options: O;

  constructor(options: O) {
    super(options);
    this.options = options;

    // Get the raw audio context from Tone.js context
    // Cast to access the underlying AudioContext
    const toneContext = Tone.getContext() as Tone.Context & { 
      rawContext?: AudioContext; 
      _context?: AudioContext; 
    };
    
    const audioContext = toneContext.rawContext || toneContext._context;

    if (!audioContext) {
      throw new Error('Unable to access underlying AudioContext from Tone.js');
    }

    this._worklet = new AudioWorkletNode(
      audioContext,
      options.workletName,
      {
        numberOfInputs: options.numberOfInputs ?? 1,
        numberOfOutputs: options.numberOfOutputs ?? 1,
        ...options.workletOptions,
      },
    );

    this.input = this._worklet;
    this.output = this._worklet;
  }

  static async addModule(context: Tone.Context, url: string): Promise<void> {
    await context.addAudioWorkletModule(url);
  }

  dispose(): this {
    super.dispose();
    this._worklet.disconnect();
    // @ts-expect-error - setting to null
    this._worklet = null;
    return this;
  }
}
