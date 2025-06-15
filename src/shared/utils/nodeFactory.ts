import { generateNodeId, generateNodePosition } from './nodeUtils';
import { isAudioNode, type NodeTypeOption } from '../config/nodeTypes';
import type { AppNode } from '../../nodes/types';

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
			variant: nodeTypeOption.variant, // Store variant in node data for React Flow access
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
		data: {
			...nodeTypeOption.defaultData,
			variant: nodeTypeOption.variant, // Store variant in node data for React Flow access
		},
	} as AppNode;
}
