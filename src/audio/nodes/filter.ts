import { Filter } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { FilterNodeData } from '../../store/dawTypes';

export const filterHandler: NodeTypeHandler<FilterNodeData> = {
	defaultData: { label: 'Filter', frequency: 350, type: 'lowpass', rolloff: -12, Q: 1, detune: 0, gain: 0 },

	create(id, data) {
		const toneNode = new Filter({
			frequency: data.frequency,
			type:      data.type,
			rolloff:   data.rolloff,
			Q:         data.Q,
			detune:    data.detune,
			gain:      data.gain,
		});
		_audioNodes.set(id, { kind: 'filter', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'filter') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'filter') return;
		if (update.frequency !== undefined) e.toneNode.frequency.value = update.frequency;
		if (update.detune    !== undefined) e.toneNode.detune.value    = update.detune;
		if (update.Q         !== undefined) e.toneNode.Q.value         = update.Q;
		if (update.gain      !== undefined) e.toneNode.gain.value      = update.gain;
		if (update.type      !== undefined) e.toneNode.type            = update.type;
		if (update.rolloff   !== undefined) e.toneNode.rolloff         = update.rolloff;
	},
};
