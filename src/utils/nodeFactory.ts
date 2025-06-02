import { generateNodeId, generateNodePosition } from './nodeUtils';
import { isAudioNode, type NodeTypeOption } from '../config/nodeTypes';
import type { AppNode } from '../nodes/types';

/**
 * Creates a new node instance based on the node type option
 */
export function createNode(nodeTypeOption: NodeTypeOption): AppNode {
	const nodeId = generateNodeId();
	const position = generateNodePosition();

	if (isAudioNode(nodeTypeOption.type as string)) {
		return createAudioNode(nodeId, position, nodeTypeOption);
	}

	return createStandardNode(nodeId, position, nodeTypeOption);
}

/**
 * Creates an audio node with special handling for audio-specific properties
 */
function createAudioNode(
	nodeId: string,
	position: { x: number; y: number },
	nodeTypeOption: NodeTypeOption
): AppNode {
	return {
		id: nodeId,
		type: nodeTypeOption.type,
		position,
		data: {
			...nodeTypeOption.defaultData,
			id: nodeId, // Set the audio node ID
		},
	} as AppNode;
}

/**
 * Creates a standard node for non-audio node types
 */
function createStandardNode(
	nodeId: string,
	position: { x: number; y: number },
	nodeTypeOption: NodeTypeOption
): AppNode {
	return {
		id: nodeId,
		type: nodeTypeOption.type,
		position,
		data: { ...nodeTypeOption.defaultData },
	} as AppNode;
}

/**
 * Creates predefined test flow nodes
 */
export function createTestFlowNodes(): AppNode[] {
	const osc1: AppNode = {
		id: 'test-osc-1',
		type: 'oscillator',
		position: { x: 0, y: 0 },
		data: {
			id: 'test-osc-1',
			type: 'oscillator' as const,
			params: {
				frequency: 220,
				detune: 0,
				waveType: 'sine' as const,
				isPlaying: false,
				volume: 0.5,
			},
			label: 'Oscillator 1',
		},
	};

	const osc2: AppNode = {
		id: 'test-osc-2',
		type: 'oscillator',
		position: { x: 600, y: 0 },
		data: {
			id: 'test-osc-2',
			type: 'oscillator' as const,
			params: {
				frequency: 220,
				detune: -1,
				waveType: 'square' as const,
				isPlaying: false,
				volume: 0.5,
			},
			label: 'Oscillator 2',
		},
	};

	const visualizer: AppNode = {
		id: 'test-visualizer',
		type: 'visualizer',
		position: { x: 200, y: 0 },
		data: {
			id: 'test-visualizer',
			type: 'visualizer' as const,
			params: {
				size: 1024,
				smoothing: 0.8,
				isConnected: false,
			},
			label: 'Audio Visualizer',
		},
	};

	return [osc1, osc2, visualizer];
}
