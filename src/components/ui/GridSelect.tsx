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
	layout?: 'stacked' | 'compact' | 'minimal'; // Layout options like GridSlider
	showValue?: boolean; // Control value display
	textSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl'; // Text size for label and value
}

export function GridSelect({
	gridWidth,
	gridHeight,
	gridX,
	gridY,
	showDimensions = false,
	className = '',
	selectProps,
	label,
	layout = 'stacked',
	showValue = true,
	textSize = 'xs',
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
			showDimensions={showDimensions}
			className={combineClasses('p-0', className)}
			transparentBackground={true}
			{...rest}
		>
			{/* Container that adapts based on layout */}
			<div className={combineClasses(
				'w-full h-full p-1',
				layout === 'minimal' ? 'flex items-center justify-center' :
				layout === 'compact' ? 'flex flex-col justify-center gap-1' :
				'flex flex-col justify-between' // stacked layout
			)}>
				{/* Label section - only show if label exists and layout isn't minimal */}
				{label && layout !== 'minimal' && (
					<div className='flex-shrink-0'>
						<div className='text-center mb-1'>
							<span className={combineClasses(
								'font-medium text-gray-700 dark:text-gray-300',
								textSize === 'xs' ? 'text-xs' :
								textSize === 'sm' ? 'text-sm' :
								textSize === 'base' ? 'text-base' :
								textSize === 'lg' ? 'text-lg' :
								textSize === 'xl' ? 'text-xl' :
								'text-xs'
							)}>
								{label}
							</span>
						</div>
					</div>
				)}

				{/* Select section */}
				<div className={combineClasses(
					'flex items-center justify-center',
					layout === 'stacked' ? 'flex-grow' : ''
				)}>
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
				</div>

				{/* Value section - only show if showValue is true and layout isn't minimal */}
				{showValue && layout !== 'minimal' && (
					<div className='flex-shrink-0'>
						<div className={combineClasses(
							'text-center text-gray-600 dark:text-gray-300',
							textSize === 'xs' ? 'text-xs' :
							textSize === 'sm' ? 'text-sm' :
							textSize === 'base' ? 'text-base' :
							textSize === 'lg' ? 'text-lg' :
							textSize === 'xl' ? 'text-xl' :
							'text-xs'
						)}>
							{options.find((opt) => opt.value === value)?.label || value}
						</div>
					</div>
				)}
			</div>
		</GridBlock>
	);
}
