import type { NodeTypes } from '@xyflow/react';

import { DebugNode } from './DebugNode';
import { OscillatorNode } from './OscillatorNode';
import { GainNode } from './GainNode';
import { VisualizerNode } from './VisualizerNode';
import { VisualizerNodeModular } from './VisualizerNodeModular';
import { DestinationNode } from './DestinationNode';
import { NoiseWorkletNode } from './NoiseWorkletNode';
import { SimpleNoiseWorkletNode } from './SimpleNoiseWorkletNode';
import { ThreeWorkletNode } from './ThreeWorkletNode';
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
	'visualizer-modular': VisualizerNodeModular,
	destination: DestinationNode,
	'noise-worklet': NoiseWorkletNode,
	'simple-noise-worklet': SimpleNoiseWorkletNode,
	'three-worklet': ThreeWorkletNode,
	'threejs-demo': ThreeFiberDemoNode,
	// Add any of your custom nodes here!
} as NodeTypes;
