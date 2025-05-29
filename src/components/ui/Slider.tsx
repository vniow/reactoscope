import React, { forwardRef } from 'react';

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
	size?: 'sm' | 'md' | 'lg';
	color?: 'default' | 'orange' | 'green' | 'red' | 'blue';
}

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

		// Base slider styles
		const sliderClasses = [
			'w-full rounded-lg appearance-none cursor-pointer transition-all',
			// Size variants
			size === 'sm' ? 'h-1' : size === 'lg' ? 'h-3' : 'h-2',
			// Color variants for track
			color === 'orange'
				? 'bg-orange-200 dark:bg-orange-800'
				: color === 'green'
					? 'bg-green-200 dark:bg-green-800'
					: color === 'red'
						? 'bg-red-200 dark:bg-red-800'
						: color === 'blue'
							? 'bg-blue-200 dark:bg-blue-800'
							: 'bg-gray-200 dark:bg-gray-700',
			// Disabled state
			disabled && 'opacity-50 cursor-not-allowed',
			className,
		]
			.filter(Boolean)
			.join(' ');

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
