import { AudioToGain } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { AudioToGainNodeData } from '../../store/dawTypes';

export const audioToGainHandler: NodeTypeHandler<AudioToGainNodeData> = {
	defaultData: { label: 'AudioToGain' },

	create(id) {
		const toneNode = new AudioToGain();
		_audioNodes.set(id, { kind: 'audioToGain', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'audioToGain') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam() {
		// No configurable params.
	},
};
