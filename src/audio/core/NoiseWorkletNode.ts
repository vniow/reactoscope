/**
 * NoiseWorkletNode - White noise generator using AudioWorklet with Tone.js external worklet API
 */
import * as Tone from 'tone';
import {
	noiseProcessorWorklet,
	workletName,
} from './worklet/NoiseProcessor.worklet';
import { ensureWorkletModule } from '../utils/workletRegistry';

export interface NoiseWorkletNodeOptions {
	amplitude?: number;
	autostart?: boolean;
	debug?: boolean;
}

export class NoiseWorkletNode {
	readonly output: Tone.Gain;
	private _node: AudioWorkletNode | null = null;
	private _isPlaying: boolean = false;
	private _amplitude: number;
	private _isReady: boolean = false;
	private _readyPromise: Promise<void>;
	private _resolveReady!: () => void;
	private _debug: boolean;

	constructor(options: NoiseWorkletNodeOptions = {}) {
		this._amplitude = options.amplitude ?? 0.5;
		this._debug = options.debug ?? false;
		this.output = new Tone.Gain({ context: Tone.getContext(), gain: 1 });
		this._readyPromise = new Promise(
			(resolve) => (this._resolveReady = resolve)
		);
		// async init
		this._initialize(options.autostart ?? false).catch((err) => {
			console.error('❌ NoiseWorkletNode init failed:', err);
		});
	}

	private async _initialize(autostart: boolean): Promise<void> {
		// Tone.getContext().rawContext is an AnyAudioContext; cast to AudioContext for worklet module registration
		const raw = Tone.getContext().rawContext as AudioContext;
		const blob = new Blob([noiseProcessorWorklet], { type: 'text/javascript' });
		const url = URL.createObjectURL(blob);
		try {
			await ensureWorkletModule(raw, workletName, url);
		} finally {
			URL.revokeObjectURL(url);
		}
		// create worklet node via Tone.js context wrapper to ensure correct BaseAudioContext handling
		const workletNode = Tone.getContext().createAudioWorkletNode(workletName, {
			numberOfInputs: 0,
			numberOfOutputs: 1,
			outputChannelCount: [1],
			parameterData: { amplitude: this._amplitude },
		});
		// connect worklet output to our Gain node
		workletNode.connect(this.output.input);
		this._node = workletNode;
		this._isReady = true;
		this._resolveReady();
		if (this._debug) console.log('✅ NoiseWorkletNode ready');
		if (autostart) this.start();
	}

	get ready(): Promise<void> {
		return this._readyPromise;
	}

	get isReady(): boolean {
		return this._isReady;
	}

	get isPlaying(): boolean {
		return this._isPlaying;
	}

	get amplitude(): number {
		return this._amplitude;
	}

	start(): this {
		if (this._node && this._isReady && !this._isPlaying) {
			this._node.port.postMessage({ type: 'start' });
			this._isPlaying = true;
			if (this._debug) console.log('▶️ NoiseWorkletNode started');
		}
		return this;
	}

	stop(): this {
		if (this._node && this._isReady && this._isPlaying) {
			this._node.port.postMessage({ type: 'stop' });
			this._isPlaying = false;
			if (this._debug) console.log('⏹️ NoiseWorkletNode stopped');
		}
		return this;
	}

	setAmplitude(value: number): this {
		this._amplitude = Math.max(0, Math.min(1, value));
		if (this._node && this._isReady) {
			const param = this._node.parameters.get('amplitude');
			if (param) {
				param.setValueAtTime(this._amplitude, Tone.getContext().currentTime);
			}
			this._node.port.postMessage({
				type: 'amplitude',
				value: this._amplitude,
			});
			if (this._debug)
				console.log('🔊 NoiseWorkletNode amplitude set to', this._amplitude);
		}
		return this;
	}

	connect(destination: Tone.InputNode): this {
		this.output.connect(destination);
		return this;
	}

	disconnect(): this {
		this.output.disconnect();
		return this;
	}

	dispose(): this {
		if (this._isPlaying) this.stop();
		if (this._node) {
			this._node.disconnect();
			this._node = null;
		}
		this.output.dispose();
		if (this._debug) console.log('🧹 NoiseWorkletNode disposed');
		return this;
	}
}
