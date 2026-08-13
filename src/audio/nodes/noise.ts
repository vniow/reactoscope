import { Noise } from 'tone';
import { makeSingleUseSourceHandler } from './singleUseSource';
import type { NoiseNodeData } from '../../store/dawTypes';

export const noiseHandler = makeSingleUseSourceHandler<NoiseNodeData, Noise>({
	kind: 'noise',
	defaultData: { label: 'Noise', noiseType: 'white', volume: -6 },
	createTone: d => new Noise({ type: d.noiseType, volume: d.volume }),
	params: {
		noiseType: 'type',
		volume:    'volume.value',
	},
});
