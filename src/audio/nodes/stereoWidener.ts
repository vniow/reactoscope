import { StereoWidener } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { StereoWidenerNodeData } from '../../store/dawTypes';

export const stereoWidenerHandler: NodeTypeHandler<StereoWidenerNodeData> = {
	defaultData: { label: 'Stereo Widener', width: 0.5, wet: 1 },

	create(id, data) {
		const toneNode = new StereoWidener({ width: data.width, wet: data.wet });
		_audioNodes.set(id, { kind: 'stereoWidener', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'stereoWidener') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'stereoWidener') return;
		if (update.width !== undefined) e.toneNode.width.value = update.width;
		if (update.wet   !== undefined) e.toneNode.wet.value   = update.wet;
	},
};
