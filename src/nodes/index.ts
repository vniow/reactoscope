/**
 * Node Registry and Type Definitions
 *
 * This module serves as the central registry for all node types in the Reactoscope application.
 * It exports the node type mappings used by React Flow and manages initial node configurations.
 *
 * @module nodes
 */

// External library imports
import type { NodeTypes } from '@xyflow/react';

// Internal node component imports
import { DebugNode } from './DebugNode';
import { DynamicSourceNode } from './source/DynamicSourceNode';
import { DestinationNode } from './core/DestinationNode';
import { DynamicEffectNode } from './effect/DynamicEffectNode';
import { DynamicComponentNode } from './component/DynamicComponentNode';
import { OscilloscopeNode } from './signal/OscilloscopeNode';

import {
	InstrumentNodeComponent,
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

	// Dynamic routing nodes for each variant
	core: DestinationNode,
	source: DynamicSourceNode,
	instrument: InstrumentNodeComponent,
	effect: DynamicEffectNode,
	component: DynamicComponentNode,
	signal: OscilloscopeNode,
	event: EventNodeComponent,
	unit: UtilityNodeComponent,

	// Add any custom nodes here following the same pattern
} as NodeTypes;
