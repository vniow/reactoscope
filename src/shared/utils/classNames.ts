/**
 * Simple class name utility for merging classes
 * Follows Tailwind v4 best practices for class composition
 */

type ClassValue = string | number | boolean | undefined | null;

/**
 * Merge class names with proper handling of falsy values
 * Optimized for Tailwind v4 usage patterns
 */
export function cn(...classes: ClassValue[]): string {
	return classes.filter(Boolean).join(' ').trim();
}

/**
 * Conditional class merger - applies classes based on conditions
 * @param baseClasses - Base classes to always apply
 * @param conditionalClasses - Object with condition -> classes mapping
 */
export function conditionalClasses(
	baseClasses: string,
	conditionalClasses: Record<string, boolean>
): string {
	const conditional = Object.entries(conditionalClasses)
		.filter(([, condition]) => condition)
		.map(([className]) => className);

	return cn(baseClasses, ...conditional);
}

/**
 * Merge theme classes with user overrides
 * Prioritizes user-provided classes for customization
 */
export function mergeThemeClasses(
	themeClasses: string,
	userClasses?: string
): string {
	return cn(themeClasses, userClasses);
}
