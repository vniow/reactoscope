import { Tremolo } from 'tone';
import { start as toneStart } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { TremoloNodeData } from '../../store/dawTypes';

export const tremoloHandler: NodeTypeHandler<TremoloNodeData> = {
	defaultData: { label: 'Tremolo', frequency: 10, depth: 0.5, wet: 0.5 },

	create(id, data) {
		const toneNode = new Tremolo({ frequency: data.frequency, depth: data.depth, wet: data.wet });
		_audioNodes.set(id, { kind: 'tremolo', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'tremolo') return;
		try { e.toneNode.stop(); } catch {}
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'tremolo') return;
		if (update.frequency !== undefined) e.toneNode.frequency.value = update.frequency;
		if (update.depth     !== undefined) e.toneNode.depth.value     = update.depth;
		if (update.wet       !== undefined) e.toneNode.wet.value       = update.wet;
	},

	async start(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'tremolo') return false;
		await toneStart();
		e.toneNode.start();
		return false;
	},

	stop(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'tremolo') return;
		e.toneNode.stop();
	},
};
