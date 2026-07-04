import { FMOscillator } from 'tone';
import { start as toneStart } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { FMOscillatorNodeData, OscType } from '../dawTypes';

export const fmOscillatorHandler: NodeTypeHandler<FMOscillatorNodeData> = {
	defaultData: { label: 'FM Oscillator', frequency: 440, type: 'sine', modulationType: 'square', modulationIndex: 10, harmonicity: 3, detune: 0, phase: 0 },

	create(id, data) {
		const toneNode = new FMOscillator({
			frequency:       data.frequency       ?? 440,
			type:            data.type            ?? 'sine',
			modulationType:  data.modulationType  ?? 'square',
			modulationIndex: data.modulationIndex ?? 10,
			harmonicity:     data.harmonicity     ?? 3,
			detune:          data.detune          ?? 0,
			phase:           data.phase           ?? 0,
		});
		_audioNodes.set(id, { kind: 'fmOscillator', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'fmOscillator') return;
		if (e.toneNode.state === 'started') e.toneNode.stop();
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'fmOscillator') return;
		if (update.frequency       !== undefined) e.toneNode.frequency.value       = update.frequency;
		if (update.type            !== undefined) e.toneNode.type                  = update.type;
		if (update.modulationType  !== undefined) e.toneNode.modulationType        = update.modulationType;
		if (update.modulationIndex !== undefined) e.toneNode.modulationIndex.value = update.modulationIndex;
		if (update.harmonicity     !== undefined) e.toneNode.harmonicity.value     = update.harmonicity;
		if (update.detune          !== undefined) e.toneNode.detune.value          = update.detune;
		if (update.phase           !== undefined) e.toneNode.phase                 = update.phase;
	},

	async start(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'fmOscillator') return false;

		await toneStart();

		let recreated = false;
		if (e.toneNode.state === 'stopped') {
			const frequency       = e.toneNode.frequency.value as number;
			const type            = e.toneNode.type as OscType;
			const modulationType  = e.toneNode.modulationType as OscType;
			const modulationIndex = e.toneNode.modulationIndex.value as number;
			const harmonicity     = e.toneNode.harmonicity.value as number;
			const detune          = e.toneNode.detune.value as number;
			const phase           = e.toneNode.phase;
			e.toneNode.dispose();
			e.toneNode = new FMOscillator({ frequency, type, modulationType, modulationIndex, harmonicity, detune, phase });
			recreated = true;
		}

		if (e.toneNode.state !== 'started') e.toneNode.start();
		return recreated;
	},

	stop(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'fmOscillator') return;
		if (e.toneNode.state === 'started') e.toneNode.stop();
	},
};
