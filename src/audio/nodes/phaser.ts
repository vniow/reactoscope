import { Phaser } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { PhaserNodeData } from '../../store/dawTypes';

export const phaserHandler: NodeTypeHandler<PhaserNodeData> = {
	defaultData: { label: 'Phaser', frequency: 0.5, octaves: 3, baseFrequency: 350, wet: 0.5 },

	create(id, data) {
		// Phaser starts its internal LFOs automatically in the constructor.
		const toneNode = new Phaser({ frequency: data.frequency, octaves: data.octaves, baseFrequency: data.baseFrequency, wet: data.wet });
		_audioNodes.set(id, { kind: 'phaser', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'phaser') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'phaser') return;
		if (update.frequency     !== undefined) e.toneNode.frequency.value = update.frequency;
		if (update.octaves       !== undefined) e.toneNode.octaves         = update.octaves;
		if (update.baseFrequency !== undefined) e.toneNode.baseFrequency   = update.baseFrequency;
		if (update.wet           !== undefined) e.toneNode.wet.value       = update.wet;
	},
};
