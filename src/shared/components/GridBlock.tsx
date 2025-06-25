import type { ReactNode } from 'react';

export interface GridBlockProps {
	children?: ReactNode;
	className?: string;
	showDimensions?: boolean;
	showPosition?: boolean;
	showBorder?: boolean;
	showShadow?: boolean;
	transparentBackground?: boolean;
	// Allow custom width/height via className or style, no grid units
	style?: React.CSSProperties;
}

export function GridBlock({
	children,
	className = '',
	showDimensions = false,
	showPosition = false,
	showBorder = false,
	showShadow = false,
	transparentBackground = true,
	style = {},
}: GridBlockProps) {
	// Build CSS classes using Tailwind utilities
	const borderClasses = showBorder
		? 'border-2 border-gray-300 dark:border-gray-600'
		: 'border-2 border-transparent';

	const backgroundClasses = transparentBackground
		? 'bg-transparent'
		: 'bg-white/10 dark:bg-gray-800/20';

	const shadowClasses = showShadow
		? 'shadow-lg shadow-black/10 dark:shadow-black/25'
		: '';

	const containerClasses = `
		${borderClasses}
		${backgroundClasses}
		${shadowClasses}
		text-gray-800 dark:text-gray-200
		rounded-lg p-2 flex flex-col transition-colors duration-200 absolute
		${className}
	`.trim().replace(/\s+/g, ' ');

	return (
		<div
			className={containerClasses}
			style={style}
		>
			{/* Optional labels for debugging */}
			{(showDimensions || showPosition) && (
				<div className='absolute -top-6 left-0 text-xs font-semibold text-gray-600 dark:text-gray-400'>
					{showDimensions && 'Block'}
					{showDimensions && showPosition && ' • '}
					{showPosition && 'Positioned'}
				</div>
			)}

			{/* Content area */}
			<div className='flex-1 flex items-center justify-center overflow-hidden'>
				{children || (
					<div className='text-xs opacity-60 text-center text-gray-500 dark:text-gray-400'>
						Block
					</div>
				)}
			</div>
		</div>
	);
}
