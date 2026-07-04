import { PulseOscillator } from 'tone';
import { start as toneStart } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { PulseOscillatorNodeData } from '../dawTypes';

export const pulseOscillatorHandler: NodeTypeHandler<PulseOscillatorNodeData> = {
	defaultData: { label: 'Pulse Oscillator', frequency: 440, width: 0.5, detune: 0, phase: 0 },

	create(id, data) {
		const toneNode = new PulseOscillator({
			frequency: data.frequency ?? 440,
			width:     data.width     ?? 0.5,
			detune:    data.detune    ?? 0,
			phase:     data.phase     ?? 0,
		});
		_audioNodes.set(id, { kind: 'pulseOscillator', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'pulseOscillator') return;
		if (e.toneNode.state === 'started') e.toneNode.stop();
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'pulseOscillator') return;
		if (update.frequency !== undefined) e.toneNode.frequency.value = update.frequency;
		if (update.width     !== undefined) e.toneNode.width.value     = update.width;
		if (update.detune    !== undefined) e.toneNode.detune.value    = update.detune;
		if (update.phase     !== undefined) e.toneNode.phase           = update.phase;
	},

	async start(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'pulseOscillator') return false;

		await toneStart();

		let recreated = false;
		if (e.toneNode.state === 'stopped') {
			const frequency = e.toneNode.frequency.value as number;
			const width     = e.toneNode.width.value as number;
			const detune    = e.toneNode.detune.value as number;
			const phase     = e.toneNode.phase;
			e.toneNode.dispose();
			e.toneNode = new PulseOscillator({ frequency, width, detune, phase });
			recreated = true;
		}

		if (e.toneNode.state !== 'started') e.toneNode.start();
		return recreated;
	},

	stop(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'pulseOscillator') return;
		if (e.toneNode.state === 'started') e.toneNode.stop();
	},
};
