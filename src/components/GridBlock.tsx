import type { ReactNode } from 'react';
import { GRID_UNIT } from '../config/grid';

export interface GridBlockProps {
	children?: ReactNode;
	gridWidth: number;
	gridHeight: number;
	gridX?: number; // Position from left in grid units
	gridY?: number; // Position from top in grid units
	className?: string;
	variant?: 'default' | 'debug' | 'primary' | 'secondary' | 'audio';
	showDimensions?: boolean;
	showPosition?: boolean;
	showBorder?: boolean; // New prop for border visibility
	transparentBackground?: boolean; // New prop for background transparency
}

const variantBorderStyles = {
	default: 'border-gray-300 dark:border-gray-600',
	debug: 'border-blue-300 dark:border-blue-600',
	primary: 'border-green-300 dark:border-green-600',
	secondary: 'border-purple-300 dark:border-purple-600',
	audio: 'border-orange-300 dark:border-orange-600',
};

const variantBackgroundStyles = {
	default: 'bg-gray-50 dark:bg-gray-700',
	debug: 'bg-blue-50 dark:bg-blue-900/20',
	primary: 'bg-green-50 dark:bg-green-900/20',
	secondary: 'bg-purple-50 dark:bg-purple-900/20',
	audio: 'bg-orange-50 dark:bg-orange-900/20',
};

const variantTextStyles = {
	default: 'text-gray-800 dark:text-gray-200',
	debug: 'text-blue-800 dark:text-blue-200',
	primary: 'text-green-800 dark:text-green-200',
	secondary: 'text-purple-800 dark:text-purple-200',
	audio: 'text-orange-800 dark:text-orange-200',
};

export function GridBlock({
	children,
	gridWidth,
	gridHeight,
	gridX = 0,
	gridY = 0,
	className = '',
	variant = 'default',
	showDimensions = true,
	showPosition = false,
	showBorder = true, // Default to true
	transparentBackground = false, // Default to false
}: GridBlockProps) {
	const pixelWidth = gridWidth * GRID_UNIT;
	const pixelHeight = gridHeight * GRID_UNIT;
	const pixelX = gridX * GRID_UNIT;
	const pixelY = gridY * GRID_UNIT;

	return (
		<div
			className={`
				${showBorder ? `border-2 border-dashed ${variantBorderStyles[variant]}` : 'border-2 border-transparent'}
				${transparentBackground ? 'bg-transparent' : variantBackgroundStyles[variant]}
				${variantTextStyles[variant]}
				rounded-lg
				p-2
				relative
				flex flex-col
				transition-colors duration-200
				${gridX !== 0 || gridY !== 0 ? 'absolute' : ''}
				${className}
			`}
			style={{
				width: `${pixelWidth}px`,
				height: `${pixelHeight}px`,
				minWidth: `${pixelWidth}px`,
				minHeight: `${pixelHeight}px`,
				...(gridX !== 0 || gridY !== 0
					? {
							left: `${pixelX}px`,
							top: `${pixelY}px`,
						}
					: {}),
			}}
		>
			{/* Dimension and position labels */}
			{(showDimensions || showPosition) && (
				<div className='absolute -top-6 left-0 text-xs font-mono font-semibold'>
					{showDimensions &&
						`${gridWidth} × ${gridHeight} (${pixelWidth}px × ${pixelHeight}px)`}
					{showDimensions && showPosition && ' • '}
					{showPosition && `@${gridX},${gridY}`}
				</div>
			)}

			{/* Content area */}
			<div className='flex-1 flex items-center justify-center overflow-hidden'>
				{children || (
					<div className='text-xs font-mono opacity-60 text-center'>
						Grid Block
						<br />
						{gridWidth} × {gridHeight}
						{showPosition && (
							<>
								<br />@{gridX},{gridY}
							</>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
