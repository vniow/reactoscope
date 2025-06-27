import React from 'react';
import { getSliderTrackClasses, combineClasses } from '../../utils/styleUtils';

// === UNIFIED UI CONTROL COMPONENT ===

/**
 * GridControl - Unified component for all interactive UI elements
 *
 * Replaces GridButton, GridSlider, GridSelect, and provides Toggle functionality.
 * Eliminates duplication by providing a single, consistent API for all control types.
 * Uses Tailwind utilities and CSS custom properties for variant-aware styling.
 */

// === CONTROL TYPE DEFINITIONS ===

export type ControlType = 'button' | 'slider' | 'select' | 'toggle';

export type ControlVariant =
	| 'primary'
	| 'secondary'
	| 'success'
	| 'warning'
	| 'danger'
	| 'node-variant';

export type ControlLayout = 'fill' | 'compact' | 'minimal' | 'stacked';

export type TextSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl';

// === BASE PROPS ===

interface BaseControlProps {
	className?: string;
	style?: React.CSSProperties;
	variant?: ControlVariant;
	size?: 'sm' | 'md' | 'lg';
	layout?: ControlLayout;
	label?: string;
	textSize?: TextSize;
	disabled?: boolean;
	'aria-label'?: string;
	'aria-describedby'?: string;
}

// === CONTROL-SPECIFIC PROPS ===

interface ButtonControlProps extends BaseControlProps {
	type: 'button';
	buttonLabel: string;
	icon?: React.ReactNode;
	onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

interface SliderControlProps extends BaseControlProps {
	type: 'slider';
	value: number;
	min: number;
	max: number;
	step?: number;
	formatValue?: (value: number) => string;
	showMinMax?: boolean;
	showValue?: boolean;
	onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
	onPointerDown?: (event: React.PointerEvent<HTMLInputElement>) => void;
}

interface SelectControlProps extends BaseControlProps {
	type: 'select';
	value: string | number;
	options: Array<{ value: string | number; label: string }>;
	showValue?: boolean;
	onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
	onPointerDown?: (event: React.PointerEvent<HTMLSelectElement>) => void;
}

interface ToggleControlProps extends BaseControlProps {
	type: 'toggle';
	checked: boolean;
	toggleLabel?: string;
	showLabel?: boolean;
	onChange?: (checked: boolean) => void;
	onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

// === UNION TYPE ===

export type GridControlProps =
	| ButtonControlProps
	| SliderControlProps
	| SelectControlProps
	| ToggleControlProps;

// === MAIN COMPONENT ===

export function GridControl(props: GridControlProps) {
	const {
		className = '',
		style = {},
		variant = 'node-variant',
		size = 'md',
		layout = 'fill',
		label,
		textSize = 'xs',
		disabled = false,
		'aria-label': ariaLabel,
		'aria-describedby': ariaDescribedBy,
	} = props;

	// === STYLING UTILITIES ===

	const getTextSizeClass = (size: TextSize) => {
		const sizeMap = {
			xs: 'text-xs',
			sm: 'text-sm',
			base: 'text-base',
			lg: 'text-lg',
			xl: 'text-xl',
		};
		return sizeMap[size] || 'text-xs';
	};

	const getLayoutClasses = () => {
		const layoutMap = {
			minimal: 'flex items-center justify-center p-1',
			compact: 'flex flex-col justify-center gap-1 p-1',
			stacked: 'flex flex-col justify-between p-1',
			fill: 'w-full h-full p-1',
		};
		return layoutMap[layout] || layoutMap.fill;
	};

	const getVariantClasses = (
		elementType: 'button' | 'input' | 'select' | 'toggle'
	) => {
		const baseClasses = 'transition-all duration-200 focus:outline-none nodrag';

		if (variant === 'node-variant') {
			const variantMap = {
				button: combineClasses(
					baseClasses,
					'bg-[var(--node-accent)] hover:bg-[color-mix(in_srgb,var(--node-accent)_80%,_black)]',
					'text-[var(--node-text-on-accent)] border border-transparent rounded-md font-medium'
				),
				toggle: combineClasses(
					baseClasses,
					'relative inline-flex h-6 w-11 items-center rounded-full',
					'bg-[var(--node-bg-interactive)]',
					'border border-[var(--node-border)]'
				),
				input: combineClasses(
					baseClasses,
					'bg-[var(--node-bg-interactive)]',
					'border border-[var(--node-border)]',
					'text-[var(--node-text-primary)]',
					'rounded-md'
				),
				select: combineClasses(
					baseClasses,
					'bg-[var(--node-bg-interactive)]',
					'border border-[var(--node-border)]',
					'text-[var(--node-text-primary)]',
					'rounded-md'
				),
			};
			return variantMap[elementType] || variantMap.input;
		}

		// Standard variants
		const variantStyles = {
			primary:
				'bg-blue-600 hover:bg-blue-700 text-white border border-transparent rounded-md',
			secondary:
				'bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-500 rounded-md',
			success:
				'bg-green-600 hover:bg-green-700 text-white border border-transparent rounded-md',
			warning:
				'bg-orange-500 hover:bg-orange-600 text-white border border-transparent rounded-md',
			danger:
				'bg-red-600 hover:bg-red-700 text-white border border-transparent rounded-md',
		};

		return combineClasses(
			baseClasses,
			variantStyles[variant] || variantStyles.primary
		);
	};

	const getSizeClasses = () => {
		const sizeMap: Record<'sm' | 'md' | 'lg', string> = {
			sm: 'text-xs px-2 py-1',
			md: 'text-sm px-3 py-2',
			lg: 'text-base px-4 py-2',
		};
		return sizeMap[size as 'sm' | 'md' | 'lg'] || sizeMap.md;
	};

	// === RENDER FUNCTIONS ===

	const renderLabel = () => {
		if (!label || layout === 'minimal') return null;

		const labelClasses =
			variant === 'node-variant'
				? 'font-medium text-[var(--node-text-primary)]'
				: 'font-medium text-gray-700 dark:text-gray-200';

		return (
			<div className='flex-shrink-0'>
				<div className='text-center mb-1'>
					<span
						className={combineClasses(labelClasses, getTextSizeClass(textSize))}
					>
						{label}
					</span>
				</div>
			</div>
		);
	};

	const renderButton = (props: ButtonControlProps) => {
		const { buttonLabel, icon, onClick } = props;

		const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
			if (!disabled) onClick?.(e);
		};

		const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
			e.stopPropagation(); // Prevent node dragging
		};

