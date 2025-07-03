/**
 * Node Registry and Type Definitions
 *
 * It exports the node type mappings used by React Flow and manages initial node configurations.
 *
 * @module nodes
 */

// External library imports
import type { NodeTypes } from '@xyflow/react';

// Internal node component imports
import { DebugNode } from './DebugNode';
import { DebugSimpleNode } from '../shared/components/DebugSimpleNode';
import { DestinationNode } from './core/DestinationNode';
import { OscillatorNode } from './source/OscillatorNode';
import { DynamicEffectNode } from './effect/DynamicEffectNode';
import { DynamicComponentNode } from './component/DynamicComponentNode';
import { OscilloscopeNode } from './signal/OscilloscopeNode';
import { Oscilloscope3DNode } from './signal/Oscilloscope3DNode';
import { XYscope3DNode } from './signal/XYscope3DNode';
import { XYRGBScope3DNode } from './signal/XYRGBScope3DNode';
import { XYRGBGeneratorNode } from './source/XYRGBGeneratorNode';

import {
	InstrumentNodeComponent,
	SourceNodeComponent,
	EventNodeComponent,
	UtilityNodeComponent,
} from './PlaceholderNodes';

// Type imports
import type { AppNode } from './types';

/**
 * Initial nodes configuration for the React Flow canvas
 *
 * Currently empty to prevent handle ID conflicts and initialization issues.
 * Users can add nodes dynamically through the UI.
 *
 * @type {AppNode[]}
 */
export const initialNodes: AppNode[] = [
	// Start with no initial nodes - users can add nodes as needed
	// This prevents handle ID conflicts and other initialization issues
];

/**
 * Node type registry for React Flow
 *
 * Maps node type strings to their corresponding React components.
 * This registry is used by React Flow to determine which component
 * to render for each node type.
 *
 * Available node types:
 * - `debug`: Development and debugging utilities
 * - `file-loader`: File loading utilities
 * - Placeholder nodes for each variant: `core`, `source`, `instrument`,
 *   `effect`, `component`, `signal`, `event`, `unit`
 *
 * @type {NodeTypes}
 */
export const nodeTypes = {
	// Core system nodes
	debug: DebugNode,
	'debug-simple': DebugSimpleNode,

	// Dynamic routing nodes for each variant
	core: DestinationNode,
	source: OscillatorNode, // Oscillator is the main source node
	'source-player': SourceNodeComponent, // Placeholder for Audio Player
	'source-microphone': SourceNodeComponent, // Placeholder for Microphone
	instrument: InstrumentNodeComponent,
	effect: DynamicEffectNode,
	component: DynamicComponentNode,
	signal: OscilloscopeNode,
	'signal-3d': Oscilloscope3DNode, // 3D version of oscilloscope
	'signal-xy': XYscope3DNode, // XY Lissajous plot node
	'signal-xyrgb': XYRGBScope3DNode, // 5-channel audio-visual mapping (X,Y,R,G,B)
	'source-xyrgb': XYRGBGeneratorNode, // XYRGB audio generator from 3D scene
	event: EventNodeComponent,
	unit: UtilityNodeComponent,

	// Add any custom nodes here following the same pattern
} as NodeTypes;
