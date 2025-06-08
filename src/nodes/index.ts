import type { NodeTypes } from '@xyflow/react';

import { DebugNode } from './DebugNode';
import { PositionLoggerNode } from './PositionLoggerNode';
import { StaticNode } from './StaticNode';
import { OscillatorNode } from './OscillatorNode';
import { GainNode } from './GainNode';
import { VisualizerNode } from './VisualizerNode';
import { DestinationNode } from './DestinationNode';

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
			params: {
				frequency: 440,
				detune: 0,
				waveType: 'sine' as const,
				isPlaying: false,
				volume: -20, // -20 dB for safe listening level
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
];

export const nodeTypes = {
	debug: DebugNode,
	'position-logger': PositionLoggerNode,
	static: StaticNode,
	oscillator: OscillatorNode,
	gain: GainNode,
	visualizer: VisualizerNode,
	destination: DestinationNode,
	// Add any of your custom nodes here!
} as NodeTypes;
