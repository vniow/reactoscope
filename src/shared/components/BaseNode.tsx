import type { ReactNode } from 'react';
import { calculateNodeSize } from '../config/grid';
import { NodeHeader } from './NodeHeader';
import { NodeDeleteButton } from './ui/NodeDeleteButton';
import type { ComponentVariant } from '../types/ui';

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
	variant = 'core',
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

	return (
		<div
			className={`relative transition-all duration-200 ${selected ? 'scale-105' : ''} ${className}`}
			data-variant={variant}
			style={{
				width: `${width}px`,
				height: `${height}px`,
				minWidth: `${width}px`,
				minHeight: `${height}px`,
			}}
		>
			<div
				className={`w-full h-full flex flex-col rounded-xl backdrop-blur-md
		bg-gradient-to-br from-[var(--node-bg-from)] via-[var(--node-bg-via)] to-[var(--node-bg-to)]
		${
			selected
				? 'shadow-[0_20px_25px_-5px_var(--node-shadow),0_8px_10px_-6px_var(--node-shadow)]'
				: 'shadow-[0_10px_15px_-3px_var(--node-shadow),0_4px_6px_-4px_var(--node-shadow)]'
		}`}
			>
				{/* Header section */}
				{title && (
					<NodeHeader
						title={title}
						className='flex-none'
						gridWidth={gridWidth}
					/>
				)}

				{/* Delete button - only show when selected and deletion is enabled */}
				{selected && nodeId && onDelete && (
					<NodeDeleteButton onClick={handleDelete} />
				)}

				{/* Content area */}
				<div className='flex-1 overflow-hidden rounded-b-xl'>{children}</div>
			</div>
		</div>
	);
}
