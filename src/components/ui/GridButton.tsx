import React from 'react';
import { GridBlock, type GridBlockProps } from '../GridBlock';
import type { ComponentSize } from '../../types/ui';
import { combineClasses } from '../../utils/styleUtils';

export interface GridButtonProps extends Omit<GridBlockProps, 'children'> {
	onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
	buttonLabel: string;
	buttonClassName?: string;
	disabled?: boolean;
	variant?:
		| 'primary'
		| 'secondary'
		| 'success'
		| 'warning'
		| 'danger'
		| 'node-variant';
	size?: ComponentSize;
	layout?: 'fill' | 'compact' | 'minimal'; // Layout options similar to other UI components
	icon?: React.ReactNode; // Optional icon support
	'aria-label'?: string;
	'aria-describedby'?: string;
}

/**
 * GridButton Component - Variant-aware button with grid positioning
 *
 * VARIANTS:
 * - 'primary': Standard action button using accent colors
 * - 'secondary': Subtle button for secondary actions
 * - 'success': Green button for positive actions (play, save, etc.)
 * - 'warning': Orange button for caution actions
 * - 'danger': Red button for destructive actions (stop, delete, etc.)
 * - 'node-variant': Inherits the parent node's variant colors (default)
 *
 * LAYOUT OPTIONS:
 * - 'fill': Button fills the entire grid area (default)
 * - 'compact': Button with padding, smaller than grid area
 * - 'minimal': Button with minimal padding and styling
 *
 * USAGE EXAMPLES:
 *
 * // Node-variant button (inherits parent node's colors)
 * <GridButton
 *   gridWidth={2} gridHeight={1} gridX={0} gridY={0}
 *   buttonLabel="Node Action"
 *   variant="node-variant"
 *   onClick={handleClick}
 * />
 *
 * // Success button with icon
 * <GridButton
 *   gridWidth={3} gridHeight={1} gridX={1} gridY={5}
 *   buttonLabel="Play"
 *   variant="success"
 *   icon="▶️"
 *   layout="fill"
 *   onClick={handlePlay}
 * />
 *
 * // Danger button for stop action
 * <GridButton
 *   gridWidth={3} gridHeight={1} gridX={1} gridY={5}
 *   buttonLabel="Stop"
 *   variant="danger"
 *   icon="⏹️"
 *   layout="fill"
 *   onClick={handleStop}
 * />
 *
 * // Secondary button with compact layout
 * <GridButton
 *   gridWidth={2} gridHeight={1} gridX={0} gridY={2}
 *   buttonLabel="Reset"
 *   variant="secondary"
 *   layout="compact"
 *   size="sm"
 *   onClick={handleReset}
 * />
 */

