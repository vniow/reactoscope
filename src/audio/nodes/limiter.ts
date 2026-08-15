import { Limiter } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { LimiterNodeData } from '../../store/dawTypes';

export const limiterHandler: NodeTypeHandler<LimiterNodeData> = {
	defaultData: { label: 'Limiter', threshold: -12 },

	create(id, data) {
		const toneNode = new Limiter(data.threshold);
		_audioNodes.set(id, { kind: 'limiter', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'limiter') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'limiter') return;
		if (update.threshold !== undefined) e.toneNode.threshold.value = update.threshold;
	},
};
