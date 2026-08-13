import { FeedbackDelay } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { FeedbackDelayNodeData } from '../../store/dawTypes';

export const feedbackDelayHandler: NodeTypeHandler<FeedbackDelayNodeData> = {
	defaultData: { label: 'Feedback Delay', delayTime: 0.25, feedback: 0.5, wet: 0.5 },

	create(id, data) {
		const toneNode = new FeedbackDelay({ delayTime: data.delayTime, feedback: data.feedback, wet: data.wet });
		_audioNodes.set(id, { kind: 'feedbackDelay', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'feedbackDelay') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'feedbackDelay') return;
		if (update.delayTime !== undefined) e.toneNode.delayTime.value = update.delayTime;
		if (update.feedback  !== undefined) e.toneNode.feedback.value  = update.feedback;
		if (update.wet       !== undefined) e.toneNode.wet.value       = update.wet;
	},
};
