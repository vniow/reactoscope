import { BitCrusher } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { BitCrusherNodeData } from '../dawTypes';

export const bitCrusherHandler: NodeTypeHandler<BitCrusherNodeData> = {
	defaultData: { label: 'Bit Crusher', bits: 4, wet: 1 },

	create(id, data) {
		const toneNode = new BitCrusher(data.bits);
		toneNode.wet.value = data.wet;
		_audioNodes.set(id, { kind: 'bitCrusher', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'bitCrusher') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'bitCrusher') return;
		if (update.bits !== undefined) e.toneNode.bits.value = Math.round(update.bits);
		if (update.wet  !== undefined) e.toneNode.wet.value  = update.wet;
	},
};
