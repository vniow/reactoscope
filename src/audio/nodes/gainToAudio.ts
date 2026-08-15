import { GainToAudio } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { GainToAudioNodeData } from '../../store/dawTypes';

export const gainToAudioHandler: NodeTypeHandler<GainToAudioNodeData> = {
	defaultData: { label: 'GainToAudio' },

	create(id) {
		const toneNode = new GainToAudio();
		_audioNodes.set(id, { kind: 'gainToAudio', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'gainToAudio') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam() {
		// No configurable params.
	},
};
