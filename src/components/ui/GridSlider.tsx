import React from 'react';
import { GridBlock, type GridBlockProps } from '../GridBlock';
import type { ComponentColor, ComponentSize } from '../../types/ui';
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
	color?: ComponentColor;
	// Override specific accessibility props for better typing
	'aria-label'?: string;
	'aria-describedby'?: string;
}

export interface GridSliderProps extends Omit<GridBlockProps, 'children'> {
	sliderProps: SliderProps;
	label?: string;
}

export function GridSlider({
	gridWidth,
	gridHeight,
	gridX,
	gridY,
	showDimensions = false,
	className = '',
	sliderProps,
	label,
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
		color = 'default',
		disabled,
		onChange,
		onPointerDown,
		'aria-label': ariaLabel,
		'aria-describedby': ariaDescribedBy,
		...inputSpecificProps
	} = sliderProps;

	// Use utility function for consistent styling
	const sliderInputClasses = getSliderTrackClasses(color, size, disabled);

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
			gridWidth={gridWidth}
			gridHeight={gridHeight}
			gridX={gridX}
			gridY={gridY}
			showDimensions={showDimensions}
			className={combineClasses('flex flex-col justify-center', className)}
			{...rest}
		>
			{/* Label/title above */}
			{label && (
				<div className='mb-1 text-center'>
					<span className='text-xs font-medium text-gray-700 dark:text-gray-300'>
						{label}
					</span>
				</div>
			)}

			{/* Slider row: min | slider | max */}
			<div className='flex items-center gap-2 w-full px-1'>
				{showMinMax && (
					<span className='text-xs font-medium text-gray-600 dark:text-gray-400 min-w-fit'>
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
					<span className='text-xs font-medium text-gray-600 dark:text-gray-400 min-w-fit'>
						{max}
					</span>
				)}
			</div>

			{/* Value below slider */}
			<div className='mt-1 text-center text-xs text-gray-600 dark:text-gray-300'>
				{formatValue ? formatValue(value) : value}
			</div>
		</GridBlock>
	);
}
