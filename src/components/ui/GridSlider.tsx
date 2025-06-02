import React from 'react';
import { GridBlock, type GridBlockProps } from '../GridBlock';

// Define props for the internal slider, similar to the original SliderProps
// but tailored for direct use within GridSlider.
export interface InternalSliderProps
	extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
	value: number;
	min: number;
	max: number;
	step?: number;
	formatValue?: (value: number) => string;
	showMinMax?: boolean;
	size?: 'sm' | 'md' | 'lg';
	color?: 'default' | 'orange' | 'green' | 'red' | 'blue';
}

export interface GridSliderProps extends Omit<GridBlockProps, 'children'> {
	sliderProps: InternalSliderProps;
	label?: string; // Optional label to display above the slider
}

export function GridSlider({
	gridWidth,
	gridHeight,
	gridX,
	gridY,
	variant = 'default',
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
		...inputSpecificProps // any other native input props
	} = sliderProps;

	// Format the display value
	// const displayValue = formatValue ? formatValue(value) : value.toString();

	// Base slider styles - can be adjusted or expanded
	const sliderInputClasses = [
		'w-full rounded-lg appearance-none cursor-pointer transition-all',
		'nodrag', // Prevent React Flow node dragging
		size === 'sm' ? 'h-1' : size === 'lg' ? 'h-3' : 'h-2',
		color === 'orange'
			? 'bg-orange-200 dark:bg-orange-800'
			: color === 'green'
				? 'bg-green-200 dark:bg-green-800'
				: color === 'red'
					? 'bg-red-200 dark:bg-red-800'
					: color === 'blue'
						? 'bg-blue-200 dark:bg-blue-800'
						: 'bg-gray-200 dark:bg-gray-700',
		disabled && 'opacity-50 cursor-not-allowed',
	]
		.filter(Boolean)
		.join(' ');

	const handlePointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
		e.stopPropagation();
		onPointerDown?.(e);
	};

	return (
		<GridBlock
			gridWidth={gridWidth}
			gridHeight={gridHeight}
			gridX={gridX}
			gridY={gridY}
			variant={variant}
			showDimensions={showDimensions}
			className={className}
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
			<div className='flex items-center gap-2 w-full'>
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
