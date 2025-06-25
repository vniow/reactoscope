import React from 'react';
import { GridBlock, type GridBlockProps } from '../GridBlock';
import type { ComponentSize } from '../../types/ui';
import { getSliderTrackClasses, combineClasses } from '../../utils/styleUtils';

// Improved slider props with better TypeScript constraints and accessibility
export interface SliderProps
	extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
	value: number;
	min: number;
	max: number;
	step?: number;
	formatValue?: (value: number) => string;
	showMinMax?: boolean;
	size?: ComponentSize;
	// Override specific accessibility props for better typing
	'aria-label'?: string;
	'aria-describedby'?: string;
}

export interface GridSliderProps extends Omit<GridBlockProps, 'children'> {
	sliderProps: SliderProps;
	label?: string;
	layout?: 'stacked' | 'compact' | 'minimal'; // New layout options
	showValue?: boolean; // Control value display
	textSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl'; // Text size for label and value
}

/**
 * GridSlider Component - Now with proper vertical positioning
 *
 * LAYOUT OPTIONS:
 * - 'stacked': Full vertical distribution (label top, slider center, value bottom) - Best for tall grid areas
 * - 'compact': Tight vertical layout with small gaps - Good for medium height grid areas
 * - 'minimal': Just the slider, no label or value display - Best for single-row grid areas
 *
 * POSITIONING FIXES:
 * - Removed justify-center from GridBlock to prevent all elements being centered
 * - Used flex-grow on slider section in stacked mode to fill available space
 * - Added proper flex-shrink-0 to prevent label/value sections from shrinking
 * - Set transparentBackground={true} and p-0 for better integration with parent containers
 */

export function GridSlider({
	showDimensions = false,
	className = '',
	sliderProps,
	label,
	layout = 'stacked',
	showValue = true,
	textSize = 'xs',
	...rest
}: GridSliderProps) {
	const {
		value,
		min,
		max,
		step = 1,
		formatValue,
		showMinMax = true,
		size = 'md',
		disabled,
		onChange,
		onPointerDown,
		'aria-label': ariaLabel,
		'aria-describedby': ariaDescribedBy,
		...inputSpecificProps
	} = sliderProps;

	// Use utility function for consistent styling - now variant-aware
	const sliderInputClasses = getSliderTrackClasses(size, disabled);

	const handlePointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
		e.stopPropagation();
		onPointerDown?.(e);
	};

	// Enhanced accessibility
	const accessibilityProps = {
		'aria-label': ariaLabel || `${label || 'Slider'} control`,
		'aria-describedby': ariaDescribedBy,
		'aria-valuemin': min,
		'aria-valuemax': max,
		'aria-valuenow': value,
		'aria-valuetext': formatValue ? formatValue(value) : value.toString(),
	};

	return (
		<GridBlock
			showDimensions={showDimensions}
			className={combineClasses('p-0', className)}
			transparentBackground={true}
			{...rest}
		>
			{/* Container that adapts based on layout */}
			<div
				className={combineClasses(
					'w-full h-full p-1',
					layout === 'minimal'
						? 'flex items-center justify-center'
						: layout === 'compact'
							? 'flex flex-col justify-center gap-1'
							: 'flex flex-col justify-between' // stacked layout
				)}
			>
				{/* Label section - only show if label exists and layout isn't minimal */}
				{label && layout !== 'minimal' && (
					<div className='flex-shrink-0'>
						<div className='text-center mb-1'>
							<span
								className={combineClasses(
									'font-medium text-[var(--node-text-primary,light-dark(#374151,#f3f4f6))]',
									textSize === 'xs'
										? 'text-xs'
										: textSize === 'sm'
											? 'text-sm'
											: textSize === 'base'
												? 'text-base'
												: textSize === 'lg'
													? 'text-lg'
													: textSize === 'xl'
														? 'text-xl'
														: 'text-xs'
								)}
							>
								{label}
							</span>
						</div>
					</div>
				)}

				{/* Slider section */}
				<div
					className={combineClasses(
						'flex items-center justify-center',
						layout === 'stacked' ? 'flex-grow' : ''
					)}
				>
					<div className='flex items-center gap-2 w-full px-1'>
						{showMinMax && (
							<span
								className={combineClasses(
									'font-medium text-[var(--node-text-primary,light-dark(#6b7280,#d1d5db))] min-w-fit',
									textSize === 'xs'
										? 'text-xs'
										: textSize === 'sm'
											? 'text-sm'
											: textSize === 'base'
												? 'text-base'
												: textSize === 'lg'
													? 'text-lg'
													: textSize === 'xl'
														? 'text-xl'
														: 'text-xs'
								)}
							>
								{min}
							</span>
						)}
						<input
							type='range'
							value={value}
							min={min}
							max={max}
							step={step}
							onChange={onChange}
							onPointerDown={handlePointerDown}
							className={sliderInputClasses}
							disabled={disabled}
							{...accessibilityProps}
							{...inputSpecificProps}
						/>
						{showMinMax && (
							<span
								className={combineClasses(
									'font-medium text-[var(--node-text-primary,light-dark(#6b7280,#d1d5db))] min-w-fit',
									textSize === 'xs'
										? 'text-xs'
										: textSize === 'sm'
											? 'text-sm'
											: textSize === 'base'
												? 'text-base'
												: textSize === 'lg'
													? 'text-lg'
													: textSize === 'xl'
														? 'text-xl'
														: 'text-xs'
								)}
							>
								{max}
							</span>
						)}
					</div>
				</div>

				{/* Value section - only show if showValue is true and layout isn't minimal */}
				{showValue && layout !== 'minimal' && (
					<div className='flex-shrink-0'>
						<div
							className={combineClasses(
								'text-center text-[var(--node-text-primary,light-dark(#6b7280,#d1d5db))]',
								textSize === 'xs'
									? 'text-xs'
									: textSize === 'sm'
										? 'text-sm'
										: textSize === 'base'
											? 'text-base'
											: textSize === 'lg'
												? 'text-lg'
												: textSize === 'xl'
													? 'text-xl'
													: 'text-xs'
							)}
						>
							{formatValue ? formatValue(value) : value}
						</div>
					</div>
				)}
			</div>
		</GridBlock>
	);
}
