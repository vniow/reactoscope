import { generateNodeId, generateNodePosition } from './nodeUtils';
import { type NodeTypeOption } from '../config/nodeTypes';
import type { AppNode } from '../../flow/nodes/types';

/**
 * Creates a new node instance based on the node type option
 */
export function createNode(nodeTypeOption: NodeTypeOption): AppNode {
	const nodeId = generateNodeId();
	const position = generateNodePosition();

	return createStandardNode(nodeId, position, nodeTypeOption);
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
