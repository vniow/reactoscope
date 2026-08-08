import { Gain, Merge, Analyser, Oscillator } from 'tone';
import { DEFAULT_AUDIO_SETTINGS } from '../config';
import { _audioNodes, MASTER_NODE_ID } from './audioCore';
import type { MasterOutputAudioEntry } from '../store/dawTypes';

const { nSamples } = DEFAULT_AUDIO_SETTINGS;

// ─── Master output chain (lazy init) ─────────────────────────────────────────
// Six input gains (X, Y, R, G, B, A) feed a 6-channel merge; the merge gates
// through speakerGain (muted by default) to the destination. Each input gain
// also feeds a per-channel Analyser for the oscilloscope tap.

let _masterEntry: MasterOutputAudioEntry | null = null;

export function getMasterEntry(): MasterOutputAudioEntry {
	if (_masterEntry) return _masterEntry;

	const inputGainX = new Gain();
	const inputGainY = new Gain();
	const inputGainR = new Gain();
	const inputGainG = new Gain();
	const inputGainB = new Gain();
	const inputGainA = new Gain();
	const merge      = new Merge(6);
	const xAnalyser  = new Analyser('waveform', nSamples);
	const yAnalyser  = new Analyser('waveform', nSamples);
	const rAnalyser  = new Analyser('waveform', nSamples);
	const gAnalyser  = new Analyser('waveform', nSamples);
	const bAnalyser  = new Analyser('waveform', nSamples);
	const aAnalyser  = new Analyser('waveform', nSamples);

	// connect(destination, outputNumber, inputNumber)
	inputGainX.connect(merge, 0, 0); inputGainX.connect(xAnalyser);
	inputGainY.connect(merge, 0, 1); inputGainY.connect(yAnalyser);
	inputGainR.connect(merge, 0, 2); inputGainR.connect(rAnalyser);
	inputGainG.connect(merge, 0, 3); inputGainG.connect(gAnalyser);
	inputGainB.connect(merge, 0, 4); inputGainB.connect(bAnalyser);
	inputGainA.connect(merge, 0, 5); inputGainA.connect(aAnalyser);

	const speakerGain = new Gain(0); // muted by default
	merge.connect(speakerGain);
	speakerGain.toDestination();

	_masterEntry = {
		kind: 'masterOutput',
		inputGainX, inputGainY, inputGainR, inputGainG, inputGainB, inputGainA,
		merge, speakerGain,
		xAnalyser, yAnalyser, rAnalyser, gAnalyser, bAnalyser, aAnalyser,
	};
	_audioNodes.set(MASTER_NODE_ID, _masterEntry);
	return _masterEntry;
}

/** Gates the merged signal to the speakers; the analyser taps are unaffected. */
export function setSpeakersMuted(muted: boolean): void {
	getMasterEntry().speakerGain.gain.value = muted ? 0 : 1;
}

// ─── getWaveformData — for the oscilloscope ───────────────────────────────────

export type WaveformFrame = {
	x: Float32Array; y: Float32Array;
	r: Float32Array; g: Float32Array; b: Float32Array; a: Float32Array;
};

/**
 * Returns the current waveform snapshot for both channels.
 * CONTRACT: do not hold references across async boundaries.
 * Copy the arrays if you need to retain the data.
 */
export function getWaveformData(): WaveformFrame {
	const entry = getMasterEntry();
	return {
		x: entry.xAnalyser.getValue() as Float32Array,
		y: entry.yAnalyser.getValue() as Float32Array,
		r: entry.rAnalyser.getValue() as Float32Array,
		g: entry.gAnalyser.getValue() as Float32Array,
		b: entry.bAnalyser.getValue() as Float32Array,
		a: entry.aAnalyser.getValue() as Float32Array,
	};
}

/** Resizes all six analysers in place — Analyser.size live-updates fftSize, no reconnect needed. */
export function setAnalyserSize(newSize: number): void {
	if (!_masterEntry) return;
	const { xAnalyser, yAnalyser, rAnalyser, gAnalyser, bAnalyser, aAnalyser } = _masterEntry;
	for (const analyser of [xAnalyser, yAnalyser, rAnalyser, gAnalyser, bAnalyser, aAnalyser]) {
		analyser.size = newSize;
	}
}

// ─── Diagnostic test tone (?testTone=1) ────────────────────────────────────────
// Feeds real, non-silent, varying signal into Master Output's six input gains
// without Scene Input's worklet being involved — used to test whether a
// master-bus tap (Waveform Capture) leaks specifically when fed real signal,
// independent of which source produced it. See Wayfinder issue #7/#10.

let _testTone: Oscillator | null = null;

export function startTestTone(): void {
	if (_testTone) return;
	const { inputGainX, inputGainY, inputGainR, inputGainG, inputGainB, inputGainA } = getMasterEntry();
	_testTone = new Oscillator(220, 'sine').start();
	for (const gain of [inputGainX, inputGainY, inputGainR, inputGainG, inputGainB, inputGainA]) {
		_testTone.connect(gain);
	}
}

/** Tears down the whole chain. Only called from the engine's unload cleanup. */
export function disposeMasterChain(): void {
	if (!_masterEntry) return;
	const m = _masterEntry;
	[
		m.inputGainX, m.inputGainY, m.inputGainR, m.inputGainG, m.inputGainB, m.inputGainA,
		m.merge, m.speakerGain,
		m.xAnalyser, m.yAnalyser, m.rAnalyser, m.gAnalyser, m.bAnalyser, m.aAnalyser,
	].forEach(n => n.dispose());
	_audioNodes.delete(MASTER_NODE_ID);
	_masterEntry = null;
}
