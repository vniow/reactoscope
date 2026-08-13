import { PitchShift } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { PitchShiftNodeData } from '../../store/dawTypes';

export const pitchShiftHandler: NodeTypeHandler<PitchShiftNodeData> = {
	defaultData: { label: 'Pitch Shift', pitch: 0, windowSize: 0.1, feedback: 0, wet: 1 },

	create(id, data) {
		const toneNode = new PitchShift({ pitch: data.pitch, windowSize: data.windowSize, feedback: data.feedback, wet: data.wet });
		_audioNodes.set(id, { kind: 'pitchShift', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'pitchShift') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'pitchShift') return;
		if (update.pitch      !== undefined) e.toneNode.pitch              = update.pitch;
		if (update.windowSize !== undefined) e.toneNode.windowSize         = update.windowSize;
		if (update.feedback   !== undefined) e.toneNode.feedback.value     = update.feedback;
		if (update.wet        !== undefined) e.toneNode.wet.value          = update.wet;
	},
};
