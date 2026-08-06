import { Merge, getContext } from 'tone';
import { DEFAULT_AUDIO_SETTINGS } from '../config';
import { getMasterEntry } from './master';

const { nSamples } = DEFAULT_AUDIO_SETTINGS;

const CAPTURE_CH = 6;

// ─── Waveform capture (postMessage push model) ────────────────────────────────
// Previously a SharedArrayBuffer + Atomics push model — replaced here to test
// whether concurrent Atomics-based shared-memory use across two AudioWorkletNodes
// (this one + Scene Input's) was the actual trigger for the audio-engine memory
// leak found in Wayfinder issue #7/#10, independent of "two worklets coexisting"
// in general. The worklet now posts a complete N-sample frame (all 6 channels
// packed into one transferable ArrayBuffer) each time its accumulator fills;
// the main thread copies it into plain (non-shared) Float32Arrays and bumps a
// plain counter. Single-threaded on the main-thread side, so no Atomics needed
// there either — the read-side contract (getWaveformDataFromSAB /
// getWaveformWriteIndex) is unchanged for callers.

let _captureChannels:     Float32Array[]           = [];
let _captureWriteIndex:   number                   = 0;
let _captureNSamples:     number                   = nSamples;
let _waveformCaptureNode: AudioWorkletNode  | null = null;

function _allocCaptureChannels(n: number): void {
	_captureNSamples = n;
	_captureChannels = Array.from({ length: CAPTURE_CH }, () => new Float32Array(n));
}

export function getWaveformWriteIndex(): number {
	return _captureWriteIndex;
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
// Input's AudioWorkletNode freeze risk (issue #6), so a "no growth" reading
// from it needs proof it was actually running the whole time.

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
	if (newSize === _captureNSamples && _captureChannels.length === CAPTURE_CH) return;
	_allocCaptureChannels(newSize);
	if (_waveformCaptureNode) {
		_waveformCaptureNode.port.postMessage({ type: 'resize', nSamples: newSize });
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
		const msg = e.data as { type?: string };
		if (msg?.type === 'frame') {
			const { data, nSamples: n } = e.data as { data: ArrayBuffer; nSamples: number };
			const packed = new Float32Array(data);
			for (let ch = 0; ch < CAPTURE_CH; ch++) {
				_captureChannels[ch].set(packed.subarray(ch * n, ch * n + n));
			}
			_captureWriteIndex++;
		} else if (msg?.type === 'stats') {
			_workletStats = { ...(e.data as Omit<WaveformCaptureWorkletStats, 'receivedAt'>), receivedAt: Date.now() };
		}
	});
	_waveformCaptureNode.port.start();

	_tapMasterBus(_waveformCaptureNode);

	_allocCaptureChannels(_captureNSamples);
}
