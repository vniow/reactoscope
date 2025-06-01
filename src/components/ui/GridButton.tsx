import React from 'react';
import { GridBlock, type GridBlockProps } from '../GridBlock';

export interface GridButtonProps extends Omit<GridBlockProps, 'children'> {
	onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
	buttonLabel: string;
	buttonClassName?: string;
}

export function GridButton({
	gridWidth,
	gridHeight,
	gridX,
	gridY,
	variant = 'primary',
	showDimensions = false,
	className = '',
	buttonLabel,
	onClick,
	buttonClassName = '',
	...rest
}: GridButtonProps) {
	return (
		<GridBlock
			gridWidth={gridWidth}
			gridHeight={gridHeight}
			gridX={gridX}
			gridY={gridY}
			variant={variant}
			showDimensions={showDimensions}
			className={`flex items-center justify-center ${className}`}
			{...rest}
		>
			<button
				onClick={onClick}
				onPointerDown={(e) => e.stopPropagation()} // Prevent node dragging
				className={`
          px-3 py-1.5 
          text-sm font-medium 
          rounded-md 
          transition-colors
          focus:outline-none focus:ring-2 focus:ring-offset-2
          dark:focus:ring-offset-gray-800
          ${variant === 'primary' ? 'bg-green-500 hover:bg-green-600 text-white focus:ring-green-400' : ''}
          ${variant === 'secondary' ? 'bg-purple-500 hover:bg-purple-600 text-white focus:ring-purple-400' : ''}
          ${variant === 'audio' ? 'bg-orange-500 hover:bg-orange-600 text-white focus:ring-orange-400' : ''}
          ${variant === 'debug' ? 'bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-400' : ''}
          ${variant === 'default' ? 'bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-100 focus:ring-gray-400' : ''}
          ${buttonClassName}
        `}
			>
				{buttonLabel}
			</button>
		</GridBlock>
	);
}
