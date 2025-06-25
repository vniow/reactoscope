import type { ReactNode } from 'react';
import { NodeDeleteButton } from './ui/NodeDeleteButton';
import { useFlowOperations } from '../stores/useAppStore';
import type { ComponentVariant } from '../types/ui';

/**
 * BaseNode - Simplified common node wrapper with built-in functionality
 * 
 * This component handles all common node behaviors:
 * - Automatic delete functionality via centralized flowSlice operations
 * - Consistent styling and theming
 * - Header display with title
 * - Selection states and visual feedback
 * 
 * Usage: Simply wrap your node content and provide nodeId and selected props.
 * The delete functionality is automatically handled using the centralized state management.
 */

interface BaseNodeProps {
	children: ReactNode;
	className?: string;
	variant?: ComponentVariant;
	nodeId: string; // Made required since all nodes need an ID
	selected?: boolean;
	title?: string;
	showDeleteButton?: boolean; // Allow disabling delete for special nodes
	// Allow custom sizing via className or style
	style?: React.CSSProperties;
}

export function BaseNode({
	children,
	className = '',
	variant = 'core',
	nodeId,
	selected = false,
	title,
	showDeleteButton = true,
	style = {},
}: BaseNodeProps) {
	// Use the flow operations directly from the centralized store
	const { removeNode } = useFlowOperations();

	const handleDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
		e.stopPropagation();
		removeNode(nodeId);
	};

	return (
		<div
			className={`relative transition-all duration-200 ${selected ? 'scale-105' : ''} ${className}`}
			data-variant={variant}
			style={style}
		>
			<div
				className={`w-full h-full flex flex-col rounded-xl backdrop-blur-md
				bg-gradient-to-br from-white/10 via-white/5 to-transparent
				border border-white/20 dark:border-gray-700/50
				${
					selected
						? 'shadow-2xl shadow-blue-500/25 ring-2 ring-blue-500/50'
						: 'shadow-lg shadow-black/10 dark:shadow-black/25'
				}
				hover:shadow-xl hover:shadow-black/15 dark:hover:shadow-black/30
				transition-shadow duration-200`}
			>
				{/* Header section */}
				{title && (
					<div className={`
						flex items-center justify-center font-semibold text-lg
						text-gray-800 dark:text-gray-200
						bg-white/5 backdrop-blur-sm
						border-b border-white/10 dark:border-gray-700/30
						shadow-sm
						flex-none
						px-4 py-2
					`.trim().replace(/\s+/g, ' ')}>
						{title}
					</div>
				)}

				{/* Delete button - only show when selected and deletion is enabled */}
				{selected && showDeleteButton && (
					<NodeDeleteButton onClick={handleDelete} />
				)}

				{/* Content area */}
				<div className='flex-1 overflow-hidden rounded-b-xl'>{children}</div>
			</div>
		</div>
	);
}
