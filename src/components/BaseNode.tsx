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

const variantStyles = {
	default: 'border-gray-200 dark:border-gray-600',
	debug: 'border-blue-200 dark:border-blue-600',
	primary: 'border-green-200 dark:border-green-600',
	secondary: 'border-purple-200 dark:border-purple-600',
	audio: 'border-orange-200 dark:border-orange-600',
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
		<div
			className={`
		flex flex-col
		bg-white dark:bg-gray-800 
		border-b-4  border-x
		${variantStyles[variant]}
		${selected ? `shadow-xl ${variantShadows[variant]}` : ''}
		rounded-b-lg  
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
	);
}
