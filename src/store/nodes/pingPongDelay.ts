import { PingPongDelay } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { PingPongDelayNodeData } from '../dawTypes';

export const pingPongDelayHandler: NodeTypeHandler<PingPongDelayNodeData> = {
	defaultData: { label: 'Ping Pong Delay', delayTime: 0.25, feedback: 0.5, wet: 0.5 },

	create(id, data) {
		const toneNode = new PingPongDelay({ delayTime: data.delayTime, feedback: data.feedback, wet: data.wet });
		_audioNodes.set(id, { kind: 'pingPongDelay', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'pingPongDelay') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'pingPongDelay') return;
		if (update.delayTime !== undefined) e.toneNode.delayTime.value = update.delayTime;
		if (update.feedback  !== undefined) e.toneNode.feedback.value  = update.feedback;
		if (update.wet       !== undefined) e.toneNode.wet.value       = update.wet;
	},
};
