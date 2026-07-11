import { LFO } from 'tone';
import { makeSingleUseSourceHandler } from './singleUseSource';
import type { LFONodeData } from '../dawTypes';

export const lfoHandler = makeSingleUseSourceHandler<LFONodeData, LFO>({
	kind: 'lfo',
	defaultData: { label: 'LFO', frequency: 1, type: 'sine', min: -1, max: 1, phase: 0 },
	createTone: d => new LFO({ frequency: d.frequency, type: d.type, min: d.min, max: d.max, phase: d.phase }),
	params: {
		frequency: 'frequency.value',
		type:      'type',
		min:       { path: 'min', guard: (node, v) => (v as number) < node.max },
		max:       { path: 'max', guard: (node, v) => (v as number) > node.min },
		phase:     'phase',
	},
});
