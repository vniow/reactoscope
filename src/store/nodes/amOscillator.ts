import { AMOscillator } from 'tone';
import { start as toneStart } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { AMOscillatorNodeData, OscType } from '../dawTypes';

export const amOscillatorHandler: NodeTypeHandler<AMOscillatorNodeData> = {
	defaultData: { label: 'AM Oscillator', frequency: 440, type: 'sine', modulationType: 'square', harmonicity: 3, detune: 0, phase: 0 },

	create(id, data) {
		const toneNode = new AMOscillator({
			frequency:      data.frequency      ?? 440,
			type:           data.type           ?? 'sine',
			modulationType: data.modulationType ?? 'square',
			harmonicity:    data.harmonicity    ?? 3,
			detune:         data.detune         ?? 0,
			phase:          data.phase          ?? 0,
		});
		_audioNodes.set(id, { kind: 'amOscillator', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'amOscillator') return;
		if (e.toneNode.state === 'started') e.toneNode.stop();
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'amOscillator') return;
		if (update.frequency      !== undefined) e.toneNode.frequency.value    = update.frequency;
		if (update.type           !== undefined) e.toneNode.type               = update.type;
		if (update.modulationType !== undefined) e.toneNode.modulationType     = update.modulationType;
		if (update.harmonicity    !== undefined) e.toneNode.harmonicity.value  = update.harmonicity;
		if (update.detune         !== undefined) e.toneNode.detune.value       = update.detune;
		if (update.phase          !== undefined) e.toneNode.phase              = update.phase;
	},

	async start(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'amOscillator') return false;

		await toneStart();

		let recreated = false;
		if (e.toneNode.state === 'stopped') {
			const frequency      = e.toneNode.frequency.value as number;
			const type           = e.toneNode.type as OscType;
			const modulationType = e.toneNode.modulationType as OscType;
			const harmonicity    = e.toneNode.harmonicity.value as number;
			const detune         = e.toneNode.detune.value as number;
			const phase          = e.toneNode.phase;
			e.toneNode.dispose();
			e.toneNode = new AMOscillator({ frequency, type, modulationType, harmonicity, detune, phase });
			recreated = true;
		}

		if (e.toneNode.state !== 'started') e.toneNode.start();
		return recreated;
	},

	stop(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'amOscillator') return;
		if (e.toneNode.state === 'started') e.toneNode.stop();
	},
};