		const buttonClasses = combineClasses(
			getVariantClasses('button'),
			getSizeClasses(),
			layout === 'fill' ? 'w-full h-full' : 'w-auto h-auto',
			'flex items-center justify-center gap-2',
			disabled
				? 'opacity-50 cursor-not-allowed'
				: 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]'
		);

		return (
			<button
				onClick={handleClick}
				onPointerDown={handlePointerDown}
				disabled={disabled}
				aria-label={ariaLabel || buttonLabel}
				aria-describedby={ariaDescribedBy}
				className={buttonClasses}
			>
				{icon && <span className='flex-shrink-0'>{icon}</span>}
				{buttonLabel && (
					<span className={icon ? 'truncate' : ''}>{buttonLabel}</span>
				)}
			</button>
		);
	};

	const renderSlider = (props: SliderControlProps) => {
		const {
			value,
			min,
			max,
			step = 1,
			formatValue,
			showMinMax = true,
			showValue = true,
			onChange,
			onPointerDown,
		} = props;

		const handlePointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
			e.stopPropagation();
			onPointerDown?.(e);
		};

		const sliderClasses = getSliderTrackClasses(size || 'md', disabled);

		const minMaxLabelClasses =
			variant === 'node-variant'
				? 'font-medium text-[var(--node-text-secondary)] min-w-fit'
				: 'font-medium text-gray-500 dark:text-gray-400 min-w-fit';

		const valueLabelClasses =
			variant === 'node-variant'
				? 'text-center text-[var(--node-text-secondary)]'
				: 'text-center text-gray-500 dark:text-gray-400';

		return (
			<>
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
									minMaxLabelClasses,
									getTextSizeClass(textSize)
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
							className={sliderClasses}
							disabled={disabled}
							aria-label={ariaLabel || `${label || 'Slider'} control`}
							aria-describedby={ariaDescribedBy}
							aria-valuemin={min}
							aria-valuemax={max}
							aria-valuenow={value}
							aria-valuetext={
								formatValue ? formatValue(value) : value.toString()
							}
						/>
						{showMinMax && (
							<span
								className={combineClasses(
									minMaxLabelClasses,
									getTextSizeClass(textSize)
								)}
							>
								{max}
							</span>
						)}
					</div>
				</div>

				{/* Value section */}
				{showValue && layout !== 'minimal' && (
					<div className='flex-shrink-0'>
						<div
							className={combineClasses(
								valueLabelClasses,
								getTextSizeClass(textSize)
							)}
						>
							{formatValue ? formatValue(value) : value}
						</div>
					</div>
				)}
			</>
		);
	};

	const renderSelect = (props: SelectControlProps) => {
		const { value, options, showValue = true, onChange, onPointerDown } = props;

		const handlePointerDown = (e: React.PointerEvent<HTMLSelectElement>) => {
			e.stopPropagation();
			onPointerDown?.(e);
		};

		const selectClasses = combineClasses(
			getVariantClasses('select'),
			'w-full px-2 py-1 cursor-pointer',
			disabled
				? 'opacity-50 cursor-not-allowed'
				: variant === 'node-variant'
					? 'hover:bg-[var(--node-bg-interactive-hover)]'
					: 'hover:bg-gray-200 dark:hover:bg-gray-600'
		);

		const valueLabelClasses =
			variant === 'node-variant'
				? 'text-center text-[var(--node-text-secondary)]'
				: 'text-center text-gray-600 dark:text-gray-400';

		return (
			<>
				{/* Select section */}
				<div
					className={combineClasses(
						'flex items-center justify-center',
						layout === 'stacked' ? 'flex-grow' : ''
					)}
				>
					<div className='flex items-center justify-center w-full px-1'>
						<select
							value={value}
							onChange={onChange}
							onPointerDown={handlePointerDown}
							className={selectClasses}
							disabled={disabled}
							aria-label={ariaLabel || `${label || 'Select'} control`}
							aria-describedby={ariaDescribedBy}
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

				{/* Value section */}
				{showValue && layout !== 'minimal' && (
					<div className='flex-shrink-0'>
						<div
							className={combineClasses(
								valueLabelClasses,
								getTextSizeClass(textSize)
							)}
						>
							{options.find((opt) => opt.value === value)?.label || value}
						</div>
					</div>
				)}
			</>
		);
	};

	const renderToggle = (props: ToggleControlProps) => {
		const { checked, toggleLabel, showLabel = true, onChange, onClick } = props;

		const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
			if (!disabled) {
				onChange?.(!checked);
				onClick?.(e);
			}
		};

		const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
			e.stopPropagation(); // Prevent node dragging
		};

		const toggleClasses = getVariantClasses('toggle');
		const thumbClasses = combineClasses(
			'inline-block h-4 w-4 transform rounded-full transition shadow-sm',
			variant === 'node-variant'
				? 'bg-[var(--node-accent)]'
				: 'bg-blue-500 dark:bg-blue-400',
			checked ? 'translate-x-6' : 'translate-x-1'
		);

		const labelClasses =
			variant === 'node-variant'
				? 'text-[var(--node-text-primary)]'
				: 'text-gray-700 dark:text-gray-200';

		return (
			<div className='flex items-center gap-2'>
				<button
					onClick={handleClick}
					onPointerDown={handlePointerDown}
					disabled={disabled}
					aria-label={ariaLabel || 'Toggle control'}
					aria-describedby={ariaDescribedBy}
					aria-pressed={checked}
					className={combineClasses(
						toggleClasses,
						disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
					)}
				>
					<span className={thumbClasses} />
				</button>
				{showLabel && toggleLabel && (
					<span
						className={combineClasses(labelClasses, getTextSizeClass(textSize))}
					>
						{toggleLabel}
					</span>
				)}
			</div>
		);
	};

	// === MAIN RENDER ===

	const containerClasses = combineClasses(
		getLayoutClasses(),
		'w-full h-full',
		className
	);

	const renderContent = () => {
		switch (props.type) {
			case 'button':
				return renderButton(props);
			case 'slider':
				return renderSlider(props);
			case 'select':
				return renderSelect(props);
			case 'toggle':
				return renderToggle(props);
		}
	};

	return (
		<div
			className={containerClasses}
			style={style}
		>
			{props.type !== 'button' && props.type !== 'toggle' && renderLabel()}
			{renderContent()}
		</div>
	);
}
