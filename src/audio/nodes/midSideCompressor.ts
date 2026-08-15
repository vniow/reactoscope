import { MidSideCompressor } from 'tone';
import { _audioNodes } from '../audioCore';
import { applyCompressorBand } from './compressor';
import type { NodeTypeHandler } from './nodeHandler';
import type { MidSideCompressorNodeData } from '../../store/dawTypes';

const DEFAULT_MID  = { threshold: -24, ratio: 3, attack: 0.02, release: 0.03, knee: 16 };
const DEFAULT_SIDE = { threshold: -30, ratio: 6, attack: 0.03, release: 0.25, knee: 10 };

export const midSideCompressorHandler: NodeTypeHandler<MidSideCompressorNodeData> = {
	defaultData: { label: 'MidSideCompressor', mid: DEFAULT_MID, side: DEFAULT_SIDE },

	create(id, data) {
		const toneNode = new MidSideCompressor({ mid: data.mid, side: data.side });
		_audioNodes.set(id, { kind: 'midSideCompressor', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'midSideCompressor') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'midSideCompressor') return;
		if (update.mid)  applyCompressorBand(e.toneNode.mid,  update.mid);
		if (update.side) applyCompressorBand(e.toneNode.side, update.side);
	},
};
