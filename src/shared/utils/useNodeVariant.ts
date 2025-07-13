import { useMemo } from 'react';
import { useNodes, useNodeId } from '@xyflow/react';
import type { ComponentVariant } from '../types/ui';
import type { AppNode } from '../../flow/nodes/types';

/**
 * Hook to get the variant of a specific node by ID.
 *
 * This hook is essential for allowing components like edges and handles to react
 * to the visual style of the nodes they connect to. It determines the variant
 * by checking multiple sources in a specific order, ensuring backward
 * compatibility and flexibility.
 *
 * The lookup order is:
 * 1. `node.data.variant`: The preferred method, storing variant in the node's data payload.
 * 2. `node.variant`: A legacy fallback for older node structures.
 * 3. `inferVariantFromNodeType(node.type)`: A final fallback that infers the variant from the node's `type` string.
 *
 * @param nodeId - The ID of the node to get the variant for.
 * @returns The component variant ('core', 'source', etc.) or `undefined` if the node is not found or has no variant.
 */
export function useNodeVariant(nodeId?: string): ComponentVariant | undefined {
	const nodes = useNodes<AppNode>(); // Specify AppNode for type safety

	return useMemo(() => {
		if (!nodeId) {
			return undefined;
		}

		const node = nodes.find((n) => n.id === nodeId);
		if (!node) {
			// Add a warning for easier debugging, but don't spam the console
			// console.warn(`[useNodeVariant] Node with ID "${nodeId}" not found.`);
			return undefined;
		}

		// 1. Preferred: Check for variant in `node.data`
		// Ensures type safety by checking if the property exists and is a string.
		if (
			node.data &&
			'variant' in node.data &&
			typeof (node.data as { variant?: unknown }).variant === 'string'
		) {
			return (node.data as { variant: ComponentVariant }).variant;
		}

		// 2. Legacy: Check for a top-level `variant` property on the node itself.
		// This is for backward compatibility with older node definitions.
		if ('variant' in node && typeof node.variant === 'string') {
			return node.variant as ComponentVariant;
		}

		// 3. Fallback: Infer the variant from the node's `type` property.
		// This is the last resort and helps assign a visual style when none is explicitly set.
		return inferVariantFromNodeType(node.type);
	}, [nodes, nodeId]);
}

/**
 * Hook to get the variant of the current node (for use within node components).
 * This simplifies accessing the variant for the component it's used in.
 *
 * @returns The component variant or `undefined`.
 */
export function useCurrentNodeVariant(): ComponentVariant | undefined {
	const nodeId = useNodeId();
	return useNodeVariant(nodeId || undefined);
}

/**
 * Hook to get variants for both source and target nodes of an edge.
 * Useful for edge components that need to style based on connected node types.
 *
 * @param sourceId - ID of the source node.
 * @param targetId - ID of the target node.
 * @returns An object containing both `sourceVariant` and `targetVariant`.
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
 * Fallback function to infer variant from node type when not stored in data.
 * This provides backward compatibility for existing nodes and a sensible default
 * when no explicit variant is set. It maps node types (often related to
 * Tone.js classes) to their corresponding visual variants.
 *
 * @param nodeType - The `type` string of the node (e.g., 'oscillator', 'reverb').
 * @returns The corresponding `ComponentVariant`. Defaults to 'core'.
 */
function inferVariantFromNodeType(nodeType?: string): ComponentVariant {
	if (!nodeType || typeof nodeType !== 'string') {
		return 'core'; // Default variant if type is missing or invalid
	}

	// Map node types to variants based on their functional category.
	// The mapping is case-insensitive for robustness.
	const typeToVariantMap: Record<string, ComponentVariant> = {
		// Audio Sources
		oscillator: 'source',
		player: 'source',
		microphone: 'source',

		// Instruments
		synth: 'instrument',
		fmsynth: 'instrument',
		amsynth: 'instrument',

		// Effects
		reverb: 'effect',
		delay: 'effect',
		filter: 'effect',

		// Signal Components
		gain: 'component',
		panner: 'component',
		mixer: 'component',

		// Signal Processing/Analysis
		analyser: 'signal',
		fft: 'signal',
		visualizer: 'signal',

		// Core/System
		destination: 'core',
		context: 'core',

		// Events
		sequence: 'event',
		part: 'event',
		transport: 'event',

		// Utility/Unit
		debug: 'util',
		frequency: 'util',
		time: 'util',
		utility: 'util', // Generic utility
	};

	return typeToVariantMap[nodeType.toLowerCase()] || 'core';
}

/**
 * Hook to check if a node uses a specific variant.
 * Provides a simple boolean check for conditional rendering or logic.
 *
 * @param nodeId - ID of the node to check.
 * @param variant - The `ComponentVariant` to check against.
 * @returns `true` if the node has the specified variant.
 */
export function useNodeHasVariant(
	nodeId: string | undefined,
	variant: ComponentVariant
): boolean {
	const nodeVariant = useNodeVariant(nodeId);
	return nodeVariant === variant;
}

/**
 * Hook to get the appropriate data attribute for a node's variant.
 * This is used to apply variant-specific styling via CSS.
 * For example, `data-variant-source`, `data-variant-effect`, etc.
 *
 * @param nodeId - ID of the node to get the variant class for.
 * @returns A string to be used in a `data-variant` attribute, or an empty string.
 */
export function useNodeVariantClasses(nodeId?: string): string {
	const variant = useNodeVariant(nodeId);
	return variant ? `variant-${variant}` : '';
}
