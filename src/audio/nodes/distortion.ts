import { Distortion } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { DistortionNodeData } from '../../store/dawTypes';

export const distortionHandler: NodeTypeHandler<DistortionNodeData> = {
	defaultData: { label: 'Distortion', distortion: 0.4, oversample: 'none', wet: 1 },

	create(id, data) {
		const toneNode = new Distortion({ distortion: data.distortion, oversample: data.oversample, wet: data.wet });
		_audioNodes.set(id, { kind: 'distortion', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'distortion') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'distortion') return;
		if (update.distortion !== undefined) e.toneNode.distortion = update.distortion;
		if (update.oversample !== undefined) e.toneNode.oversample = update.oversample;
		if (update.wet        !== undefined) e.toneNode.wet.value  = update.wet;
	},
};
