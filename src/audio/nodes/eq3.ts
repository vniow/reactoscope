import { EQ3 } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { EQ3NodeData } from '../../store/dawTypes';

export const eq3Handler: NodeTypeHandler<EQ3NodeData> = {
	defaultData: { label: 'EQ3', low: 0, mid: 0, high: 0, lowFrequency: 400, highFrequency: 2500 },

	create(id, data) {
		const toneNode = new EQ3({
			low:           data.low,
			mid:           data.mid,
			high:          data.high,
			lowFrequency:  data.lowFrequency,
			highFrequency: data.highFrequency,
		});
		_audioNodes.set(id, { kind: 'eq3', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'eq3') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'eq3') return;
		if (update.low           !== undefined) e.toneNode.low.value           = update.low;
		if (update.mid           !== undefined) e.toneNode.mid.value           = update.mid;
		if (update.high          !== undefined) e.toneNode.high.value          = update.high;
		if (update.lowFrequency  !== undefined) e.toneNode.lowFrequency.value  = update.lowFrequency;
		if (update.highFrequency !== undefined) e.toneNode.highFrequency.value = update.highFrequency;
	},
};
