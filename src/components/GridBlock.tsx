import type { ReactNode } from 'react';
import { GRID_UNIT } from '../config/grid';
import { combineClasses } from '../utils/styleUtils';

export type BorderStyle = 'solid' | 'dashed' | 'dotted';
export type DashSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface GridBlockProps {
	children?: ReactNode;
	gridWidth: number;
	gridHeight: number;
	gridX?: number;
	gridY?: number;
	className?: string;
	showDimensions?: boolean;
	showPosition?: boolean;
	showBorder?: boolean;
	showShadow?: boolean;
	transparentBackground?: boolean;
	borderStyle?: BorderStyle;
	dashSize?: DashSize;
}

const DASH_LENGTHS: Record<DashSize, string> = {
	xs: '2px 2px',
	sm: '4px 4px',
	md: '6px 6px',
	lg: '8px 8px',
	xl: '12px 12px',
} as const;

export function GridBlock({
	children,
	gridWidth,
	gridHeight,
	gridX = 0,
	gridY = 0,
	className = '',
	showDimensions = false,
	showPosition = false,
	showBorder = false,
	showShadow = false,
	transparentBackground = true,
	borderStyle = 'solid',
	dashSize = 'sm',
}: GridBlockProps) {
	const pixelWidth = gridWidth * GRID_UNIT;
	const pixelHeight = gridHeight * GRID_UNIT;
	const pixelX = gridX * GRID_UNIT;
	const pixelY = gridY * GRID_UNIT;

	// Build border classes using CSS custom properties
	const borderClasses = showBorder
		? combineClasses(
				'border-2',
				borderStyle === 'solid'
					? 'border-solid'
					: borderStyle === 'dotted'
						? 'border-dotted'
						: 'border-dashed',
				'border-[var(--node-border,theme(colors.gray.300))]'
			)
		: 'border-2 border-transparent';

	// Build background classes using CSS custom properties
	const backgroundClasses = transparentBackground
		? 'bg-transparent'
		: 'bg-[var(--node-accent,theme(colors.gray.100))]';

	// Create style object with positioning and dash customization
	const customStyle: React.CSSProperties & Record<string, string | number> = {
		width: `${pixelWidth}px`,
		height: `${pixelHeight}px`,
		minWidth: `${pixelWidth}px`,
		minHeight: `${pixelHeight}px`,
		left: `${pixelX}px`,
		top: `${pixelY}px`,
	};

	// Add CSS custom properties for dash size customization
	if (showBorder && borderStyle === 'dashed') {
		customStyle['--dash-length'] = DASH_LENGTHS[dashSize];
	}

	// Build shadow classes using CSS custom properties
	const shadowClasses = showShadow
		? 'shadow-[0_10px_15px_-3px_var(--node-shadow,theme(colors.gray.500/0.1)),0_4px_6px_-4px_var(--node-shadow,theme(colors.gray.500/0.1))]'
		: '';

	// Build CSS classes using CSS custom properties
	const containerClasses = combineClasses(
		borderClasses,
		backgroundClasses,
		shadowClasses,
		'text-[var(--node-accent,theme(colors.gray.800))]',
		showBorder && borderStyle === 'dashed' ? `dash-${dashSize}` : '',
		'rounded-lg p-2 flex flex-col transition-colors duration-200 absolute',
		className
	);

	return (
		<div
			className={containerClasses}
			style={customStyle}
		>
			{/* Dimension and position labels */}
			{(showDimensions || showPosition) && (
				<div className='absolute -top-6 left-0 text-xs  font-semibold'>
					{showDimensions &&
						`${gridWidth} × ${gridHeight} (${pixelWidth}px × ${pixelHeight}px)`}
					{showDimensions && showPosition && ' • '}
					{showPosition && `@${gridX},${gridY}`}
				</div>
			)}

			{/* Content area */}
			<div className='flex-1 flex items-center justify-center overflow-hidden'>
				{children || (
					<div className='text-xs  opacity-60 text-center'>
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
