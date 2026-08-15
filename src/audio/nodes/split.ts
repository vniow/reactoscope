import { Split } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { SplitNodeData } from '../../store/dawTypes';

export const splitHandler: NodeTypeHandler<SplitNodeData> = {
	defaultData: { label: 'Split' },

	create(id) {
		const toneNode = new Split(2);
		_audioNodes.set(id, { kind: 'split', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'split') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam() {
		// No configurable params.
	},
};
