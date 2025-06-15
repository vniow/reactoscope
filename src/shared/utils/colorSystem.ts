/**
 * Color System Utilities
 * Centralized color resolution and inheritance for variant-based theming
 */

import type { ComponentVariant, VariantColorTokens, EdgeColorConfig } from '../types/ui';

/**
 * Get CSS custom property value for a variant
 */
export function getVariantColorValue(variant: ComponentVariant): string {
	return `var(--color-variant-${variant})`;
}

/**
 * Generate complete color tokens for a variant
 */
export function getVariantColorTokens(variant: ComponentVariant): VariantColorTokens {
	const baseColor = `var(--color-variant-${variant})`;
	
	return {
		// Primary colors
		accent: baseColor,
		accentHover: `color-mix(in srgb, ${baseColor} 80%, white)`,
		accentActive: `color-mix(in srgb, ${baseColor} 90%, black)`,
		
		// Text colors
		textOnAccent: 'light-dark(#ffffff, #000000)',
		textPrimary: 'light-dark(#1f2937, #f9fafb)',
		textSecondary: 'light-dark(#6b7280, #d1d5db)',
		
		// Background variations
		bgFrom: `color-mix(in srgb, ${baseColor} 20%, light-dark(#f1f5f9, #334155))`,
		bgVia: `color-mix(in srgb, ${baseColor} 10%, light-dark(#ffffff, #1e293b))`,
		bgTo: `color-mix(in srgb, ${baseColor} 20%, light-dark(#f1f5f9, #334155))`,
		bgSubtle: `color-mix(in srgb, ${baseColor} 8%, light-dark(#f8fafc, #1e293b))`,
		
		// Border and effects
		border: `color-mix(in srgb, ${baseColor} 60%, transparent)`,
		borderFocus: `color-mix(in srgb, ${baseColor} 80%, transparent)`,
		shadow: `color-mix(in srgb, ${baseColor} 40%, transparent)`,
		shadowHover: `color-mix(in srgb, ${baseColor} 60%, transparent)`,
		
		// Opacity variations
		accent10: `color-mix(in srgb, ${baseColor} 10%, transparent)`,
		accent20: `color-mix(in srgb, ${baseColor} 20%, transparent)`,
		accent40: `color-mix(in srgb, ${baseColor} 40%, transparent)`,
		accent60: `color-mix(in srgb, ${baseColor} 60%, transparent)`,
		accent80: `color-mix(in srgb, ${baseColor} 80%, transparent)`,
	};
}

/**
 * Calculate edge colors based on connected node variants
 */
export function calculateEdgeColors(config: EdgeColorConfig): {
	stroke: string;
	strokeHover: string;
	gradient: { from: string; to: string };
} {
	const sourceColor = getVariantColorValue(config.sourceVariant);
	const targetColor = getVariantColorValue(config.targetVariant);
	
	switch (config.colorMode) {
		case 'source':
			return {
				stroke: sourceColor,
				strokeHover: `color-mix(in srgb, ${sourceColor} 80%, white)`,
				gradient: { from: sourceColor, to: sourceColor },
			};
			
		case 'target':
			return {
				stroke: targetColor,
				strokeHover: `color-mix(in srgb, ${targetColor} 80%, white)`,
				gradient: { from: targetColor, to: targetColor },
			};
			
		case 'gradient':
			return {
				stroke: `linear-gradient(90deg, ${sourceColor}, ${targetColor})`,
				strokeHover: `linear-gradient(90deg, color-mix(in srgb, ${sourceColor} 80%, white), color-mix(in srgb, ${targetColor} 80%, white))`,
				gradient: { from: sourceColor, to: targetColor },
			};
			
		case 'mixed': {
			const mixedColor = `color-mix(in srgb, ${sourceColor} 50%, ${targetColor})`;
			return {
				stroke: mixedColor,
				strokeHover: `color-mix(in srgb, ${mixedColor} 80%, white)`,
				gradient: { from: mixedColor, to: mixedColor },
			};
		}
			
		default:
			return calculateEdgeColors({ ...config, colorMode: 'gradient' });
	}
}

/**
 * Apply variant styles to an element using CSS custom properties
 */
export function applyVariantStyles(
	element: HTMLElement,
	variant: ComponentVariant,
	tokens: (keyof VariantColorTokens)[] = ['accent', 'border', 'shadow']
): void {
	element.dataset.variant = variant;
	
	const colorTokens = getVariantColorTokens(variant);
	
	tokens.forEach(token => {
		const value = colorTokens[token];
		element.style.setProperty(`--current-${token}`, value);
	});
}

/**
 * Create CSS gradient string from variant colors
 */
export function createVariantGradient(
	variant: ComponentVariant,
	direction: string = 'to bottom right'
): string {
	const tokens = getVariantColorTokens(variant);
	return `linear-gradient(${direction}, ${tokens.bgFrom}, ${tokens.bgVia}, ${tokens.bgTo})`;
}

/**
 * Generate button styles for a specific variant
 */
export function getVariantButtonStyles(variant: ComponentVariant): React.CSSProperties {
	const tokens = getVariantColorTokens(variant);
	
	return {
		backgroundColor: tokens.accent,
		color: tokens.textOnAccent,
		borderColor: tokens.border,
		boxShadow: `0 4px 6px -1px ${tokens.shadow}`,
		'--hover-bg': tokens.accentHover,
		'--active-bg': tokens.accentActive,
		'--focus-shadow': tokens.shadowHover,
	} as React.CSSProperties;
}

/**
 * Extract variant from a node ID using ReactFlow
 */
export function getNodeVariant(nodeId: string, nodes: { id: string; data?: { variant?: ComponentVariant } }[]): ComponentVariant {
	const node = nodes.find(n => n.id === nodeId);
	return node?.data?.variant || 'core';
}
