/**
 * Simplified style utilities for Tailwind v4 with CSS custom properties
 */

export function combineClasses(
	...classes: (string | undefined | false)[]
): string {
	return classes.filter(Boolean).join(' ');
}

/**
 * Button variant styles with proper accessibility - simplified for CSS custom properties
 */
export function getButtonVariantClasses(variant: string): string {
	const baseClasses =
		'px-3 py-1.5 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800';

	const variantClasses: Record<string, string> = {
		default:
			'bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-100 focus:ring-gray-400',
		// Tone.js category variants
		core: 'bg-[var(--node-accent)] hover:bg-[var(--node-accent)]/80 text-white focus:ring-[var(--node-accent)]',
		source:
			'bg-[var(--node-accent)] hover:bg-[var(--node-accent)]/80 text-white focus:ring-[var(--node-accent)]',
		instrument:
			'bg-[var(--node-accent)] hover:bg-[var(--node-accent)]/80 text-white focus:ring-[var(--node-accent)]',
		effect:
			'bg-[var(--node-accent)] hover:bg-[var(--node-accent)]/80 text-white focus:ring-[var(--node-accent)]',
		component:
			'bg-[var(--node-accent)] hover:bg-[var(--node-accent)]/80 text-white focus:ring-[var(--node-accent)]',
		signal:
			'bg-[var(--node-accent)] hover:bg-[var(--node-accent)]/80 text-white focus:ring-[var(--node-accent)]',
		event:
			'bg-[var(--node-accent)] hover:bg-[var(--node-accent)]/80 text-white focus:ring-[var(--node-accent)]',
		unit: 'bg-[var(--node-accent)] hover:bg-[var(--node-accent)]/80 text-white focus:ring-[var(--node-accent)]',
	};

	return combineClasses(
		baseClasses,
		variantClasses[variant] || variantClasses.default
	);
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
