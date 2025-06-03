import type { NodeTypes } from '@xyflow/react';

import { DebugNode } from './DebugNode';
import { OscillatorNode } from './OscillatorNode';
import { GainNode } from './GainNode';
import { VisualizerNode } from './VisualizerNode';
import { DestinationNode } from './DestinationNode';

import type { AppNode } from './types';

export const initialNodes: AppNode[] = [
	// Empty initial nodes - nodes can be added via the NodeAddPanel
];

export const nodeTypes = {
	debug: DebugNode,
	oscillator: OscillatorNode,
	gain: GainNode,
	visualizer: VisualizerNode,
	destination: DestinationNode,
	// Add any of your custom nodes here!
} as NodeTypes;
