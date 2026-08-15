import { Scale } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { ScaleNodeData } from '../../store/dawTypes';

export const scaleHandler: NodeTypeHandler<ScaleNodeData> = {
	defaultData: { label: 'Scale', min: 0, max: 1 },

	create(id, data) {
		const toneNode = new Scale(data.min, data.max);
		_audioNodes.set(id, { kind: 'scale', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'scale') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'scale') return;
		if (update.min !== undefined) e.toneNode.min = update.min;
		if (update.max !== undefined) e.toneNode.max = update.max;
	},
};
