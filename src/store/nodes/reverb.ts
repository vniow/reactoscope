import { Reverb } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { ReverbNodeData } from '../dawTypes';

export const reverbHandler: NodeTypeHandler<ReverbNodeData> = {
	defaultData: { label: 'Reverb', decay: 1.5, preDelay: 0.01, wet: 0.5 },

	create(id, data) {
		// Tone.js v15 calls generate() automatically in the constructor.
		const toneNode = new Reverb({ decay: data.decay, preDelay: data.preDelay, wet: data.wet });
		_audioNodes.set(id, { kind: 'reverb', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'reverb') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'reverb') return;
		if (update.decay    !== undefined) e.toneNode.decay    = update.decay;
		if (update.preDelay !== undefined) e.toneNode.preDelay = update.preDelay;
		if (update.wet      !== undefined) e.toneNode.wet.value = update.wet;
	},
};
