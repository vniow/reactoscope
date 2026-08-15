import { Abs } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { AbsNodeData } from '../../store/dawTypes';

export const absHandler: NodeTypeHandler<AbsNodeData> = {
	defaultData: { label: 'Abs' },

	create(id) {
		const toneNode = new Abs();
		_audioNodes.set(id, { kind: 'abs', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'abs') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam() {
		// No configurable params.
	},
};
