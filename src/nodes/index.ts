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
import { OscillatorNode } from './OscillatorNode';
import { GainNode } from './GainNode';
import VisualizerNodeModular from './VisualizerNodeModular';
import { DestinationNode } from './DestinationNode';
import { NoiseWorkletNode } from './NoiseWorkletNode';
import { ThreeWorkletNode } from './ThreeWorkletNode';
import { VertexSonifierNode } from './VertexSonifierNode';

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
 * - `oscillator`: Audio oscillator generators
 * - `gain`: Audio gain/volume controls
 * - `visualizer`: Standard audio visualizer
 * - `visualizer-modular`: Modular dual-channel visualizer
 * - `destination`: Audio output destination
 * - `noise-worklet`: Noise generation worklet
 * - `simple-noise-worklet`: Simplified noise worklet
 * - `three-worklet`: Three.js integration worklet
 * - `threejs-demo`: Three.js demonstration node
 *
 * @type {NodeTypes}
 */
export const nodeTypes = {
	// Core system nodes
	debug: DebugNode,
	destination: DestinationNode,

	// Audio generator nodes
	oscillator: OscillatorNode,
	'noise-worklet': NoiseWorkletNode,

	// Audio processing nodes
	gain: GainNode,

	// Visualizer nodes

	'visualizer-modular': VisualizerNodeModular,

	// Three.js integration nodes
	'three-worklet': ThreeWorkletNode,

	// Custom nodes
	sonifier: VertexSonifierNode,

	// Add any custom nodes here following the same pattern
} as NodeTypes;
