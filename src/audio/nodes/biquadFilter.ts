import { BiquadFilter } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { BiquadFilterNodeData } from '../../store/dawTypes';

export const biquadFilterHandler: NodeTypeHandler<BiquadFilterNodeData> = {
	defaultData: { label: 'BiquadFilter', frequency: 350, type: 'lowpass', Q: 1, detune: 0, gain: 0 },

	create(id, data) {
		const toneNode = new BiquadFilter({
			frequency: data.frequency,
			type:      data.type,
			Q:         data.Q,
			detune:    data.detune,
			gain:      data.gain,
		});
		_audioNodes.set(id, { kind: 'biquadFilter', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'biquadFilter') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'biquadFilter') return;
		if (update.frequency !== undefined) e.toneNode.frequency.value = update.frequency;
		if (update.detune    !== undefined) e.toneNode.detune.value    = update.detune;
		if (update.Q         !== undefined) e.toneNode.Q.value         = update.Q;
		if (update.gain      !== undefined) e.toneNode.gain.value      = update.gain;
		if (update.type      !== undefined) e.toneNode.type            = update.type;
	},
};
