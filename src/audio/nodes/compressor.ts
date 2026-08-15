import { Compressor } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { CompressorNodeData, CompressorBandData } from '../../store/dawTypes';

/** Applies a partial band update to a real Compressor instance — shared with MidSideCompressor/MultibandCompressor, whose `mid`/`side`/`low`/`high` bands are each a full Compressor instance too. */
export function applyCompressorBand(node: Compressor, update: Partial<CompressorBandData>): void {
	if (update.threshold !== undefined) node.threshold.value = update.threshold;
	if (update.ratio     !== undefined) node.ratio.value     = update.ratio;
	if (update.attack    !== undefined) node.attack.value    = update.attack;
	if (update.release   !== undefined) node.release.value   = update.release;
	if (update.knee      !== undefined) node.knee.value      = update.knee;
}

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
		applyCompressorBand(e.toneNode, update);
	},
};
