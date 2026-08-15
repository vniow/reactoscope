import { Mono } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { MonoNodeData } from '../../store/dawTypes';

export const monoHandler: NodeTypeHandler<MonoNodeData> = {
	defaultData: { label: 'Mono' },

	create(id) {
		const toneNode = new Mono();
		_audioNodes.set(id, { kind: 'mono', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'mono') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam() {
		// No configurable params.
	},
};
