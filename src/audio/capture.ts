import { Merge, getContext } from 'tone';
import { DEFAULT_AUDIO_SETTINGS } from '../config';
import { getSampleRate } from './audioCore';
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

export function setWaveformCaptureSize(newSize: number): void {
	if (newSize === _captureNSamples && _captureSAB) return;
	_allocCaptureSAB(newSize);
	if (_waveformCaptureNode) {
		_waveformCaptureNode.port.postMessage({
			type: 'resize', buffer: _captureSAB!, nSamples: newSize,
		});
	}
	// Galvo ring keeps a generous window independent of the scope analysis size
	// so render-frame hitches don't lose beam samples. Re-allocate alongside.
	_allocGalvoRing();
	if (_galvoProjectorNode) {
		_galvoProjectorNode.port.postMessage({
			type: 'resize', buffer: _galvoSAB!, ringLen: _galvoRingLen,
		});
	}
}

// ─── Galvo-projector capture (continuous ring buffer) ─────────────────────────
// The worklet writes every post-transducer sample into a circular buffer and
// publishes a monotonic writeCount. In laser mode the visualiser reads the
// samples scanned since its last frame and deposits only that arc with
// wall-clock decay, so rendered brightness/flicker track the real PPS.
//
// SAB layout: [writeCount: Uint32(4B)] + [ch0..ch5: Float32[ringLen] each]

let _galvoSAB:           SharedArrayBuffer | null = null;
let _galvoCountView:     Uint32Array       | null = null;
let _galvoChannels:      Float32Array[]           = [];
let _galvoRingLen:       number                   = 0;
let _galvoProjectorNode: AudioWorkletNode  | null = null;

/** Ring length: ≥ half a second of audio, so even slow render frames recover the full arc. */
function _galvoRingLenFor(): number {
	const sr = (() => { try { return getSampleRate(); } catch { return 48000; } })();
	return Math.max(_captureNSamples, Math.ceil(sr / 2));
}

function _allocGalvoRing(): void {
	_galvoRingLen   = _galvoRingLenFor();
	_galvoSAB       = new SharedArrayBuffer(4 + CAPTURE_CH * _galvoRingLen * 4);
	_galvoCountView = new Uint32Array(_galvoSAB, 0, 1);
	_galvoChannels  = [];
	for (let ch = 0; ch < CAPTURE_CH; ch++) {
		_galvoChannels.push(new Float32Array(_galvoSAB, 4 + ch * _galvoRingLen * 4, _galvoRingLen));
	}
}

/** Total samples the galvo worklet has written so far (monotonic, wraps at 2^32). */
export function getGalvoWriteCount(): number {
	if (!_galvoCountView) return 0;
	return Atomics.load(_galvoCountView, 0);
}

/** The post-galvo ring: six channel views + the ring length. Null until init. */
export function getGalvoRing(): {
	x: Float32Array; y: Float32Array;
	r: Float32Array; g: Float32Array; b: Float32Array; a: Float32Array;
	ringLen: number;
} | null {
	if (_galvoChannels.length < 6) return null;
	return {
		x: _galvoChannels[0],
		y: _galvoChannels[1],
		r: _galvoChannels[2],
		g: _galvoChannels[3],
		b: _galvoChannels[4],
		a: _galvoChannels[5],
		ringLen: _galvoRingLen,
	};
}

export function setGalvoParams(p: {
	bandwidthHz?:    number;
	dampingRatio?:   number;
	modulatorTauUs?: number;
}): void {
	if (!_galvoProjectorNode) return;
	_galvoProjectorNode.port.postMessage({ type: 'params', ...p });
}

// ─── Worklet initialisation ───────────────────────────────────────────────────
// Both worklets tap the same 6-channel master bus through their own Merge:
// waveform capture feeds scope mode unfiltered; the galvo projector applies
// deflection physics in the worklet and feeds laser mode.

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

	_tapMasterBus(_waveformCaptureNode);

	_allocCaptureSAB(_captureNSamples);
	_waveformCaptureNode.port.postMessage({
		type: 'sabBuffer', buffer: _captureSAB!, nSamples: _captureNSamples,
	});
}

export async function initGalvoProjector(): Promise<void> {
	const toneCtx = getContext();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	await (toneCtx.rawContext as any).audioWorklet.addModule('/galvoProjectorProcessor.worklet.js');

	_allocGalvoRing();
	const workletNode = toneCtx.createAudioWorkletNode('galvo-projector', {
		numberOfInputs:   1,
		numberOfOutputs:  0,
		channelCount:     6,
		channelCountMode: 'explicit' as ChannelCountMode,
		processorOptions: { ringLen: _galvoRingLen },
	});
	_galvoProjectorNode = workletNode as unknown as AudioWorkletNode;

	_tapMasterBus(_galvoProjectorNode);

	_galvoProjectorNode.port.postMessage({
		type: 'sabBuffer', buffer: _galvoSAB!, ringLen: _galvoRingLen,
	});
}
