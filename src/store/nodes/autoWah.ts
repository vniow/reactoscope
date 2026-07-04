import { AutoWah } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { AutoWahNodeData } from '../dawTypes';

export const autoWahHandler: NodeTypeHandler<AutoWahNodeData> = {
	defaultData: { label: 'Auto Wah', baseFrequency: 100, octaves: 6, sensitivity: 0, wet: 1 },

	create(id, data) {
		const toneNode = new AutoWah({ baseFrequency: data.baseFrequency, octaves: data.octaves, sensitivity: data.sensitivity, wet: data.wet });
		_audioNodes.set(id, { kind: 'autoWah', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'autoWah') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'autoWah') return;
		if (update.baseFrequency !== undefined) e.toneNode.baseFrequency = update.baseFrequency;
		if (update.octaves       !== undefined) e.toneNode.octaves       = update.octaves;
		if (update.sensitivity   !== undefined) e.toneNode.sensitivity   = update.sensitivity;
		if (update.wet           !== undefined) e.toneNode.wet.value     = update.wet;
	},
};
