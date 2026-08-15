import { Gate } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { GateNodeData } from '../../store/dawTypes';

export const gateHandler: NodeTypeHandler<GateNodeData> = {
	defaultData: { label: 'Gate', threshold: -40, smoothing: 0.1 },

	create(id, data) {
		const toneNode = new Gate(data.threshold, data.smoothing);
		_audioNodes.set(id, { kind: 'gate', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'gate') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'gate') return;
		if (update.threshold !== undefined) e.toneNode.threshold = update.threshold;
		if (update.smoothing !== undefined) e.toneNode.smoothing = update.smoothing;
	},
};
