import { Delay, Gain } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { DelayNodeData } from '../dawTypes';

export const delayHandler: NodeTypeHandler<DelayNodeData> = {
	defaultData: { label: 'Delay', delayTime: 0.25, wet: 1 },

	create(id, data) {
		const wet      = data.wet ?? 1;
		const _delay   = new Delay(data.delayTime);
		const _dryGain = new Gain(1 - wet);
		const _wetGain = new Gain(wet);
		const input    = new Gain(1);
		const output   = new Gain(1);
		input.connect(_dryGain);
		input.connect(_delay);
		_delay.connect(_wetGain);
		_dryGain.connect(output);
		_wetGain.connect(output);
		_audioNodes.set(id, { kind: 'delay', toneNode: { input, output }, _delay, _dryGain, _wetGain });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'delay') return;
		e.toneNode.input.dispose();
		e.toneNode.output.dispose();
		e._delay.dispose();
		e._dryGain.dispose();
		e._wetGain.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'delay') return;
		if (update.delayTime !== undefined) e._delay.delayTime.value = update.delayTime;
		if (update.wet       !== undefined) {
			e._wetGain.gain.value = update.wet;
			e._dryGain.gain.value = 1 - update.wet;
		}
	},
};
