import type { NodeTypes } from '@xyflow/react';

import { DebugNode } from './DebugNode';
import { OscillatorNode } from './OscillatorNode';
import { GainNode } from './GainNode';
import { VisualizerNode } from './VisualizerNode';
import { DestinationNode } from './DestinationNode';
import { NoiseWorkletNode } from './NoiseWorkletNode';
import { ThreeFiberDemoNode } from './ThreeFiberDemoNode';

import { GRID_UNIT } from '../config/grid';

import type { AppNode } from './types';

export const initialNodes: AppNode[] = [
	// Oscillator Node - Audio source
	{
		id: 'osc-1',
		type: 'oscillator',
		position: { x: GRID_UNIT * 2, y: GRID_UNIT * 4 },
		data: {
			label: 'Sine Oscillator',
			id: 'osc-1',
			type: 'oscillator' as const,
			variant: 'source', // Add variant for green color
			params: {
				frequency: 440,
				detune: 0,
				waveType: 'sine' as const,
				isPlaying: false,
			},
		},
	} as AppNode,

	// Gain Node - Volume control
	{
		id: 'gain-1',
		type: 'gain',
		position: { x: GRID_UNIT * 12, y: GRID_UNIT * 4 },
		data: {
			label: 'Volume',
			id: 'gain-1',
			type: 'gain' as const,
			variant: 'event', // Add variant for pastel yellow color
			params: {
				gain: 0.5,
				mute: false,
			},
		},
	} as AppNode,

	// Destination Node - Audio output
	{
		id: 'dest-1',
		type: 'destination',
		position: { x: GRID_UNIT * 22, y: GRID_UNIT * 4 },
		data: {
			label: 'Speakers',
		},
	} as AppNode,

	// Three.js Demo Node - Testing worklet integration
	{
		id: 'threejs-1',
		type: 'threejs-demo',
		position: { x: GRID_UNIT * 2, y: GRID_UNIT * 12 },
		data: {
			label: '3D Audio Box',
			variant: 'component',
		},
	} as AppNode,
];

export const nodeTypes = {
	debug: DebugNode,
	oscillator: OscillatorNode,
	gain: GainNode,
	visualizer: VisualizerNode,
	destination: DestinationNode,
	'noise-worklet': NoiseWorkletNode,
	'threejs-demo': ThreeFiberDemoNode,
	// Add any of your custom nodes here!
} as NodeTypes;
