import type { ReactNode } from 'react';
import { calculateNodeSize } from '../config/grid';
import { NodeHeader } from './NodeHeader';
import { NodeDeleteButton } from './ui/NodeDeleteButton';
import type { ComponentVariant } from '../types/ui';
import {
	getVariantClasses,
	getGradientClasses,
	combineClasses,
} from '../utils/styleUtils';

interface BaseNodeProps {
	children: ReactNode;
	className?: string;
	variant?: ComponentVariant;
	gridWidth?: number;
	gridHeight?: number;
	nodeId?: string;
	selected?: boolean;
	onDelete?: (nodeId: string) => void;
	title?: string;
}

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

	const handleDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
		e.stopPropagation();
		if (nodeId && onDelete) {
			onDelete(nodeId);
		}
	};

	// Build outer container classes (gradient border)
	const outerClasses = combineClasses(
		getGradientClasses(variant),
		'rounded-lg transition-all duration-200 relative',
		selected ? `shadow-xl ${getVariantClasses(variant, 'shadow')}` : '',
		className
	);

	// Build inner container classes (node background)
	const innerClasses = combineClasses(
		'w-full h-full flex flex-col rounded overflow-hidden',
		'bg-gradient-to-br from-slate-300 via-slate-100 to-slate-300',
		'dark:from-slate-400 dark:via-slate-500 dark:to-slate-700'
	);

	return (
		<div
			className={outerClasses}
			style={{
				width: `${width}px`,
				height: `${height}px`,
				minWidth: `${width}px`,
				minHeight: `${height}px`,
			}}
		>
			<div className={innerClasses}>
				{/* Header section */}
				{title && (
					<NodeHeader
						title={title}
						variant={variant}
						className='flex-none'
						gridWidth={gridWidth}
					/>
				)}

				{/* Delete button - only show when selected and deletion is enabled */}
				{selected && nodeId && onDelete && (
					<NodeDeleteButton onClick={handleDelete} />
				)}

				{/* Content area */}
				<div className='flex-1 overflow-hidden'>{children}</div>
			</div>
		</div>
	);
}
