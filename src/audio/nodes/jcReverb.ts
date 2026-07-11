import { JCReverb } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { JCReverbNodeData } from '../../store/dawTypes';

export const jcReverbHandler: NodeTypeHandler<JCReverbNodeData> = {
	defaultData: { label: 'JC Reverb', roomSize: 0.5, wet: 0.5 },

	create(id, data) {
		const toneNode = new JCReverb({ roomSize: data.roomSize, wet: data.wet });
		_audioNodes.set(id, { kind: 'jcReverb', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'jcReverb') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'jcReverb') return;
		if (update.roomSize !== undefined) e.toneNode.roomSize.value = update.roomSize;
		if (update.wet      !== undefined) e.toneNode.wet.value      = update.wet;
	},
};
