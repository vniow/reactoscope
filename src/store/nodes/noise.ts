import { Noise } from 'tone';
import { start as toneStart } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { NoiseNodeData } from '../dawTypes';

// Tone.Noise is single-use: cannot restart after stop(). Recreate and return true.

export const noiseHandler: NodeTypeHandler<NoiseNodeData> = {
	defaultData: { label: 'Noise', noiseType: 'white', volume: -6 },

	create(id, data) {
		const toneNode = new Noise(data.noiseType ?? 'white');
		toneNode.volume.value = data.volume ?? -6;
		_audioNodes.set(id, { kind: 'noise', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'noise') return;
		if (e.toneNode.state === 'started') e.toneNode.stop();
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'noise') return;
		if (update.noiseType !== undefined) e.toneNode.type         = update.noiseType;
		if (update.volume    !== undefined) e.toneNode.volume.value = update.volume;
	},

	async start(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'noise') return false;

		await toneStart();

		let recreated = false;
		if (e.toneNode.state === 'stopped') {
			const vol  = e.toneNode.volume.value;
			const type = e.toneNode.type;
			e.toneNode.dispose();
			e.toneNode = new Noise(type);
			e.toneNode.volume.value = vol;
			recreated = true;
		}

		if (e.toneNode.state !== 'started') e.toneNode.start();
		return recreated;
	},

	stop(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'noise') return;
		if (e.toneNode.state === 'started') e.toneNode.stop();
	},
};
