import { Merge } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { MergeNodeData } from '../../store/dawTypes';

export const mergeHandler: NodeTypeHandler<MergeNodeData> = {
	defaultData: { label: 'Merge' },

	create(id) {
		const toneNode = new Merge(2);
		_audioNodes.set(id, { kind: 'merge', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'merge') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam() {
		// No configurable params.
	},
};
