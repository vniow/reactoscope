import { WaveShaper } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { WaveShaperNodeData, WaveShaperPreset } from '../../store/dawTypes';

// Named curves standing in for a real curve editor (docs/adr/0005-waveshaper-preset-driven.md).
const PRESET_MAPPINGS: Record<WaveShaperPreset, (value: number) => number> = {
	identity: value => value,
	softClip: value => Math.tanh(value * 2),
	hardClip: value => Math.max(-1, Math.min(1, value * 3)),
};

export const waveShaperHandler: NodeTypeHandler<WaveShaperNodeData> = {
	defaultData: { label: 'WaveShaper', preset: 'identity', oversample: 'none' },

	create(id, data) {
		const toneNode = new WaveShaper(PRESET_MAPPINGS[data.preset], 1024);
		toneNode.oversample = data.oversample;
		_audioNodes.set(id, { kind: 'waveShaper', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'waveShaper') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'waveShaper') return;
		if (update.preset     !== undefined) e.toneNode.setMap(PRESET_MAPPINGS[update.preset]);
		if (update.oversample !== undefined) e.toneNode.oversample = update.oversample;
	},
};
