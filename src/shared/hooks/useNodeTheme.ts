import { useStore } from '../stores/useStore';
import type { NodeThemeClasses, NodeCategory } from '../stores/themeSlice';
import { getNodeSizeCategory, getNodeSizeClass } from '../config/grid';

/**
 * Hook to get semantic theme classes for a specific node type
 * Uses Tailwind v4's semantic utility classes for consistent theming
 */
export function useNodeTheme(nodeType: string) {
	const getNodeThemeClasses = useStore((state) => state.getNodeThemeClasses);
	const getNodeCategory = useStore((state) => state.getNodeCategory);

	const themeClasses = getNodeThemeClasses(nodeType);
	const category = getNodeCategory(nodeType);

	return {
		themeClasses,
		category,
		classes: createNodeClasses(themeClasses, nodeType),
	};
}

/**
 * Create comprehensive CSS classes for a node using semantic utilities
 * Grid-aligned and fully Tailwind v4 compliant
 */
function createNodeClasses(themeClasses: NodeThemeClasses, nodeType: string) {
	// Determine appropriate size based on node type
	const sizeCategory = getNodeSizeCategory(nodeType);
	const sizeClass = getNodeSizeClass(sizeCategory);

	return {
		// Container classes - uses semantic container class with grid alignment
		container: `react-flow__node-default ${themeClasses.containerClass} ${sizeClass}`,

		// Header section
		header: themeClasses.headerClass,
		title: 'text-sm font-semibold',

		// Content section
		content: 'node-content',

		// Typography
		label: 'label-text',
		value: 'text-xs font-mono',
		subtitle: 'text-xs text-center muted-text',

		// Interactive elements
		button: {
			primary: themeClasses.buttonClass,
			secondary: `px-2 py-1 text-xs rounded border secondary-border 
			           secondary-bg hover:secondary-bg-hover 
			           secondary-text transition-colors`,
			toggle: (active: boolean) =>
				active
					? themeClasses.buttonClass
					: `px-2 py-1 text-xs rounded border secondary-border 
					   secondary-bg hover:secondary-bg-hover 
					   muted-text transition-colors font-mono`,
		},

		// Form controls
		input: {
			range: themeClasses.inputClass,
			select: themeClasses.inputClass,
			number: themeClasses.inputClass,
			text: themeClasses.inputClass,
		},

		// Handle styles - using semantic handle classes
		handle: {
			source: 'handle-source',
			target: 'handle-target',
		},

		// Visual indicators - using semantic indicator classes
		indicator: {
			active: 'indicator-active',
			inactive: 'indicator-inactive',
			warning: 'indicator-warning',
			error: 'indicator-error',
		},

		// Selection states (handled by CSS utility classes automatically)
		states: {
			selected: 'selected', // This class is handled by the CSS utilities
			hover: '', // Handled automatically by hover: variants in CSS
			focus: '', // Handled automatically by focus: variants in CSS
		},
	};
}

/**
 * Utility to get the semantic category for a node type
 */
export function useNodeCategory(nodeType: string): NodeCategory {
	const getNodeCategory = useStore((state) => state.getNodeCategory);
	return getNodeCategory(nodeType);
}

/**
 * Utility to get raw theme class names for direct use
 */
export function useRawNodeThemeClasses(nodeType: string): NodeThemeClasses {
	const getNodeThemeClasses = useStore((state) => state.getNodeThemeClasses);
	return getNodeThemeClasses(nodeType);
}

/**
 * Helper to create dynamic classes based on state
 */
export function createConditionalClasses(
	baseClass: string,
	conditions: Record<string, boolean>
): string {
	const conditionalClasses = Object.entries(conditions)
		.filter(([, condition]) => condition)
		.map(([className]) => className);

	return [baseClass, ...conditionalClasses].join(' ');
}

/**
 * Utility for getting theme colors for programmatic use (canvas, WebGL, etc.)
 * Maps semantic categories to color values
 */
export function getNodeThemeColors(nodeType: string) {
	const getNodeCategory = useStore.getState().getNodeCategory;
	const category = getNodeCategory(nodeType);

	// Color mappings based on CSS custom properties
	const colorMaps: Record<NodeCategory, Record<string, string>> = {
		'audio-generation': {
			primary: 'oklch(0.65 0.15 248)',
			secondary: 'oklch(0.78 0.12 248)',
			accent: 'oklch(0.58 0.15 248)',
			background: 'oklch(0.98 0.01 248)',
			text: 'oklch(0.25 0.08 248)',
		},
		'audio-processing': {
			primary: 'oklch(0.78 0.13 85)',
			secondary: 'oklch(0.85 0.11 85)',
			accent: 'oklch(0.71 0.13 85)',
			background: 'oklch(0.98 0.02 85)',
			text: 'oklch(0.35 0.06 85)',
		},
		'audio-output': {
			primary: 'oklch(0.65 0.14 155)',
			secondary: 'oklch(0.78 0.11 155)',
			accent: 'oklch(0.58 0.14 155)',
			background: 'oklch(0.98 0.03 155)',
			text: 'oklch(0.25 0.07 155)',
		},
		'audio-analysis': {
			primary: 'oklch(0.7 0.14 195)',
			secondary: 'oklch(0.8 0.11 195)',
			accent: 'oklch(0.63 0.14 195)',
			background: 'oklch(0.98 0.02 195)',
			text: 'oklch(0.28 0.07 195)',
		},
		visual: {
			primary: 'oklch(0.63 0.17 270)',
			secondary: 'oklch(0.75 0.14 270)',
			accent: 'oklch(0.56 0.17 270)',
			background: 'oklch(0.98 0.02 270)',
			text: 'oklch(0.24 0.08 270)',
		},
		debug: {
			primary: 'oklch(0.62 0.02 0)',
			secondary: 'oklch(0.77 0.02 0)',
			accent: 'oklch(0.55 0.02 0)',
			background: 'oklch(0.98 0.01 0)',
			text: 'oklch(0.26 0.01 0)',
		},
	};

	return colorMaps[category] || colorMaps.debug;
}
