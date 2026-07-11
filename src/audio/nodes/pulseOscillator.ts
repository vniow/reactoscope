import { PulseOscillator } from 'tone';
import { makeSingleUseSourceHandler } from './singleUseSource';
import type { PulseOscillatorNodeData } from '../../store/dawTypes';

export const pulseOscillatorHandler = makeSingleUseSourceHandler<PulseOscillatorNodeData, PulseOscillator>({
	kind: 'pulseOscillator',
	defaultData: { label: 'Pulse Oscillator', frequency: 440, width: 0.5, detune: 0, phase: 0 },
	createTone: d => new PulseOscillator({ frequency: d.frequency, width: d.width, detune: d.detune, phase: d.phase }),
	params: {
		frequency: 'frequency.value',
		width:     'width.value',
		detune:    'detune.value',
		phase:     'phase',
	},
});
