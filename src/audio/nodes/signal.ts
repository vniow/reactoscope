import { Signal } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { SignalNodeData } from '../../store/dawTypes';

export const signalHandler: NodeTypeHandler<SignalNodeData> = {
	defaultData: { label: 'Signal', value: 0 },

	create(id, data) {
		const toneNode = new Signal<'number'>(data.value);
		_audioNodes.set(id, { kind: 'signal', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'signal') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'signal') return;
		if (update.value !== undefined) e.toneNode.value = update.value;
	},
};
