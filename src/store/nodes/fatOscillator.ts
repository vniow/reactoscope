import { FatOscillator } from 'tone';
import { makeSingleUseSourceHandler } from './singleUseSource';
import type { FatOscillatorNodeData } from '../dawTypes';

export const fatOscillatorHandler = makeSingleUseSourceHandler<FatOscillatorNodeData, FatOscillator>({
	kind: 'fatOscillator',
	defaultData: { label: 'Fat Oscillator', frequency: 440, type: 'sawtooth', count: 3, spread: 20, detune: 0, phase: 0 },
	createTone: d => new FatOscillator({
		frequency: d.frequency,
		type:      d.type,
		count:     d.count,
		spread:    d.spread,
		detune:    d.detune,
		phase:     d.phase,
	}),
	params: {
		frequency: 'frequency.value',
		type:      'type',
		count:     { path: 'count', coerce: v => Math.round(v as number) },
		spread:    'spread',
		detune:    'detune.value',
		phase:     'phase',
	},
});
