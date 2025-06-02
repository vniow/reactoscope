import type { NodeVariant } from '../config/nodeTypes';

// Variant style mappings
export const VARIANT_STYLES = {
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
} as const;

/**
 * Get button classes for a specific variant
 */
export function getButtonVariantClasses(variant: NodeVariant): string {
	return VARIANT_STYLES[variant]?.button || VARIANT_STYLES.default.button;
}

/**
 * Get border button classes for a specific variant
 */
export function getBorderVariantClasses(variant: NodeVariant): string {
	return VARIANT_STYLES[variant]?.border || VARIANT_STYLES.default.border;
}

/**
 * Base button classes that apply to all variants
 */
export const BASE_BUTTON_CLASSES =
	'p-2 rounded text-xs font-medium transition-colors text-center';

/**
 * Base border button classes that apply to all variants
 */
export const BASE_BORDER_BUTTON_CLASSES =
	'w-full text-left p-2 rounded border transition-colors group';
