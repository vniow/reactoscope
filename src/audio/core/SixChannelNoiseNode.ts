/**
 * SixChannelNoiseNode - White noise generator with six toggleable outputs
 */
import * as Tone from 'tone';
import {
	sixChannelNoiseProcessorWorklet,
	workletName as sixWorkletName,
} from './worklet/SixChannelNoiseProcessor.worklet';
import { ensureWorkletModule } from '../utils/workletRegistry';

export interface SixChannelNoiseNodeOptions {
	amplitude?: number;
	autostart?: boolean;
	debug?: boolean;
}

export class SixChannelNoiseNode {
	readonly name = 'SixChannelNoiseNode';
	private _workletNode: AudioWorkletNode | null = null;
	private _splitter: ChannelSplitterNode | null = null;
	readonly outputs: Tone.Gain[] = [];
	private _isPlaying = false;
	private _amplitude = 0.5;
	private _isReady = false;
	private _readyPromise: Promise<void>;
	private _resolveReady!: () => void;
	private _debug: boolean;


		constructor(options: SixChannelNoiseNodeOptions = {}) {
			this._amplitude = options.amplitude ?? 0.5;
			this._debug = options.debug ?? false;

			// prepare output gains
			for (let i = 0; i < 6; i++) {
				this.outputs[i] = new Tone.Gain({
					context: Tone.getContext(),
					gain: 1,
				});
			}

			// ready promise
			this._readyPromise = new Promise((res) => {
				this._resolveReady = res;
			});

			this._initializeWorklet();

			if (options.autostart) {
				this._readyPromise.then(() => this.start());
			}
		}

	private async _initializeWorklet(): Promise<void> {
				try {
					const ctx = Tone.getContext().rawContext as AudioContext;
					const blob = new Blob([sixChannelNoiseProcessorWorklet], { type: 'text/javascript' });
					const url = URL.createObjectURL(blob);
					try {
						await ensureWorkletModule(ctx, sixWorkletName, url);
					} finally {
						URL.revokeObjectURL(url);
					}

					this._workletNode = Tone.getContext().createAudioWorkletNode(
						sixWorkletName,
						{
							numberOfInputs: 0,
							numberOfOutputs: 1,
							outputChannelCount: [6],
							parameterData: { amplitude: this._amplitude },
						}
					);

					// splitter channels to gains
					this._splitter = ctx.createChannelSplitter(6);
					if (this._splitter) {
						this._workletNode.connect(this._splitter);
						for (let ch = 0; ch < 6; ch++) {
							this._splitter.connect(this.outputs[ch].input, ch, 0);
						}
					}

					this._isReady = true;
					this._resolveReady();

					if (this._debug) {
						console.log('✅ SixChannelNoiseNode ready');
					}
				} catch (err) {
					console.error('❌ Failed to init SixChannelNoiseNode', err);
					throw err;
				}
	}

	async start(): Promise<this> {
		if (this._workletNode && this._isReady && !this._isPlaying) {
			this._workletNode.port.postMessage({ type: 'start' });
			this._isPlaying = true;
			if (this._debug) console.log('▶️ SixChannelNoiseNode started');
		}
		return this;
	}

	stop(): this {
		if (this._workletNode && this._isReady && this._isPlaying) {
			this._workletNode.port.postMessage({ type: 'stop' });
			this._isPlaying = false;
			if (this._debug) console.log('⏹️ SixChannelNoiseNode stopped');
		}
		return this;
	}

	setAmplitude(val: number): this {
		this._amplitude = Math.max(0, Math.min(1, val));
		if (this._workletNode && this._isReady) {
			const param = this._workletNode.parameters.get('amplitude');
			if (param)
				param.setValueAtTime(this._amplitude, Tone.getContext().currentTime);
			this._workletNode.port.postMessage({
				type: 'amplitude',
				value: this._amplitude,
			});
		}
		return this;
	}

	setActiveChannels(channels: boolean[]): this {
		if (this._workletNode && this._isReady && channels.length === 6) {
			this._workletNode.port.postMessage({ type: 'setChannels', channels });
		}
		return this;
	}

	get isReady(): boolean {
		return this._isReady;
	}

	get isPlaying(): boolean {
		return this._isPlaying;
	}

	get ready(): Promise<void> {
		return this._readyPromise;
	}

	dispose(): this {
		if (this._isPlaying) this.stop();
		if (this._workletNode) {
			this._workletNode.disconnect();
			this._workletNode = null;
		}
		if (this._splitter) {
			this._splitter.disconnect();
			this._splitter = null;
		}
		this.outputs.forEach((g) => g.dispose());
		if (this._debug) console.log('🧹 SixChannelNoiseNode disposed');
		return this;
	}
}
