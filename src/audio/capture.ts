import { Merge, getContext } from 'tone';
import { DEFAULT_AUDIO_SETTINGS } from '../config';
import { getMasterEntry } from './master';

const { nSamples } = DEFAULT_AUDIO_SETTINGS;

const CAPTURE_CH = 6;

// ─── Waveform capture (SharedArrayBuffer push model) ─────────────────────────
// Layout: [writeIndex:Uint32(4B)] + [ch0..ch5: Float32[N] each]
// Worklet writes complete N-sample frames then Atomics.add(writeIndex, 1).
// Main thread Atomics.load(writeIndex) acts as an acquire fence; all preceding
// channel writes from the audio thread are visible after the counter changes.

let _captureSAB:          SharedArrayBuffer | null = null;
let _captureWriteView:    Uint32Array       | null = null;
let _captureChannels:     Float32Array[]           = [];
let _captureNSamples: number                       = nSamples;
let _waveformCaptureNode: AudioWorkletNode  | null = null;

function _allocCaptureSAB(n: number): void {
	_captureNSamples  = n;
	_captureSAB       = new SharedArrayBuffer(4 + CAPTURE_CH * n * 4);
	_captureWriteView = new Uint32Array(_captureSAB, 0, 1);
	_captureChannels  = [];
	for (let ch = 0; ch < CAPTURE_CH; ch++) {
		_captureChannels.push(new Float32Array(_captureSAB, 4 + ch * n * 4, n));
	}
}

export function getWaveformWriteIndex(): number {
	if (!_captureWriteView) return 0;
	return Atomics.load(_captureWriteView, 0);
}

export function getWaveformDataFromSAB(): {
	x: Float32Array; y: Float32Array;
	r: Float32Array; g: Float32Array; b: Float32Array; a: Float32Array;
} | null {
	if (_captureChannels.length < 6) return null;
	return {
		x: _captureChannels[0],
		y: _captureChannels[1],
		r: _captureChannels[2],
		g: _captureChannels[3],
		b: _captureChannels[4],
		a: _captureChannels[5],
	};
}

export function getWaveformNSamples(): number {
	return _captureNSamples;
}

// ─── Worklet liveness (bisection-map instrumentation) ─────────────────────────
// See public/waveformCaptureProcessor.worklet.js — this worklet shares Scene
// Input's ponyfilled-AudioWorkletNode freeze risk (issue #6), so a "no growth"
// reading from it needs proof it was actually running the whole time.

export type WaveformCaptureWorkletStats = {
	processCallCount: number;
	flushCount:       number;
	currentTime:      number;
	receivedAt:       number;
};

let _workletStats: WaveformCaptureWorkletStats | null = null;

export function getWaveformCaptureWorkletStats(): WaveformCaptureWorkletStats | null {
	return _workletStats;
}

export function setWaveformCaptureSize(newSize: number): void {
	if (newSize === _captureNSamples && _captureSAB) return;
	_allocCaptureSAB(newSize);
	if (_waveformCaptureNode) {
		_waveformCaptureNode.port.postMessage({
			type: 'resize', buffer: _captureSAB!, nSamples: newSize,
		});
	}
}

// ─── Worklet initialisation ───────────────────────────────────────────────────

function _tapMasterBus(dest: AudioWorkletNode): void {
	const master   = getMasterEntry();
	const tapMerge = new Merge(6);

	master.inputGainX.connect(tapMerge, 0, 0);
	master.inputGainY.connect(tapMerge, 0, 1);
	master.inputGainR.connect(tapMerge, 0, 2);
	master.inputGainG.connect(tapMerge, 0, 3);
	master.inputGainB.connect(tapMerge, 0, 4);
	master.inputGainA.connect(tapMerge, 0, 5);

	// tapMerge.output is the underlying standardized-audio-context
	// ChannelMergerNode; the worklet node lives in the same context.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(tapMerge as any).output.connect(dest as any, 0, 0);
}

export async function initWaveformCapture(): Promise<void> {
	const toneCtx = getContext();

	// Tone.js caches a single worklet promise per context (addAudioWorkletModule
	// short-circuits on the second call), so we go directly to the
	// standardized-audio-context audioWorklet.addModule() which handles
	// per-URL deduplication and the blob-wrapper correctly.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	await (toneCtx.rawContext as any).audioWorklet.addModule('/waveformCaptureProcessor.worklet.js');

	const workletNode = toneCtx.createAudioWorkletNode('waveform-capture', {
		numberOfInputs:   1,
		numberOfOutputs:  0,
		channelCount:     6,
		channelCountMode: 'explicit' as ChannelCountMode,
		processorOptions: { nSamples: _captureNSamples },
	});
	_waveformCaptureNode = workletNode as unknown as AudioWorkletNode;

	_waveformCaptureNode.port.addEventListener('message', (e: MessageEvent) => {
		if (e.data?.type === 'stats') {
			_workletStats = { ...(e.data as Omit<WaveformCaptureWorkletStats, 'receivedAt'>), receivedAt: Date.now() };
		}
	});
	_waveformCaptureNode.port.start();

	_tapMasterBus(_waveformCaptureNode);

	_allocCaptureSAB(_captureNSamples);
	_waveformCaptureNode.port.postMessage({
		type: 'sabBuffer', buffer: _captureSAB!, nSamples: _captureNSamples,
	});
}
