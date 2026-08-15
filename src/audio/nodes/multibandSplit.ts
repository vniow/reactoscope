import { MultibandSplit } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { MultibandSplitNodeData } from '../../store/dawTypes';

export const multibandSplitHandler: NodeTypeHandler<MultibandSplitNodeData> = {
	defaultData: { label: 'MultibandSplit', lowFrequency: 400, highFrequency: 2500, Q: 1 },

	create(id, data) {
		const toneNode = new MultibandSplit({
			lowFrequency:  data.lowFrequency,
			highFrequency: data.highFrequency,
			Q:             data.Q,
		});
		_audioNodes.set(id, { kind: 'multibandSplit', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'multibandSplit') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'multibandSplit') return;
		if (update.lowFrequency  !== undefined) e.toneNode.lowFrequency.value  = update.lowFrequency;
		if (update.highFrequency !== undefined) e.toneNode.highFrequency.value = update.highFrequency;
		if (update.Q             !== undefined) e.toneNode.Q.value             = update.Q;
	},
};
