import { Signal } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { DCSignalNodeData } from '../../store/dawTypes';

export const dcSignalHandler: NodeTypeHandler<DCSignalNodeData> = {
	defaultData: { label: 'DC Signal', value: 1 },

	create(id, data) {
		const toneNode = new Signal<'audioRange'>(data.value ?? 1, 'audioRange');
		_audioNodes.set(id, { kind: 'dcSignal', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'dcSignal') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'dcSignal') return;
		if (update.value !== undefined) e.toneNode.value = update.value;
	},
};
