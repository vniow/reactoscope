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

import {
	CoreNodeComponent,
	SourceNodeComponent,
	InstrumentNodeComponent,
	EffectNodeComponent,
	ComponentNodeComponent,
	SignalNodeComponent,
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

	// Placeholder nodes for each variant
	core: CoreNodeComponent,
	source: SourceNodeComponent,
	instrument: InstrumentNodeComponent,
	effect: EffectNodeComponent,
	component: ComponentNodeComponent,
	signal: SignalNodeComponent,
	event: EventNodeComponent,
	unit: UtilityNodeComponent,

	// Add any custom nodes here following the same pattern
} as NodeTypes;
