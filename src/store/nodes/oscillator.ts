import { Oscillator } from 'tone';
import { start as toneStart } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { OscillatorNodeData } from '../dawTypes';

// Tone.Oscillator is single-use: cannot restart after stop(). Recreate the node
// and return true so the coordinator calls reconnectSourceEdges.

export const oscillatorHandler: NodeTypeHandler<OscillatorNodeData> = {
	defaultData: { label: 'Oscillator', frequency: 440, type: 'sine', detune: 0, phase: 0 },

	create(id, data) {
		const toneNode = new Oscillator(data.frequency ?? 440, data.type ?? 'sine');
		toneNode.detune.value = data.detune ?? 0;
		toneNode.phase        = data.phase  ?? 0;
		_audioNodes.set(id, { kind: 'oscillator', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'oscillator') return;
		if (e.toneNode.state === 'started') e.toneNode.stop();
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'oscillator') return;
		if (update.frequency !== undefined) e.toneNode.frequency.value = update.frequency;
		if (update.type      !== undefined) e.toneNode.type            = update.type;
		if (update.detune    !== undefined) e.toneNode.detune.value    = update.detune;
		if (update.phase     !== undefined) e.toneNode.phase           = update.phase;
	},

	async start(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'oscillator') return false;

		await toneStart();

		let recreated = false;
		if (e.toneNode.state === 'stopped') {
			const freq   = e.toneNode.frequency.value as number;
			const type   = e.toneNode.type;
			const detune = e.toneNode.detune.value as number;
			const phase  = e.toneNode.phase;
			e.toneNode.dispose();
			e.toneNode = new Oscillator(freq, type);
			e.toneNode.detune.value = detune;
			e.toneNode.phase        = phase;
			recreated = true;
		}

		if (e.toneNode.state !== 'started') e.toneNode.start();
		return recreated;
	},

	stop(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'oscillator') return;
		if (e.toneNode.state === 'started') e.toneNode.stop();
	},
};
