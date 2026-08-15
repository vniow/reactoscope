import { PanVol } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { PanVolNodeData } from '../../store/dawTypes';

export const panVolHandler: NodeTypeHandler<PanVolNodeData> = {
	defaultData: { label: 'PanVol', pan: 0, volume: 0, mute: false },

	create(id, data) {
		const toneNode = new PanVol(data.pan, data.volume);
		toneNode.mute = data.mute;
		_audioNodes.set(id, { kind: 'panVol', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'panVol') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'panVol') return;
		if (update.pan    !== undefined) e.toneNode.pan.value    = update.pan;
		if (update.volume !== undefined) e.toneNode.volume.value = update.volume;
		if (update.mute   !== undefined) e.toneNode.mute         = update.mute;
	},
};
