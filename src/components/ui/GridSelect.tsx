import React from 'react';
import { GridBlock, type GridBlockProps } from '../GridBlock';
import type { ComponentColor } from '../../types/ui';
import { combineClasses } from '../../utils/styleUtils';

// Select props interface
export interface SelectProps
	extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
	value: string | number;
	options: Array<{ value: string | number; label: string }>;
	color?: ComponentColor;
	// Override specific accessibility props for better typing
	'aria-label'?: string;
	'aria-describedby'?: string;
}

export interface GridSelectProps extends Omit<GridBlockProps, 'children'> {
	selectProps: SelectProps;
	label?: string;
}

export function GridSelect({
	gridWidth,
	gridHeight,
	gridX,
	gridY,
	variant = 'default',
	showDimensions = false,
	className = '',
	selectProps,
	label,
	...rest
}: GridSelectProps) {
	const {
		value,
		options,
		onChange,
		onPointerDown,
		disabled,
		'aria-label': ariaLabel,
		'aria-describedby': ariaDescribedBy,
		...selectSpecificProps
	} = selectProps;

	// Build select classes using utilities
	const selectClasses = combineClasses(
		'nodrag w-full text-xs rounded px-2 py-1 border transition-colors',
		'bg-gray-100 dark:bg-gray-700',
		'border-gray-300 dark:border-gray-600',
		'text-gray-900 dark:text-gray-100',
		'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
		disabled
			? 'opacity-50 cursor-not-allowed'
			: 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600',
		className
	);

	// Handle pointer down to prevent node dragging
	const handlePointerDown = (e: React.PointerEvent<HTMLSelectElement>) => {
		e.stopPropagation();
		onPointerDown?.(e);
	};

	// Enhanced accessibility
	const accessibilityProps = {
		'aria-label': ariaLabel || `${label || 'Select'} control`,
		'aria-describedby': ariaDescribedBy,
	};

	return (
		<GridBlock
			gridWidth={gridWidth}
			gridHeight={gridHeight}
			gridX={gridX}
			gridY={gridY}
			variant={variant}
			showDimensions={showDimensions}
			className={combineClasses('flex flex-col justify-center', className)}
			{...rest}
		>
			{/* Label above select */}
			{label && (
				<div className='mb-1 text-center'>
					<span className='text-xs font-medium text-gray-700 dark:text-gray-300'>
						{label}
					</span>
				</div>
			)}

			{/* Select input */}
			<div className='flex items-center justify-center w-full px-1'>
				<select
					value={value}
					onChange={onChange}
					onPointerDown={handlePointerDown}
					className={selectClasses}
					disabled={disabled}
					{...accessibilityProps}
					{...selectSpecificProps}
				>
					{options.map((option) => (
						<option
							key={option.value}
							value={option.value}
						>
							{option.label}
						</option>
					))}
				</select>
			</div>

			{/* Current value below select */}
			<div className='mt-1 text-center text-xs text-gray-600 dark:text-gray-300'>
				{options.find((opt) => opt.value === value)?.label || value}
			</div>
		</GridBlock>
	);
}
