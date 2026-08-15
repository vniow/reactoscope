import { MultibandCompressor } from 'tone';
import { _audioNodes } from '../audioCore';
import { applyCompressorBand } from './compressor';
import type { NodeTypeHandler } from './nodeHandler';
import type { MultibandCompressorNodeData } from '../../store/dawTypes';

const DEFAULT_BAND = { threshold: -24, ratio: 12, attack: 0.003, release: 0.25, knee: 30 };

export const multibandCompressorHandler: NodeTypeHandler<MultibandCompressorNodeData> = {
	defaultData: {
		label:         'MultibandCompressor',
		lowFrequency:  250,
		highFrequency: 2000,
		low:           DEFAULT_BAND,
		mid:           DEFAULT_BAND,
		high:          DEFAULT_BAND,
	},

	create(id, data) {
		const toneNode = new MultibandCompressor({
			lowFrequency:  data.lowFrequency,
			highFrequency: data.highFrequency,
			low:           data.low,
			mid:           data.mid,
			high:          data.high,
		});
		_audioNodes.set(id, { kind: 'multibandCompressor', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'multibandCompressor') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'multibandCompressor') return;
		if (update.lowFrequency  !== undefined) e.toneNode.lowFrequency.value  = update.lowFrequency;
		if (update.highFrequency !== undefined) e.toneNode.highFrequency.value = update.highFrequency;
		if (update.low)  applyCompressorBand(e.toneNode.low,  update.low);
		if (update.mid)  applyCompressorBand(e.toneNode.mid,  update.mid);
		if (update.high) applyCompressorBand(e.toneNode.high, update.high);
	},
};
