import { Compressor } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { CompressorNodeData } from '../../store/dawTypes';

export const compressorHandler: NodeTypeHandler<CompressorNodeData> = {
	defaultData: { label: 'Compressor', threshold: -24, ratio: 12, attack: 0.003, release: 0.25, knee: 30 },

	create(id, data) {
		const toneNode = new Compressor({
			threshold: data.threshold,
			ratio:     data.ratio,
			attack:    data.attack,
			release:   data.release,
			knee:      data.knee,
		});
		_audioNodes.set(id, { kind: 'compressor', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'compressor') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'compressor') return;
		if (update.threshold !== undefined) e.toneNode.threshold.value = update.threshold;
		if (update.ratio     !== undefined) e.toneNode.ratio.value     = update.ratio;
		if (update.attack    !== undefined) e.toneNode.attack.value    = update.attack;
		if (update.release   !== undefined) e.toneNode.release.value   = update.release;
		if (update.knee      !== undefined) e.toneNode.knee.value      = update.knee;
	},
};
