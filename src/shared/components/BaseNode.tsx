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
			className={`relative transition-all duration-200 ${className}`}
			data-variant={variant}
			style={style}
		>
			<div
				className={`
					bg-node-primary border-2 border-node rounded-xl shadow-node
					hover:shadow-node-hover hover:border-node-hover
					transition-all duration-200 p-4 
					${selected ? 'shadow-node-selected border-node-accent' : ''}
				`}
			>
				{/* Header section */}
				{title && (
					<div className='text-node-primary font-semibold text-xl mb-2 border-b border-node pb-2'>
						{title}
					</div>
				)}

				{/* Delete button - only show when selected and deletion is enabled */}
				{selected && showDeleteButton && (
					<NodeDeleteButton onClick={handleDelete} />
				)}

				{/* Content area */}
				<div className='text-node-primary'>{children}</div>
			</div>
		</div>
	);
}
