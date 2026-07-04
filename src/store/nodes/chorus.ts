import { Chorus } from 'tone';
import { start as toneStart } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { ChorusNodeData } from '../dawTypes';

export const chorusHandler: NodeTypeHandler<ChorusNodeData> = {
	defaultData: { label: 'Chorus', frequency: 1.5, delayTime: 3.5, depth: 0.7, wet: 0.5 },

	create(id, data) {
		const toneNode = new Chorus({ frequency: data.frequency, delayTime: data.delayTime, depth: data.depth, wet: data.wet });
		_audioNodes.set(id, { kind: 'chorus', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'chorus') return;
		try { e.toneNode.stop(); } catch {}
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'chorus') return;
		if (update.frequency !== undefined) e.toneNode.frequency.value = update.frequency;
		if (update.delayTime !== undefined) e.toneNode.delayTime        = update.delayTime;
		if (update.depth     !== undefined) e.toneNode.depth            = update.depth;
		if (update.wet       !== undefined) e.toneNode.wet.value        = update.wet;
	},

	async start(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'chorus') return false;
		await toneStart();
		e.toneNode.start();
		return false;
	},

	stop(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'chorus') return;
		e.toneNode.stop();
	},
};
