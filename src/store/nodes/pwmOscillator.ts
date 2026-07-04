import { PWMOscillator } from 'tone';
import { start as toneStart } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { PWMOscillatorNodeData } from '../dawTypes';

export const pwmOscillatorHandler: NodeTypeHandler<PWMOscillatorNodeData> = {
	defaultData: { label: 'PWM Oscillator', frequency: 440, modulationFrequency: 0.4, detune: 0, phase: 0 },

	create(id, data) {
		const toneNode = new PWMOscillator({
			frequency:           data.frequency           ?? 440,
			modulationFrequency: data.modulationFrequency ?? 0.4,
			detune:              data.detune              ?? 0,
			phase:               data.phase               ?? 0,
		});
		_audioNodes.set(id, { kind: 'pwmOscillator', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'pwmOscillator') return;
		if (e.toneNode.state === 'started') e.toneNode.stop();
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'pwmOscillator') return;
		if (update.frequency           !== undefined) e.toneNode.frequency.value           = update.frequency;
		if (update.modulationFrequency !== undefined) e.toneNode.modulationFrequency.value = update.modulationFrequency;
		if (update.detune              !== undefined) e.toneNode.detune.value              = update.detune;
		if (update.phase               !== undefined) e.toneNode.phase                     = update.phase;
	},

	async start(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'pwmOscillator') return false;

		await toneStart();

		let recreated = false;
		if (e.toneNode.state === 'stopped') {
			const frequency           = e.toneNode.frequency.value as number;
			const modulationFrequency = e.toneNode.modulationFrequency.value as number;
			const detune              = e.toneNode.detune.value as number;
			const phase               = e.toneNode.phase;
			e.toneNode.dispose();
			e.toneNode = new PWMOscillator({ frequency, modulationFrequency, detune, phase });
			recreated = true;
		}

		if (e.toneNode.state !== 'started') e.toneNode.start();
		return recreated;
	},

	stop(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'pwmOscillator') return;
		if (e.toneNode.state === 'started') e.toneNode.stop();
	},
};
