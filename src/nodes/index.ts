import type { NodeTypes } from '@xyflow/react';

import { PositionLoggerNode } from './PositionLoggerNode';
import { ThemeDebugNode } from './ThemeDebugNode';
import { OscillatorNode } from './OscillatorNode';
import { GainNode } from './GainNode';
import { VisualizerNode } from './VisualizerNode';
import { DestinationNode } from './DestinationNode';
import type { AppNode } from './types';

export const initialNodes: AppNode[] = [];

export const nodeTypes = {
	'position-logger': PositionLoggerNode,
	'theme-debug': ThemeDebugNode,
	oscillator: OscillatorNode,
	gain: GainNode,
	visualizer: VisualizerNode,
	destination: DestinationNode,
	// Add any of your custom nodes here!
} satisfies NodeTypes;