export function GridButton({
	gridWidth,
	gridHeight,
	gridX,
	gridY,
	showDimensions = false,
	className = '',
	buttonLabel,
	onClick,
	buttonClassName = '',
	disabled = false,
	variant = 'node-variant',
	size = 'md',
	layout = 'fill',
	icon,
	'aria-label': ariaLabel,
	'aria-describedby': ariaDescribedBy,
	...rest
}: GridButtonProps) {
	// Generate variant-aware button classes
	const getButtonClasses = () => {
		const baseClasses = combineClasses(
			'nodrag',
			'font-medium',
			'rounded-md',
			'transition-all',
			'duration-200',
			'focus:outline-none',
			// 'focus:ring-2',
			// 'focus:ring-offset-2',
			// 'focus:ring-opacity-50',
			'dark:focus:ring-offset-gray-800',
			'flex',
			'items-center',
			'justify-center',
			'gap-2',
			'transform',
			'origin-center',
			// Ensure rounded corners are preserved during transforms
			'will-change-transform',
			'backface-visibility-hidden'
		);

		// Size classes
		const sizeClasses = {
			sm: 'text-xs px-2 py-1',
			md: 'text-sm px-3 py-2',
			lg: 'text-base px-4 py-2',
		};

		// Layout classes
		const layoutClasses = {
			fill: 'w-full h-full',
			compact: 'w-full h-full max-w-full max-h-full m-1',
			minimal: 'w-auto h-auto min-w-fit min-h-fit px-2 py-1',
		};

		// Variant classes using CSS custom properties
		const variantClasses = {
			'node-variant': combineClasses(
				'bg-[var(--node-accent,light-dark(#3b82f6,#60a5fa))]',
				'hover:bg-[var(--node-accent,light-dark(#3b82f6,#60a5fa))]/80',
				'text-[var(--node-text-on-accent,white)]',
				'focus:ring-[var(--node-accent,light-dark(#3b82f6,#60a5fa))]/50',
				'border',
				'border-transparent',
				'focus:border-[var(--node-accent,light-dark(#3b82f6,#60a5fa))]'
			),
			primary: combineClasses(
				'bg-blue-600 hover:bg-blue-700',
				'text-white',
				'focus:ring-blue-500/50',
				'border border-transparent',
				'focus:border-blue-500'
			),
			secondary: combineClasses(
				'bg-gray-200 hover:bg-gray-300',
				'dark:bg-gray-600 dark:hover:bg-gray-500',
				'text-gray-900 dark:text-gray-100',
				'focus:ring-gray-400/50',
				'border border-gray-300 dark:border-gray-500',
				'focus:border-gray-500 dark:focus:border-gray-400'
			),
			success: combineClasses(
				'bg-green-600 hover:bg-green-700',
				'text-white',
				'focus:ring-green-500/50',
				'border border-transparent',
				'focus:border-green-500'
			),
			warning: combineClasses(
				'bg-orange-500 hover:bg-orange-600',
				'text-white',
				'focus:ring-orange-400/50',
				'border border-transparent',
				'focus:border-orange-400'
			),
			danger: combineClasses(
				'bg-red-600 hover:bg-red-700',
				'text-white',
				'focus:ring-red-500/50',
				'border border-transparent',
				'focus:border-red-500'
			),
		};

		const disabledClasses = disabled
			? 'opacity-50 cursor-not-allowed pointer-events-none'
			: combineClasses(
					'cursor-pointer',
					// Improved hover/active effects that preserve rounded corners
					'hover:scale-[1.02]',
					'active:scale-[0.98]',
					'hover:shadow-sm',
					'active:shadow-none',
					// Ensure smooth transitions
					'ease-out'
				);

		return combineClasses(
			baseClasses,
			sizeClasses[size],
			layoutClasses[layout],
			variantClasses[variant],
			disabledClasses,
			buttonClassName
		);
	};

	const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
		if (!disabled) {
			onClick?.(e);
		}
	};

	const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
		e.stopPropagation(); // Prevent node dragging
	};

	// Get the computed button classes
	const buttonClasses = getButtonClasses();

	return (
		<GridBlock
			gridWidth={gridWidth}
			gridHeight={gridHeight}
			gridX={gridX}
			gridY={gridY}
			showDimensions={showDimensions}
			className={combineClasses(
				layout === 'fill' ? 'p-0' : 'flex items-center justify-center p-1',
				className
			)}
			transparentBackground={true}
			{...rest}
		>
			<button
				onClick={handleClick}
				onPointerDown={handlePointerDown}
				disabled={disabled}
				aria-label={ariaLabel || buttonLabel}
				aria-describedby={ariaDescribedBy}
				className={buttonClasses}
				style={{
					// Ensure proper rendering of rounded corners during transforms
					transformStyle: 'preserve-3d',
					WebkitFontSmoothing: 'antialiased',
					MozOsxFontSmoothing: 'grayscale',
				}}
			>
				{/* Icon support */}
				{icon && <span className='flex-shrink-0'>{icon}</span>}
				{/* Button text - only render if not empty */}
				{buttonLabel && (
					<span className={icon ? 'truncate' : ''}>{buttonLabel}</span>
				)}
			</button>
		</GridBlock>
	);
}
