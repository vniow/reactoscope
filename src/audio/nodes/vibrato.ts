import { Vibrato } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { VibratoNodeData } from '../../store/dawTypes';

// Vibrato's internal LFO runs continuously — no explicit start/stop needed.
export const vibratoHandler: NodeTypeHandler<VibratoNodeData> = {
	defaultData: { label: 'Vibrato', frequency: 5, depth: 0.1, wet: 0.5 },

	create(id, data) {
		const toneNode = new Vibrato({ frequency: data.frequency, depth: data.depth, wet: data.wet });
		_audioNodes.set(id, { kind: 'vibrato', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'vibrato') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'vibrato') return;
		if (update.frequency !== undefined) e.toneNode.frequency.value = update.frequency;
		if (update.depth     !== undefined) e.toneNode.depth.value     = update.depth;
		if (update.wet       !== undefined) e.toneNode.wet.value       = update.wet;
	},
};
