import React from 'react';
import { GridBlock, type GridBlockProps } from '../GridBlock';
import { Slider, type SliderProps } from './Slider'; // Assuming Slider is in the same directory

export interface GridSliderProps extends Omit<GridBlockProps, 'children'> {
	sliderProps: Omit<SliderProps, 'className'>;
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
	return (
		<GridBlock
			gridWidth={gridWidth}
			gridHeight={gridHeight}
			gridX={gridX}
			gridY={gridY}
			variant={variant}
			showDimensions={showDimensions}
			className={`flex flex-col justify-center p-2 ${className}`}
			{...rest}
		>
			{label && (
				<label className='text-xs font-medium mb-1 text-gray-700 dark:text-gray-300 text-center'>
					{label}
				</label>
			)}
			<Slider {...sliderProps} />
		</GridBlock>
	);
}
