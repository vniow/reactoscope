import { FMOscillator } from 'tone';
import { makeSingleUseSourceHandler } from './singleUseSource';
import type { FMOscillatorNodeData } from '../dawTypes';

export const fmOscillatorHandler = makeSingleUseSourceHandler<FMOscillatorNodeData, FMOscillator>({
	kind: 'fmOscillator',
	defaultData: { label: 'FM Oscillator', frequency: 440, type: 'sine', modulationType: 'square', modulationIndex: 10, harmonicity: 3, detune: 0, phase: 0 },
	createTone: d => new FMOscillator({
		frequency:       d.frequency,
		type:            d.type,
		modulationType:  d.modulationType,
		modulationIndex: d.modulationIndex,
		harmonicity:     d.harmonicity,
		detune:          d.detune,
		phase:           d.phase,
	}),
	params: {
		frequency:       'frequency.value',
		type:            'type',
		modulationType:  'modulationType',
		modulationIndex: 'modulationIndex.value',
		harmonicity:     'harmonicity.value',
		detune:          'detune.value',
		phase:           'phase',
	},
});
