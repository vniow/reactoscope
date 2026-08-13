import { FeedbackDelay } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { DelayNodeData } from '../../store/dawTypes';

// "Delay" is a FeedbackDelay with the repeat path permanently disabled
// (feedback pinned to 0, never exposed to setAudioParam) — gets Effect's
// equal-power wet/dry CrossFade for free instead of hand-rolling one.

export const delayHandler: NodeTypeHandler<DelayNodeData> = {
	defaultData: { label: 'Delay', delayTime: 0.25, wet: 1 },

	create(id, data) {
		const toneNode = new FeedbackDelay({
			delayTime: data.delayTime ?? 0.25,
			feedback:  0,
			wet:       data.wet ?? 1,
		});
		_audioNodes.set(id, { kind: 'delay', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'delay') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'delay') return;
		if (update.delayTime !== undefined) e.toneNode.delayTime.value = update.delayTime;
		if (update.wet       !== undefined) e.toneNode.wet.value       = update.wet;
	},
};
