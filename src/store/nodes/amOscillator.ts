import { AMOscillator } from 'tone';
import { makeSingleUseSourceHandler } from './singleUseSource';
import type { AMOscillatorNodeData } from '../dawTypes';

export const amOscillatorHandler = makeSingleUseSourceHandler<AMOscillatorNodeData, AMOscillator>({
	kind: 'amOscillator',
	defaultData: { label: 'AM Oscillator', frequency: 440, type: 'sine', modulationType: 'square', harmonicity: 3, detune: 0, phase: 0 },
	createTone: d => new AMOscillator({
		frequency:      d.frequency,
		type:           d.type,
		modulationType: d.modulationType,
		harmonicity:    d.harmonicity,
		detune:         d.detune,
		phase:          d.phase,
	}),
	params: {
		frequency:      'frequency.value',
		type:           'type',
		modulationType: 'modulationType',
		harmonicity:    'harmonicity.value',
		detune:         'detune.value',
		phase:          'phase',
	},
});
