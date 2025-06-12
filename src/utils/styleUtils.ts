/**
 * Simplified style utilities for Tailwind v4 with CSS custom properties
 */

export function combineClasses(
	...classes: (string | undefined | false)[]
): string {
	return classes.filter(Boolean).join(' ');
}

/**
 * Slider variant styles - Now uses CSS custom properties for variant-aware backgrounds
 */
export function getSliderTrackClasses(
	size: string,
	disabled?: boolean
): string {
	const baseClasses =
		'w-full rounded-lg appearance-none cursor-pointer transition-all nodrag';

	const sizeClasses = {
		sm: 'h-1.5',
		md: 'h-2',
		lg: 'h-3',
	};

	// Updated to use variant-aware gradient backgrounds that inherit from parent node
	// Uses the same gradient as the node background for visual consistency
	const variantAwareBackground = combineClasses(
		'bg-gradient-to-r',
		'from-[var(--node-bg-from,light-dark(#f8fafc,#0f172a))]',
		'via-[var(--node-bg-via,light-dark(#f1f5f9,#1e293b))]',
		'to-[var(--node-bg-to,light-dark(#e2e8f0,#334155))]',
		'border border-[var(--node-border,light-dark(#cbd5e1,#475569))]'
	);

	const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';

	// Custom slider thumb styles using CSS custom properties
	const sliderThumbStyles = combineClasses(
		// Webkit (Chrome, Safari)
		'[&::-webkit-slider-thumb]:appearance-none',
		'[&::-webkit-slider-thumb]:w-4',
		'[&::-webkit-slider-thumb]:h-4',
		'[&::-webkit-slider-thumb]:rounded-full',
		'[&::-webkit-slider-thumb]:bg-[var(--node-accent,light-dark(#3b82f6,#60a5fa))]',
		'[&::-webkit-slider-thumb]:border-2',
		'[&::-webkit-slider-thumb]:border-white',
		'[&::-webkit-slider-thumb]:shadow-lg',
		'[&::-webkit-slider-thumb]:cursor-pointer',
		'[&::-webkit-slider-thumb]:transition-all',
		'[&::-webkit-slider-thumb]:hover:scale-110',
		'[&::-webkit-slider-thumb]:hover:shadow-xl',
		// Firefox
		'[&::-moz-range-thumb]:appearance-none',
		'[&::-moz-range-thumb]:w-4',
		'[&::-moz-range-thumb]:h-4',
		'[&::-moz-range-thumb]:rounded-full',
		'[&::-moz-range-thumb]:bg-[var(--node-accent,light-dark(#3b82f6,#60a5fa))]',
		'[&::-moz-range-thumb]:border-2',
		'[&::-moz-range-thumb]:border-white',
		'[&::-moz-range-thumb]:cursor-pointer',
		'[&::-moz-range-thumb]:transition-all'
	);

	return combineClasses(
		baseClasses,
		sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.md,
		variantAwareBackground,
		sliderThumbStyles,
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
 * Get delete button specific styling classes using CSS custom properties
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
