import React, { forwardRef } from 'react';
import type { SliderSize, SliderColor } from '../../types/ui';
import { combineClasses } from '../../utils/styleUtils';

export interface SliderProps
	extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
	label?: string;
	value: number;
	min: number;
	max: number;
	step?: number;
	formatValue?: (value: number) => string;
	showMinMax?: boolean;
	variant?: 'default' | 'compact';
	size?: SliderSize;
	color?: SliderColor;
}

// Slider configuration
const SLIDER_CONFIG = {
	sizes: {
		sm: 'h-1',
		md: 'h-2',
		lg: 'h-3',
	},
	colors: {
		default: 'bg-gray-200 dark:bg-gray-700',
		orange: 'bg-orange-200 dark:bg-orange-800',
		green: 'bg-green-200 dark:bg-green-800',
		red: 'bg-red-200 dark:bg-red-800',
		blue: 'bg-blue-200 dark:bg-blue-800',
	},
} as const;

const Slider = forwardRef<HTMLInputElement, SliderProps>(
	(
		{
			className = '',
			label,
			value,
			min,
			max,
			step = 1,
			formatValue,
			showMinMax = true,
			variant = 'default',
			size = 'md',
			color = 'default',
			disabled,
			onChange,
			onPointerDown,
			...props
		},
		ref
	) => {
		// Format the display value
		const displayValue = formatValue ? formatValue(value) : value.toString();

		// Build slider classes using utilities and configuration
		const sliderClasses = combineClasses(
			'w-full rounded-lg appearance-none cursor-pointer transition-all nodrag',
			SLIDER_CONFIG.sizes[size],
			SLIDER_CONFIG.colors[color],
			disabled ? 'opacity-50 cursor-not-allowed' : '',
			className
		);

		// Handle pointer down to prevent node dragging
		const handlePointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
			e.stopPropagation();
			onPointerDown?.(e);
		};

		if (variant === 'compact') {
			return (
				<div className='space-y-1'>
					{label && (
						<div className='flex justify-between items-center'>
							<label className='text-xs font-medium text-gray-700 dark:text-gray-300'>
								{label}
							</label>
							<span className='text-xs text-gray-600 dark:text-gray-400'>
								{displayValue}
							</span>
						</div>
					)}
					<input
						ref={ref}
						type='range'
						value={value}
						min={min}
						max={max}
						step={step}
						onChange={onChange}
						onPointerDown={handlePointerDown}
						className={sliderClasses}
						disabled={disabled}
						{...props}
					/>
				</div>
			);
		}

		return (
			<div className='space-y-1'>
				{label && (
					<label className='text-xs font-medium text-gray-700 dark:text-gray-300'>
						{label}: {displayValue}
					</label>
				)}
				<input
					ref={ref}
					type='range'
					value={value}
					min={min}
					max={max}
					step={step}
					onChange={onChange}
					onPointerDown={handlePointerDown}
					className={sliderClasses}
					disabled={disabled}
					{...props}
				/>
				{showMinMax && (
					<div className='flex justify-between text-xs text-gray-500 dark:text-gray-400'>
						<span>{min}</span>
						{max > min * 2 && (
							<span>{((min + max) / 2).toFixed(step < 1 ? 2 : 0)}</span>
						)}
						<span>{max}</span>
					</div>
				)}
			</div>
		);
	}
);

Slider.displayName = 'Slider';

export { Slider };
