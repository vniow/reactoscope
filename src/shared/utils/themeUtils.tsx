/**
 * Tailwind v4 Theme Variables - React Usage Examples
 *
 * This file demonstrates how to use the theme variables in React components
 * with different approaches for maximum flexibility.
 */

import React from 'react';
import type { ComponentVariant, ComponentSize } from '../types/ui';

/* === UTILITY FUNCTIONS === */

/**
 * Get a theme variable value for use in JavaScript
 */
export function getThemeValue(variable: string): string {
	return `var(--${variable})`;
}

/**
 * Create variant class name
 */
export function createVariantClass(variant: ComponentVariant): string {
	return `variant-${variant}`;
}

/**
 * Build theme-aware className strings
 */
export function buildThemeClasses(
	...classes: (string | undefined | false)[]
): string {
	return classes.filter(Boolean).join(' ');
}

/* === REACT COMPONENT EXAMPLES === */

/**
 * Example 1: Using Tailwind utilities with theme variables
 */
export function ThemeButton({
	variant = 'core',
	size = 'md',
	children,
	...props
}: {
	variant?: ComponentVariant;
	size?: ComponentSize;
	children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
	const sizeClasses = {
		sm: 'px-3 py-1.5 text-sm',
		md: 'px-4 py-2 text-base',
		lg: 'px-6 py-3 text-lg',
	};

	return (
		<button
			className={buildThemeClasses(
				// Base button styles using theme variables
				'interactive-surface',
				'font-medium rounded-[var(--radius-control)]',
				'transition-all duration-[var(--duration-normal)]',
				'hover:scale-105 active:scale-95',
				'focus-visible:outline-none focus-visible:ring-2',
				'focus-visible:ring-[var(--color-interactive-border-focus)]',
				'nodrag', // Prevent React Flow dragging

				// Size classes
				sizeClasses[size],

				// Variant class
				createVariantClass(variant)
			)}
			{...props}
		>
			{children}
		</button>
	);
}

/**
 * Example 2: Using CSS custom properties in style objects
 */
export function ThemeCard({
	variant = 'core',
	elevated = false,
	children,
	style,
	...props
}: {
	variant?: ComponentVariant;
	elevated?: boolean;
	children: React.ReactNode;
	style?: React.CSSProperties;
} & React.HTMLAttributes<HTMLDivElement>) {
	const cardStyle: React.CSSProperties = {
		backgroundColor: getThemeValue('color-surface'),
		borderColor: getThemeValue(`color-variant-${variant}`),
		borderWidth: '2px',
		borderStyle: 'solid',
		borderRadius: getThemeValue('radius-lg'),
		padding: getThemeValue('spacing-handle-md'),
		boxShadow: elevated
			? getThemeValue('shadow-node-selected')
			: getThemeValue('shadow-elevated'),
		transition: `all ${getThemeValue('duration-normal')} ${getThemeValue('ease-standard')}`,
		...style,
	};

	return (
		<div
			style={cardStyle}
			className={buildThemeClasses('relative', createVariantClass(variant))}
			{...props}
		>
			{children}
		</div>
	);
}

/**
 * Example 3: Explicit layout component using theme variables
 */
export function ThemeLayoutBlock({
	variant = 'core',
	children,
	className = '',
	...props
}: {
	variant?: ComponentVariant;
	children: React.ReactNode;
	className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={buildThemeClasses(
				'layout-block',
				createVariantClass(variant),
				'p-2 flex flex-col',
				className
			)}
			{...props}
		>
			{children}
		</div>
	);
}

/**
 * Example 4: Audio node with theme integration
 */
export function ThemeAudioNode({
	nodeId,
	title,
	selected = false,
	children,
	...props
}: {
	nodeId: string;
	title: string;
	selected?: boolean;
	children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={buildThemeClasses(
				'audio-node',
				selected && 'selected',
				'min-w-[150px] min-h-[100px]'
			)}
			{...props}
		>
			{/* Header using theme variables */}
			<div className='node-header'>{title}</div>

			{/* Content area */}
			<div className='flex-1 p-2'>{children}</div>

			{/* Selection indicator */}
			{selected && (
				<div
					className='absolute -inset-1 rounded-[var(--radius-node)] border-2 pointer-events-none'
					style={{
						borderColor: getThemeValue('color-interactive-border-focus'),
						boxShadow: `0 0 0 2px ${getThemeValue('color-interactive-border-focus')}40`,
					}}
				/>
			)}
		</div>
	);
}

/**
 * Example 5: Slider component with theme variables
 */
export function ThemeSlider({
	value,
	min = 0,
	max = 100,
	variant = 'core',
	disabled = false,
	...props
}: {
	value: number;
	min?: number;
	max?: number;
	variant?: ComponentVariant;
	disabled?: boolean;
} & Omit<
	React.InputHTMLAttributes<HTMLInputElement>,
	'type' | 'min' | 'max' | 'value'
>) {
	const sliderStyle: React.CSSProperties = {
		'--slider-progress': `${((value - min) / (max - min)) * 100}%`,
		'--variant-color': getThemeValue(`color-variant-${variant}`),
	} as React.CSSProperties;

	return (
		<div className='relative'>
			<input
				type='range'
				min={min}
				max={max}
				value={value}
				disabled={disabled}
				style={sliderStyle}
				className={buildThemeClasses(
					'w-full h-2 rounded-full appearance-none cursor-pointer',
					'bg-[var(--color-interactive-bg)]',
					'border border-[var(--color-interactive-border)]',
					'transition-all duration-[var(--duration-normal)]',
					'hover:border-[var(--variant-color)]',
					'focus:outline-none focus:ring-2 focus:ring-[var(--variant-color)]',
					disabled && 'opacity-50 cursor-not-allowed',
					'nodrag'
				)}
				{...props}
			/>

			{/* Custom slider track with theme colors */}
			<div
				className='absolute inset-0 rounded-full pointer-events-none'
				style={{
					background: `linear-gradient(to right, var(--variant-color) 0%, var(--variant-color) var(--slider-progress), transparent var(--slider-progress))`,
				}}
			/>
		</div>
	);
}

/**
 * Example 6: Using theme variables with arbitrary values in className
 */
export function ArbitraryValueExample() {
	return (
		<div
			className={buildThemeClasses(
				// Background with theme variable
				'bg-[var(--color-surface)]',

				// Border with theme variable
				'border-[var(--color-interactive-border)]',
				'border-2',

				// Rounded corners with theme variable
				'rounded-[var(--radius-lg)]',

				// Padding with theme variable
				'p-[var(--spacing-handle-md)]',

				// Shadow with theme variable
				'shadow-[var(--shadow-elevated)]',

				// Transition with theme variables
				'transition-all',
				'duration-[var(--duration-normal)]',

				// Hover effects using color-mix
				'hover:bg-[color-mix(in_srgb,var(--color-variant-primary)_10%,var(--color-surface))]',
				'hover:border-[var(--color-variant-primary)]',
				'hover:shadow-[var(--shadow-node)]'
			)}
		>
			Arbitrary value example with theme variables
		</div>
	);
}

/* === HOOK FOR THEME VALUES === */

/**
 * Custom hook to get computed theme values
 */
export function useThemeValue(variable: string): string | undefined {
	const [value, setValue] = React.useState<string | undefined>(undefined);

	React.useEffect(() => {
		if (typeof window !== 'undefined') {
			const computedValue = getComputedStyle(document.documentElement)
				.getPropertyValue(`--${variable}`)
				.trim();
			setValue(computedValue || undefined);
		}
	}, [variable]);

	return value;
}

/**
 * Hook to check if dark mode is active
 */
export function useDarkMode(): boolean {
	const [isDark, setIsDark] = React.useState(false);

	React.useEffect(() => {
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const hasClassDark = document.documentElement.classList.contains('dark');

		setIsDark(mediaQuery.matches || hasClassDark);

		const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
		mediaQuery.addEventListener('change', handler);

		return () => mediaQuery.removeEventListener('change', handler);
	}, []);

	return isDark;
}
