import React from 'react';
import { GridBlock, type GridBlockProps } from '../GridBlock';
// import type { ComponentVariant } from '../../types/ui';
import {
	getButtonVariantClasses,
	combineClasses,
} from '../../utils/styleUtils';

export interface GridButtonProps extends Omit<GridBlockProps, 'children'> {
	onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
	buttonLabel: string;
	buttonClassName?: string;
	disabled?: boolean;
	'aria-label'?: string;
	'aria-describedby'?: string;
}

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
	'aria-label': ariaLabel,
	'aria-describedby': ariaDescribedBy,
	...rest
}: GridButtonProps) {
	// Use utility function for consistent styling - defaults to inherit variant from parent
	const buttonClasses = combineClasses(
		getButtonVariantClasses('primary'), // Default to primary styling
		disabled && 'opacity-50 cursor-not-allowed',
		buttonClassName
	);

	const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
		if (!disabled) {
			onClick?.(e);
		}
	};

	const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
		e.stopPropagation(); // Prevent node dragging
	};

	return (
		<GridBlock
			gridWidth={gridWidth}
			gridHeight={gridHeight}
			gridX={gridX}
			gridY={gridY}
			showDimensions={showDimensions}
			className={combineClasses('flex items-center justify-center', className)}
			{...rest}
		>
			<button
				onClick={handleClick}
				onPointerDown={handlePointerDown}
				disabled={disabled}
				aria-label={ariaLabel || buttonLabel}
				aria-describedby={ariaDescribedBy}
				className={buttonClasses}
			>
				{buttonLabel}
			</button>
		</GridBlock>
	);
}
