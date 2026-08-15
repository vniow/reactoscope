import { Volume } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { VolumeNodeData } from '../../store/dawTypes';

export const volumeHandler: NodeTypeHandler<VolumeNodeData> = {
	defaultData: { label: 'Volume', volume: 0, mute: false },

	create(id, data) {
		const toneNode = new Volume(data.volume);
		toneNode.mute = data.mute;
		_audioNodes.set(id, { kind: 'volume', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'volume') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'volume') return;
		if (update.volume !== undefined) e.toneNode.volume.value = update.volume;
		if (update.mute   !== undefined) e.toneNode.mute         = update.mute;
	},
};
