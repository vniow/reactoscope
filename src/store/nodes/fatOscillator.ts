import { FatOscillator } from 'tone';
import { start as toneStart } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { FatOscillatorNodeData, OscType } from '../dawTypes';

export const fatOscillatorHandler: NodeTypeHandler<FatOscillatorNodeData> = {
	defaultData: { label: 'Fat Oscillator', frequency: 440, type: 'sawtooth', count: 3, spread: 20, detune: 0, phase: 0 },

	create(id, data) {
		const toneNode = new FatOscillator({
			frequency: data.frequency ?? 440,
			type:      data.type      ?? 'sawtooth',
			count:     data.count     ?? 3,
			spread:    data.spread    ?? 20,
			detune:    data.detune    ?? 0,
			phase:     data.phase     ?? 0,
		});
		_audioNodes.set(id, { kind: 'fatOscillator', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'fatOscillator') return;
		if (e.toneNode.state === 'started') e.toneNode.stop();
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'fatOscillator') return;
		if (update.frequency !== undefined) e.toneNode.frequency.value = update.frequency;
		if (update.type      !== undefined) e.toneNode.type            = update.type;
		if (update.count     !== undefined) e.toneNode.count           = Math.round(update.count);
		if (update.spread    !== undefined) e.toneNode.spread          = update.spread;
		if (update.detune    !== undefined) e.toneNode.detune.value    = update.detune;
		if (update.phase     !== undefined) e.toneNode.phase           = update.phase;
	},

	async start(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'fatOscillator') return false;

		await toneStart();

		let recreated = false;
		if (e.toneNode.state === 'stopped') {
			const frequency = e.toneNode.frequency.value as number;
			const type      = e.toneNode.type as OscType;
			const count     = e.toneNode.count;
			const spread    = e.toneNode.spread;
			const detune    = e.toneNode.detune.value as number;
			const phase     = e.toneNode.phase;
			e.toneNode.dispose();
			e.toneNode = new FatOscillator({ frequency, type, count, spread, detune, phase });
			recreated = true;
		}

		if (e.toneNode.state !== 'started') e.toneNode.start();
		return recreated;
	},

	stop(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'fatOscillator') return;
		if (e.toneNode.state === 'started') e.toneNode.stop();
	},
};
