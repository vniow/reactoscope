import { FrequencyShifter } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { FrequencyShifterNodeData } from '../../store/dawTypes';

export const frequencyShifterHandler: NodeTypeHandler<FrequencyShifterNodeData> = {
	defaultData: { label: 'Frequency Shifter', frequency: 0, wet: 1 },

	create(id, data) {
		const toneNode = new FrequencyShifter({ frequency: data.frequency, wet: data.wet });
		_audioNodes.set(id, { kind: 'frequencyShifter', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'frequencyShifter') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'frequencyShifter') return;
		if (update.frequency !== undefined) e.toneNode.frequency.value = update.frequency;
		if (update.wet       !== undefined) e.toneNode.wet.value       = update.wet;
	},
};
