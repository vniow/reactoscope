import { Oscillator } from 'tone';
import { makeSingleUseSourceHandler } from './singleUseSource';
import type { OscillatorNodeData } from '../../store/dawTypes';

export const oscillatorHandler = makeSingleUseSourceHandler<OscillatorNodeData, Oscillator>({
	kind: 'oscillator',
	defaultData: { label: 'Oscillator', frequency: 440, type: 'sine', detune: 0, phase: 0 },
	createTone: d => new Oscillator({ frequency: d.frequency, type: d.type, detune: d.detune, phase: d.phase }),
	params: {
		frequency: 'frequency.value',
		type:      'type',
		detune:    'detune.value',
		phase:     'phase',
	},
});
