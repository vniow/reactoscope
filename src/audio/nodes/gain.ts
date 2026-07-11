import { Gain } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { GainNodeData } from '../../store/dawTypes';

export const gainHandler: NodeTypeHandler<GainNodeData> = {
	defaultData: { label: 'Gain', gain: 1.0 },

	create(id, data) {
		const toneNode = new Gain(data.gain ?? 1.0);
		_audioNodes.set(id, { kind: 'gain', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'gain') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'gain') return;
		if (update.gain !== undefined) e.toneNode.gain.value = update.gain;
	},
};
