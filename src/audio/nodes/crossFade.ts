import { CrossFade } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { CrossFadeNodeData } from '../../store/dawTypes';

export const crossFadeHandler: NodeTypeHandler<CrossFadeNodeData> = {
	defaultData: { label: 'CrossFade', fade: 0.5 },

	create(id, data) {
		const toneNode = new CrossFade(data.fade);
		_audioNodes.set(id, { kind: 'crossFade', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'crossFade') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'crossFade') return;
		if (update.fade !== undefined) e.toneNode.fade.value = update.fade;
	},
};
