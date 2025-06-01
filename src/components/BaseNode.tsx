import type { ReactNode } from 'react';
import { calculateNodeSize, GRID_UNIT } from '../config/grid';
import { NodeHeader } from './NodeHeader';

interface BaseNodeProps {
	children: ReactNode;
	className?: string;
	variant?: 'default' | 'debug' | 'primary' | 'secondary' | 'audio';
	gridWidth?: number;
	gridHeight?: number;
	// Delete button props
	nodeId?: string;
	selected?: boolean;
	onDelete?: (nodeId: string) => void;
	// Header/title props
	title?: string;
}

// const variantStyles = { // No longer used for border, will be replaced by gradient
// 	default: 'border-gray-200 dark:border-gray-600',
// 	debug: 'border-blue-200 dark:border-blue-600',
// 	primary: 'border-green-200 dark:border-green-600',
// 	secondary: 'border-purple-200 dark:border-purple-600',
// 	audio: 'border-orange-200 dark:border-orange-600',
// };

const variantBorderGradientStyles = {
	default:
		'bg-gradient-to-br from-gray-400 via-gray-200 to-gray-400 dark:from-gray-700 dark:via-gray-500 dark:to-gray-700',
	debug:
		'bg-gradient-to-br from-blue-400 via-blue-200 to-blue-400 dark:from-blue-700 dark:via-blue-500 dark:to-blue-700',
	primary:
		'bg-gradient-to-br from-green-400 via-green-200 to-green-400 dark:from-green-700 dark:via-green-500 dark:to-green-700',
	secondary:
		'bg-gradient-to-br from-purple-400 via-purple-200 to-purple-400 dark:from-purple-700 dark:via-purple-500 dark:to-purple-700',
	audio:
		'bg-gradient-to-br from-orange-400 via-orange-200 to-orange-400 dark:from-orange-700 dark:via-orange-500 dark:to-orange-700',
};

const variantShadows = {
	default: 'shadow-gray-400/40',
	debug: 'shadow-blue-400/40',
	primary: 'shadow-green-400/40',
	secondary: 'shadow-purple-400/40',
	audio: 'shadow-orange-400/40',
};

export function BaseNode({
	children,
	className = '',
	variant = 'default',
	gridWidth = 2,
	gridHeight = 1,
	nodeId,
	selected = false,
	onDelete,
	title,
}: BaseNodeProps) {
	const { width, height } = calculateNodeSize(gridWidth, gridHeight);

	const handleDelete = (e: React.MouseEvent) => {
		e.stopPropagation(); // Prevent node selection when clicking delete
		if (nodeId && onDelete) {
			onDelete(nodeId);
		}
	};

	return (
		<div // Outer div for gradient border
			className={`
				p-[3px] // Padding creates the border thickness
				${variantBorderGradientStyles[variant]} // Apply variant-specific gradient
				rounded-lg  
				${selected ? `shadow-xl ${variantShadows[variant]}` : ''}
				transition-all 
				duration-200
				relative
				${className}
		  `}
			style={{
				width: `${width}px`,
				height: `${height}px`,
				minWidth: `${width}px`,
				minHeight: `${height}px`,
			}}
		>
			<div // Inner div for content and node's own background
				className={`
					w-full h-full
					flex flex-col
					bg-gradient-to-br from-slate-300 via-slate-100 to-slate-300 dark:from-slate-400 dark:via-slate-500 dark:to-slate-700 // Node's own background
					rounded // Inner rounding (adjust if needed, e.g., rounded-md)
					overflow-hidden 
			  `}
			>
				{/* Header section with variant-specific colors */}
				{title && (
					<NodeHeader
						title={title}
						variant={variant}
						className='flex-none'
						style={{ height: `${GRID_UNIT}px` }}
					/>
				)}
				{/* Delete button - only show when selected and deletion is enabled */}
				{selected && nodeId && onDelete && (
					<div className='absolute pointer-events-none left-0 top-0 w-full h-full z-50'>
						<button
							onClick={handleDelete}
							className={`
							absolute pointer-events-auto -top-4 -left-4
							w-8 h-8
							bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700
							text-white
							rounded-full
							flex items-center justify-center
							text-lg font-bold
							transition-all duration-200
							border-2 border-white dark:border-gray-900
							shadow-xl
							z-50
							transform hover:scale-110
						`}
							style={{
								boxShadow:
									'0 4px 12px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.15)',
								filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
							}}
							title='Delete node'
						>
							×
						</button>
					</div>
				)}

				{/* Content area */}
				<div className='flex-1 p-4 overflow-hidden'>{children}</div>
			</div>
		</div>
	);
}
