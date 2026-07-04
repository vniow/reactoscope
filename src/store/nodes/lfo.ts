import { LFO } from 'tone';
import { start as toneStart } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { LFONodeData } from '../dawTypes';

// LFO is single-use: cannot restart after stop(). Recreate and return true.

export const lfoHandler: NodeTypeHandler<LFONodeData> = {
	defaultData: { label: 'LFO', frequency: 1, type: 'sine', min: -1, max: 1, phase: 0 },

	create(id, data) {
		const toneNode = new LFO({
			frequency: data.frequency ?? 1,
			type:      data.type      ?? 'sine',
			min:       data.min       ?? -1,
			max:       data.max       ?? 1,
		});
		if (data.phase) toneNode.phase = data.phase;
		_audioNodes.set(id, { kind: 'lfo', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'lfo') return;
		if (e.toneNode.state === 'started') e.toneNode.stop();
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'lfo') return;
		if (update.frequency !== undefined) e.toneNode.frequency.value = update.frequency;
		if (update.type      !== undefined) e.toneNode.type            = update.type;
		if (update.min       !== undefined && update.min < e.toneNode.max) e.toneNode.min = update.min;
		if (update.max       !== undefined && update.max > e.toneNode.min) e.toneNode.max = update.max;
		if (update.phase     !== undefined) e.toneNode.phase           = update.phase;
	},

	async start(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'lfo') return false;

		await toneStart();

		let recreated = false;
		if (e.toneNode.state === 'stopped') {
			const frequency = e.toneNode.frequency.value as number;
			const type      = e.toneNode.type;
			const min       = e.toneNode.min;
			const max       = e.toneNode.max;
			const phase     = e.toneNode.phase;
			e.toneNode.dispose();
			e.toneNode = new LFO({ frequency, type, min, max, phase });
			recreated = true;
		}

		if (e.toneNode.state !== 'started') e.toneNode.start();
		return recreated;
	},

	stop(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'lfo') return;
		if (e.toneNode.state === 'started') e.toneNode.stop();
	},
};
