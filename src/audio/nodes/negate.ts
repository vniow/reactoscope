import { Negate } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { NegateNodeData } from '../../store/dawTypes';

export const negateHandler: NodeTypeHandler<NegateNodeData> = {
	defaultData: { label: 'Negate' },

	create(id) {
		const toneNode = new Negate();
		_audioNodes.set(id, { kind: 'negate', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'negate') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam() {
		// No configurable params.
	},
};
