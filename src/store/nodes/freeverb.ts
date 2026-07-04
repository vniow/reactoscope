import { Freeverb } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { FreeverbNodeData } from '../dawTypes';

export const freeverbHandler: NodeTypeHandler<FreeverbNodeData> = {
	defaultData: { label: 'Freeverb', roomSize: 0.7, dampening: 3000, wet: 0.5 },

	create(id, data) {
		const toneNode = new Freeverb({ roomSize: data.roomSize, dampening: data.dampening, wet: data.wet });
		_audioNodes.set(id, { kind: 'freeverb', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'freeverb') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'freeverb') return;
		if (update.roomSize  !== undefined) e.toneNode.roomSize.value = update.roomSize;
		if (update.dampening !== undefined) e.toneNode.dampening      = update.dampening;
		if (update.wet       !== undefined) e.toneNode.wet.value      = update.wet;
	},
};
