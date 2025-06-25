import { useNodes, useNodeId } from '@xyflow/react';
import { useMemo } from 'react';
import type { ComponentVariant } from '../types/ui';
import type { BaseNodeData } from '../../nodes/types';

/**
 * Hook to get the variant of a specific node by ID
 * This allows handles and edges to access node variant information
 */
export function useNodeVariant(nodeId?: string): ComponentVariant | undefined {
	const nodes = useNodes();

	return useMemo(() => {
		if (!nodeId) return undefined;

		const node = nodes.find((n) => n.id === nodeId);
		if (!node) return undefined;

		// Check if variant is stored in node data (new system)
		const nodeData = node.data as BaseNodeData;
		if (nodeData?.variant) {
			return nodeData.variant;
		}

		// Fallback: Try to infer variant from node type
		return inferVariantFromNodeType(node.type);
	}, [nodes, nodeId]);
}

/**
 * Hook to get the variant of the current node (for use within node components)
 */
export function useCurrentNodeVariant(): ComponentVariant | undefined {
	const nodeId = useNodeId();
	return useNodeVariant(nodeId || undefined);
}

/**
 * Hook to get variants for both source and target nodes of an edge
 * Useful for edge components that need to style based on connected node types
 */
export function useEdgeNodeVariants(
	sourceId: string,
	targetId: string
): {
	sourceVariant: ComponentVariant | undefined;
	targetVariant: ComponentVariant | undefined;
} {
	const sourceVariant = useNodeVariant(sourceId);
	const targetVariant = useNodeVariant(targetId);

	return useMemo(
		() => ({
			sourceVariant,
			targetVariant,
		}),
		[sourceVariant, targetVariant]
	);
}

/**
 * Fallback function to infer variant from node type when not stored in data
 * This provides backward compatibility for existing nodes
 */
function inferVariantFromNodeType(nodeType?: string): ComponentVariant {
	if (!nodeType) return 'core';

	// Map node types to variants based on the updated system
	const typeToVariantMap: Record<string, ComponentVariant> = {
		oscillator: 'source',
		gain: 'component',
		visualizer: 'signal',
		destination: 'core',
		debug: 'unit',
	};

	return typeToVariantMap[nodeType] || 'core';
}

/**
 * Hook to check if a node uses a specific variant
 */
export function useNodeHasVariant(
	nodeId: string | undefined,
	variant: ComponentVariant
): boolean {
	const nodeVariant = useNodeVariant(nodeId);
	return nodeVariant === variant;
}

/**
 * Hook to get CSS custom properties for a node's variant
 * Returns the CSS data-variant attribute value for styling purposes
 */
export function useNodeVariantClasses(nodeId?: string): string {
	const variant = useNodeVariant(nodeId);
	return variant ? `data-variant-${variant}` : '';
}
