import { Chebyshev } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { ChebyshevNodeData } from '../../store/dawTypes';

export const chebyshevHandler: NodeTypeHandler<ChebyshevNodeData> = {
	defaultData: { label: 'Chebyshev', order: 50, wet: 1 },

	create(id, data) {
		const toneNode = new Chebyshev({ order: data.order, wet: data.wet });
		_audioNodes.set(id, { kind: 'chebyshev', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'chebyshev') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'chebyshev') return;
		if (update.order !== undefined) e.toneNode.order    = Math.round(update.order);
		if (update.wet   !== undefined) e.toneNode.wet.value = update.wet;
	},
};
