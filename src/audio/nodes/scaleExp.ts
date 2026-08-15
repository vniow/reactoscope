import { ScaleExp } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { ScaleExpNodeData } from '../../store/dawTypes';

export const scaleExpHandler: NodeTypeHandler<ScaleExpNodeData> = {
	defaultData: { label: 'ScaleExp', min: 0, max: 1, exponent: 1 },

	create(id, data) {
		const toneNode = new ScaleExp(data.min, data.max, data.exponent);
		_audioNodes.set(id, { kind: 'scaleExp', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'scaleExp') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'scaleExp') return;
		if (update.min      !== undefined) e.toneNode.min      = update.min;
		if (update.max      !== undefined) e.toneNode.max      = update.max;
		if (update.exponent !== undefined) e.toneNode.exponent = update.exponent;
	},
};
