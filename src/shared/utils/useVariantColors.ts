/**
 * React hooks for variant-based color management
 */

import { useMemo } from 'react';
import { useReactFlow } from '@xyflow/react';
import type {
	ComponentVariant,
	VariantColorTokens,
	EdgeColorConfig,
} from '../types/ui';
import {
	getVariantColorTokens,
	calculateEdgeColors,
	getVariantButtonStyles,
	getNodeVariant,
} from './colorSystem';

/**
 * Hook to get color tokens for a specific variant
 */
export function useVariantColors(
	variant: ComponentVariant
): VariantColorTokens {
	return useMemo(() => getVariantColorTokens(variant), [variant]);
}

/**
 * Hook to get colors for a specific node by ID
 */
export function useNodeColors(nodeId: string): VariantColorTokens {
	const { getNodes } = useReactFlow();

	return useMemo(() => {
		const nodes = getNodes();
		const variant = getNodeVariant(nodeId, nodes);
		return getVariantColorTokens(variant);
	}, [nodeId, getNodes]);
}

/**
 * Hook to calculate edge colors based on connected nodes
 */
export function useEdgeColors(
	sourceId: string,
	targetId: string,
	colorMode: EdgeColorConfig['colorMode'] = 'gradient'
): {
	stroke: string;
	strokeHover: string;
	gradient: { from: string; to: string };
	gradientId: string;
} {
	const { getNodes } = useReactFlow();

	return useMemo(() => {
		const nodes = getNodes();
		const sourceVariant = getNodeVariant(sourceId, nodes);
		const targetVariant = getNodeVariant(targetId, nodes);

		const colors = calculateEdgeColors({
			sourceVariant,
			targetVariant,
			colorMode,
		});

		return {
			...colors,
			gradientId: `edge-gradient-${sourceId}-${targetId}`,
		};
	}, [sourceId, targetId, colorMode, getNodes]);
}

/**
 * Hook to get button styles for a variant
 */
export function useVariantButtonStyles(
	variant: ComponentVariant
): React.CSSProperties {
	return useMemo(() => getVariantButtonStyles(variant), [variant]);
}

/**
 * Hook to get multiple variant colors for components that need to display multiple variants
 */
export function useMultiVariantColors(
	variants: ComponentVariant[]
): Record<ComponentVariant, VariantColorTokens> {
	return useMemo(() => {
		const colorMap: Record<string, VariantColorTokens> = {};
		variants.forEach((variant) => {
			colorMap[variant] = getVariantColorTokens(variant);
		});
		return colorMap as Record<ComponentVariant, VariantColorTokens>;
	}, [variants]);
}

/**
 * Hook to apply variant styles to a ref element
 */
export function useVariantStyleApplication(
	variant: ComponentVariant,
	tokens: (keyof VariantColorTokens)[] = ['accent', 'border', 'shadow']
) {
	const colorTokens = useVariantColors(variant);

	return useMemo(
		() => ({
			'data-variant': variant,
			style: tokens.reduce((acc, token) => {
				(acc as Record<string, string>)[`--current-${token}`] =
					colorTokens[token];
				return acc;
			}, {} as React.CSSProperties),
		}),
		[variant, colorTokens, tokens]
	);
}

/**
 * Hook for dynamic color inheritance based on parent or connected components
 */
export function useColorInheritance(
	baseVariant: ComponentVariant,
	inheritFromId?: string
): VariantColorTokens {
	const { getNodes } = useReactFlow();
	const baseColors = useVariantColors(baseVariant);

	return useMemo(() => {
		if (!inheritFromId) return baseColors;

		const nodes = getNodes();
		const inheritVariant = getNodeVariant(inheritFromId, nodes);

		// If inheriting from the same variant, return base colors
		if (inheritVariant === baseVariant) return baseColors;

		// Otherwise, return inherited colors
		return getVariantColorTokens(inheritVariant);
	}, [baseVariant, inheritFromId, baseColors, getNodes]);
}
