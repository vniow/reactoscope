import type { ComponentVariant } from '../types/ui';

// Variant style mappings - updated to use ComponentVariant
export const VARIANT_STYLES = {
	// Map old variants to new system for backward compatibility
	primary: {
		button:
			'bg-green-100 hover:bg-green-200 text-green-800 dark:bg-green-900/30 dark:hover:bg-green-800/40 dark:text-green-200',
		border:
			'border-green-300 hover:bg-green-50 dark:border-green-600 dark:hover:bg-green-900/20',
	},
	secondary: {
		button:
			'bg-purple-100 hover:bg-purple-200 text-purple-800 dark:bg-purple-900/30 dark:hover:bg-purple-800/40 dark:text-purple-200',
		border:
			'border-purple-300 hover:bg-purple-50 dark:border-purple-600 dark:hover:bg-purple-900/20',
	},
	audio: {
		button:
			'bg-orange-100 hover:bg-orange-200 text-orange-800 dark:bg-orange-900/30 dark:hover:bg-orange-800/40 dark:text-orange-200',
		border:
			'border-orange-300 hover:bg-orange-50 dark:border-orange-600 dark:hover:bg-orange-900/20',
	},
	debug: {
		button:
			'bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900/30 dark:hover:bg-blue-800/40 dark:text-blue-200',
		border:
			'border-blue-300 hover:bg-blue-50 dark:border-blue-600 dark:hover:bg-blue-900/20',
	},
	default: {
		button:
			'bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200',
		border:
			'border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700',
	},
	// New ComponentVariant mappings using CSS custom properties
	core: {
		button:
			'bg-[var(--node-accent)] hover:bg-[var(--node-accent)]/80 text-white dark:bg-[var(--node-accent)] dark:hover:bg-[var(--node-accent)]/70',
		border:
			'border-[var(--node-accent)] hover:bg-[var(--node-accent)]/10 dark:border-[var(--node-accent)] dark:hover:bg-[var(--node-accent)]/20',
	},
	source: {
		button:
			'bg-[var(--node-accent)] hover:bg-[var(--node-accent)]/80 text-white dark:bg-[var(--node-accent)] dark:hover:bg-[var(--node-accent)]/70',
		border:
			'border-[var(--node-accent)] hover:bg-[var(--node-accent)]/10 dark:border-[var(--node-accent)] dark:hover:bg-[var(--node-accent)]/20',
	},
	instrument: {
		button:
			'bg-[var(--node-accent)] hover:bg-[var(--node-accent)]/80 text-white dark:bg-[var(--node-accent)] dark:hover:bg-[var(--node-accent)]/70',
		border:
			'border-[var(--node-accent)] hover:bg-[var(--node-accent)]/10 dark:border-[var(--node-accent)] dark:hover:bg-[var(--node-accent)]/20',
	},
	effect: {
		button:
			'bg-[var(--node-accent)] hover:bg-[var(--node-accent)]/80 text-white dark:bg-[var(--node-accent)] dark:hover:bg-[var(--node-accent)]/70',
		border:
			'border-[var(--node-accent)] hover:bg-[var(--node-accent)]/10 dark:border-[var(--node-accent)] dark:hover:bg-[var(--node-accent)]/20',
	},
	component: {
		button:
			'bg-[var(--node-accent)] hover:bg-[var(--node-accent)]/80 text-white dark:bg-[var(--node-accent)] dark:hover:bg-[var(--node-accent)]/70',
		border:
			'border-[var(--node-accent)] hover:bg-[var(--node-accent)]/10 dark:border-[var(--node-accent)] dark:hover:bg-[var(--node-accent)]/20',
	},
	signal: {
		button:
			'bg-[var(--node-accent)] hover:bg-[var(--node-accent)]/80 text-white dark:bg-[var(--node-accent)] dark:hover:bg-[var(--node-accent)]/70',
		border:
			'border-[var(--node-accent)] hover:bg-[var(--node-accent)]/10 dark:border-[var(--node-accent)] dark:hover:bg-[var(--node-accent)]/20',
	},
	event: {
		button:
			'bg-[var(--node-accent)] hover:bg-[var(--node-accent)]/80 text-white dark:bg-[var(--node-accent)] dark:hover:bg-[var(--node-accent)]/70',
		border:
			'border-[var(--node-accent)] hover:bg-[var(--node-accent)]/10 dark:border-[var(--node-accent)] dark:hover:bg-[var(--node-accent)]/20',
	},
	unit: {
		button:
			'bg-[var(--node-accent)] hover:bg-[var(--node-accent)]/80 text-white dark:bg-[var(--node-accent)] dark:hover:bg-[var(--node-accent)]/70',
		border:
			'border-[var(--node-accent)] hover:bg-[var(--node-accent)]/10 dark:border-[var(--node-accent)] dark:hover:bg-[var(--node-accent)]/20',
	},
} as const;

/**
 * Get button classes for a specific variant
 */
export function getButtonVariantClasses(
	variant: ComponentVariant | string
): string {
	return (
		VARIANT_STYLES[variant as keyof typeof VARIANT_STYLES]?.button ||
		VARIANT_STYLES.default.button
	);
}

/**
 * Get border button classes for a specific variant
 */
export function getBorderVariantClasses(
	variant: ComponentVariant | string
): string {
	return (
		VARIANT_STYLES[variant as keyof typeof VARIANT_STYLES]?.border ||
		VARIANT_STYLES.default.border
	);
}

/**
 * Base button classes that apply to all variants
 */
export const BASE_BUTTON_CLASSES =
	'p-2 rounded text-xs font-medium transition-all duration-200 text-center border shadow-sm hover:shadow-md';

/**
 * Variant-aware button classes that use CSS custom properties
 * These work with data-variant attributes on the button or parent element
 * Enhanced for a11y compliance with proper contrast ratios
 */
export const VARIANT_BUTTON_CLASSES =
	'bg-[var(--node-accent,theme(colors.gray.600))] hover:bg-[var(--node-accent,theme(colors.gray.700))] active:bg-[var(--node-accent,theme(colors.gray.800))] text-white border-[var(--node-accent,theme(colors.gray.600))] hover:border-[var(--node-accent,theme(colors.gray.700))] font-medium shadow-sm';

/**
 * Base border button classes that apply to all variants
 */
export const BASE_BORDER_BUTTON_CLASSES =
	'w-full text-left p-2 rounded border transition-colors group';
