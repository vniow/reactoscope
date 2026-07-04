import { AutoFilter } from 'tone';
import { start as toneStart } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { AutoFilterNodeData } from '../dawTypes';

export const autoFilterHandler: NodeTypeHandler<AutoFilterNodeData> = {
	defaultData: { label: 'Auto Filter', frequency: 1, baseFrequency: 200, octaves: 2.6, wet: 1 },

	create(id, data) {
		const toneNode = new AutoFilter({ frequency: data.frequency, baseFrequency: data.baseFrequency, octaves: data.octaves, wet: data.wet });
		_audioNodes.set(id, { kind: 'autoFilter', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'autoFilter') return;
		try { e.toneNode.stop(); } catch {}
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'autoFilter') return;
		if (update.frequency     !== undefined) e.toneNode.frequency.value = update.frequency;
		if (update.baseFrequency !== undefined) e.toneNode.baseFrequency   = update.baseFrequency;
		if (update.octaves       !== undefined) e.toneNode.octaves         = update.octaves;
		if (update.wet           !== undefined) e.toneNode.wet.value       = update.wet;
	},

	async start(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'autoFilter') return false;
		await toneStart();
		e.toneNode.start();
		return false;
	},

	stop(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'autoFilter') return;
		e.toneNode.stop();
	},
};
