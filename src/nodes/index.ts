import type { NodeTypes } from '@xyflow/react';

import { DebugNode } from './DebugNode';
import { OscillatorNode } from './OscillatorNode';
import { GainNode } from './GainNode';
import { VisualizerNode } from './VisualizerNode';
import { DestinationNode } from './DestinationNode';
import { NoiseWorkletNode } from './NoiseWorkletNode';
import { ThreeFiberDemoNode } from './ThreeFiberDemoNode';

import type { AppNode } from './types';

export const initialNodes: AppNode[] = [
	// Start with no initial nodes - users can add nodes as needed
	// This prevents handle ID conflicts and other initialization issues
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
