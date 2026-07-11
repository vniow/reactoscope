import { PWMOscillator } from 'tone';
import { makeSingleUseSourceHandler } from './singleUseSource';
import type { PWMOscillatorNodeData } from '../../store/dawTypes';

export const pwmOscillatorHandler = makeSingleUseSourceHandler<PWMOscillatorNodeData, PWMOscillator>({
	kind: 'pwmOscillator',
	defaultData: { label: 'PWM Oscillator', frequency: 440, modulationFrequency: 0.4, detune: 0, phase: 0 },
	createTone: d => new PWMOscillator({ frequency: d.frequency, modulationFrequency: d.modulationFrequency, detune: d.detune, phase: d.phase }),
	params: {
		frequency:           'frequency.value',
		modulationFrequency: 'modulationFrequency.value',
		detune:              'detune.value',
		phase:               'phase',
	},
});
