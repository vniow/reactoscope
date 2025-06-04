import type { ComponentVariant, VariantStyles } from '../types/ui';

/**
 * Centralized style definitions following the design system
 */

export const VARIANT_STYLES: Record<ComponentVariant, VariantStyles> = {
	default: {
		border: 'border-gray-300 dark:border-gray-600',
		background: 'bg-gray-50 dark:bg-gray-700',
		text: 'text-gray-800 dark:text-gray-200',
		shadow: 'shadow-gray-400/40',
	},
	debug: {
		border: 'border-blue-300 dark:border-blue-600',
		background: 'bg-blue-50 dark:bg-blue-900/20',
		text: 'text-blue-800 dark:text-blue-200',
		shadow: 'shadow-blue-400/40',
	},
	primary: {
		border: 'border-green-300 dark:border-green-600',
		background: 'bg-green-50 dark:bg-green-900/20',
		text: 'text-green-800 dark:text-green-200',
		shadow: 'shadow-green-400/40',
	},
	secondary: {
		border: 'border-purple-300 dark:border-purple-600',
		background: 'bg-purple-50 dark:bg-purple-900/20',
		text: 'text-purple-800 dark:text-purple-200',
		shadow: 'shadow-purple-400/40',
	},
	audio: {
		border: 'border-orange-300 dark:border-orange-600',
		background: 'bg-orange-50 dark:bg-orange-900/20',
		text: 'text-orange-800 dark:text-orange-200',
		shadow: 'shadow-orange-400/40',
	},
};

export const GRADIENT_STYLES: Record<ComponentVariant, string> = {
	default:
		'bg-gradient-to-br from-gray-400 via-gray-200 to-gray-400 dark:from-gray-700 dark:via-gray-500 dark:to-gray-700',
	debug:
		'bg-gradient-to-br from-blue-400 via-blue-200 to-blue-400 dark:from-blue-700 dark:via-blue-500 dark:to-blue-700',
	primary:
		'bg-gradient-to-br from-green-400 via-green-200 to-green-400 dark:from-green-700 dark:via-green-500 dark:to-green-700',
	secondary:
		'bg-gradient-to-br from-purple-400 via-purple-200 to-purple-400 dark:from-purple-700 dark:via-purple-500 dark:to-purple-700',
	audio:
		'bg-gradient-to-br from-orange-400 via-orange-200 to-orange-400 dark:from-orange-700 dark:via-orange-500 dark:to-orange-700',
};

/**
 * Utility functions for consistent class generation
 */

export function getVariantClasses(
	variant: ComponentVariant,
	type: 'border' | 'background' | 'text' | 'shadow'
): string {
	return VARIANT_STYLES[variant][type];
}

export function getGradientClasses(variant: ComponentVariant): string {
	return GRADIENT_STYLES[variant];
}

export function combineClasses(
	...classes: (string | undefined | false)[]
): string {
	return classes.filter(Boolean).join(' ');
}

/**
 * Button variant styles with proper accessibility
 */
export function getButtonVariantClasses(variant: ComponentVariant): string {
	const baseClasses =
		'px-3 py-1.5 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800';

	const variantClasses = {
		default:
			'bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-100 focus:ring-gray-400',
		primary: 'bg-green-500 hover:bg-green-600 text-white focus:ring-green-400',
		secondary:
			'bg-purple-500 hover:bg-purple-600 text-white focus:ring-purple-400',
		audio: 'bg-orange-500 hover:bg-orange-600 text-white focus:ring-orange-400',
		debug: 'bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-400',
	};

	return combineClasses(baseClasses, variantClasses[variant]);
}

/**
 * Slider variant styles
 */
export function getSliderTrackClasses(
	color: string,
	size: string,
	disabled?: boolean
): string {
	const baseClasses =
		'w-full rounded-lg appearance-none cursor-pointer transition-all nodrag';

	const sizeClasses = {
		sm: 'h-1',
		md: 'h-2',
		lg: 'h-3',
	};

	const colorClasses = {
		default: 'bg-gray-200 dark:bg-gray-700',
		orange: 'bg-orange-200 dark:bg-orange-800',
		green: 'bg-green-200 dark:bg-green-800',
		red: 'bg-red-200 dark:bg-red-800',
		blue: 'bg-blue-200 dark:bg-blue-800',
	};

	const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';

	return combineClasses(
		baseClasses,
		sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.md,
		colorClasses[color as keyof typeof colorClasses] || colorClasses.default,
		disabledClasses
	);
}

/**
 * Get unified interactive element styling (same base style for handles and buttons)
 */
export function getUnifiedInteractiveClasses(): string {
	return combineClasses(
		// Size - same for both handles and buttons
		'w-8 h-8',
		// Focus and accessibility
		'focus:outline-none focus:ring-2 focus:ring-offset-2',
		// Transitions and animations
		'transition-all duration-200 ease-in-out',
		// Shadow effects
		'shadow-sm hover:shadow-md',
		// Transform effects with proper origin
		'hover:scale-110 origin-center',
		// Shape
		'rounded-full',
		// Border
		'border-2 border-white dark:border-gray-100',
		// Layout
		'flex items-center justify-center text-lg font-bold'
	);
}

/**
 * Get delete button specific styling classes (now uses unified base)
 */
export function getDeleteButtonClasses(): string {
	const baseClasses = combineClasses(
		getUnifiedInteractiveClasses(),
		// Positioning and z-index specific to delete button
		'absolute pointer-events-auto -top-4 -left-4 z-50'
	);

	const colorClasses = combineClasses(
		'bg-red-500 hover:bg-red-600',
		'dark:bg-red-600 dark:hover:bg-red-700',
		'text-white',
		'focus:ring-red-500'
	);

	return combineClasses(baseClasses, colorClasses);
}
