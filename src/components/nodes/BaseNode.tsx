import React from 'react';
import BaseHandle, { type BaseHandleProps } from '../handles/BaseHandle';
import { Position } from '@xyflow/react';

export interface BaseNodeProps {
	label: string;
	description?: string;
	nodeType: string; // Keep as string, actual NodeType enum value
	themeKey: string; // Key to access colors from CSS theme, e.g., 'debug', 'oscillator'
	isConnectable: boolean;
	isDragging?: boolean;
	isHovering?: boolean;
	widthUnits?: number;
	heightUnits?: number;
	gridSize?: number;
	onMouseEnter?: () => void;
	onMouseLeave?: () => void;
	children?: React.ReactNode;
	// Removed 'colors' prop
	// Add specific handle props if they need to be dynamic beyond themeKey
	sourceHandles?: Omit<BaseHandleProps, 'type' | 'position'>[];
	targetHandles?: Omit<BaseHandleProps, 'type' | 'position'>[];
}

// Button style props for node actions
export interface NodeButtonProps {
	onClick: () => void;
	children: React.ReactNode;
	themeKey: string; // To style button according to node's theme or a generic UI button theme
	variant?: 'node' | 'ui'; // To distinguish between node-themed or general UI-themed button
	className?: string;
}

// Button component used within nodes
export function NodeButton({
	onClick,
	children,
	themeKey,
	variant = 'node',
	className = '',
}: NodeButtonProps) {
	const isCompact = window.innerWidth < 768; // This could be a hook or context value

	// Base classes
	let buttonClasses = `
		${isCompact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'}
		font-medium rounded transition-all shadow-sm hover:shadow-md 
		max-w-full overflow-hidden text-ellipsis whitespace-nowrap
		focus:outline-none focus:ring-2 focus:ring-offset-1
	`;

	if (variant === 'node') {
		// Uses the node's specific theme colors
		// Example: bg-node-debug-DEFAULT text-node-debug-text hover:bg-node-debug-hover (pseudo, actual classes depend on theme structure)
		// For simplicity, let's assume a button variant within the node theme or use its DEFAULT and text colors.
		// This part needs careful mapping to your @theme structure.
		// Assuming theme structure like: colors.node[themeKey].buttonBg, colors.node[themeKey].buttonText
		// Or more simply, using the DEFAULT and text colors of the node theme itself.
		buttonClasses += ` 
			bg-node-${themeKey}-DEFAULT dark:bg-node-${themeKey}-dark-DEFAULT 
			text-node-${themeKey}-text dark:text-node-${themeKey}-dark-text
			hover:brightness-110 dark:hover:brightness-125
			focus:ring-node-${themeKey}-border dark:focus:ring-node-${themeKey}-dark-border
		`;
		// If you have specific 'hover' or 'active' states in your theme for buttons within nodes:
		// e.g., hover:bg-node-${themeKey}-hover
	} else {
		// Uses general UI button theme (e.g., colors.ui.button.primary)
		buttonClasses += `
			bg-ui-button-primary-bg text-ui-button-primary-text
			hover:bg-ui-button-primary-bg-hover
			dark:bg-ui-button-primary-dark-bg dark:text-ui-button-primary-dark-text
			dark:hover:bg-ui-button-primary-dark-bg-hover
			focus:ring-ui-text-interactive
		`;
	}

	return (
		<button
			className={`${buttonClasses} ${className}`}
			onClick={onClick}
		>
			{children}
		</button>
	);
}

// Pre-formatted text container for debug info
export interface NodePreProps {
	children: React.ReactNode;
	className?: string;
}

// Pre-formatted text container component
export function NodePre({ children, className = '' }: NodePreProps) {
	const isCompact = window.innerWidth < 768;
	const preClasses = `
		${isCompact ? 'text-[9px] p-1' : 'text-xs p-2'}
		text-left rounded w-full overflow-auto max-w-full mt-1 max-h-[120px]
		bg-ui-input-bg dark:bg-ui-input-dark-bg 
		text-ui-input-text dark:text-ui-input-dark-text
		border border-ui-input-border dark:border-ui-input-dark-border
	`;
	return <pre className={`${preClasses} ${className}`}>{children}</pre>;
}

export default function BaseNode({
	label,
	description,
	// nodeType, // Not directly used for styling now, themeKey handles it
	themeKey,
	isConnectable,
	// isDragging = false, // Consider if these states need specific Tailwind classes
	// isHovering = false,
	widthUnits = 8, // Default increased for better layout
	heightUnits = 4, // Default increased
	gridSize = 32,
	onMouseEnter,
	onMouseLeave,
	children,
	sourceHandles,
	targetHandles,
}: BaseNodeProps) {
	const width = widthUnits * gridSize;
	const height = heightUnits * gridSize; // Auto-height might be better with children

	// Constructing Tailwind classes based on themeKey
	// Ensure your @theme in index.css has these color definitions:
	// e.g., node.debug.DEFAULT, node.debug.border, node.debug.text
	// and their dark variants: node.debug.dark.DEFAULT, node.debug.dark.border, etc.
	const nodeContainerClasses = `
		p-3 rounded-node shadow-lg backdrop-blur-md
		border-2
		bg-node-${themeKey}-DEFAULT/80 dark:bg-node-${themeKey}-dark-DEFAULT/80
		border-node-${themeKey}-border dark:border-node-${themeKey}-dark-border
		text-node-${themeKey}-text dark:text-node-${themeKey}-dark-text
		hover:shadow-xl transition-all duration-200
		flex flex-col
	`; // Added /80 for slight transparency if desired

	const headerClasses = `
		text-sm font-semibold mb-2 pb-1 border-b 
		border-node-${themeKey}-border/50 dark:border-node-${themeKey}-dark-border/50
		cursor-move node-header relative // Added node-header for drag handle
	`;

	const handleBaseClasses = `
		w-3 h-3 rounded-full shadow-md
		transition-all duration-150 hover:scale-125
	`;
	const themedHandleClasses = `
		${handleBaseClasses}
		bg-node-${themeKey}-handle dark:bg-node-${themeKey}-dark-handle
		border-2 border-node-${themeKey}-border dark:border-node-${themeKey}-dark-border
	`;
	// Example for active/connected state if needed: ring-2 ring-offset-1 ring-node-${themeKey}-active

	return (
		<div
			style={{ width: `${width}px`, minHeight: `${height}px` }}
			className={nodeContainerClasses}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
		>
			<div className={headerClasses}>
				{label}
				{description && (
					<div className='text-xs font-normal opacity-75 mt-0.5'>
						{description}
					</div>
				)}
			</div>

			<div className='flex-grow overflow-y-auto p-1 custom-scrollbar'>
				{children}
			</div>

			{/* Default Handles - can be overridden by sourceHandles/targetHandles props */}
			{!sourceHandles && !targetHandles && (
				<>
					<BaseHandle
						type='target'
						position={Position.Left}
						isConnectable={isConnectable}
						className={themedHandleClasses}
						id={`${themeKey}-target-default`}
					/>
					<BaseHandle
						type='source'
						position={Position.Right}
						isConnectable={isConnectable}
						className={themedHandleClasses}
						id={`${themeKey}-source-default`}
					/>
				</>
			)}

			{/* Customizable Source Handles */}
			{sourceHandles?.map((handleProps, index) => (
				<BaseHandle
					key={`source-${index}-${handleProps.id || 'handle'}`}
					type='source'
					position={handleProps.position || Position.Right}
					isConnectable={isConnectable}
					{...handleProps}
					className={`${themedHandleClasses} ${handleProps.className || ''}`}
				/>
			))}

			{/* Customizable Target Handles */}
			{targetHandles?.map((handleProps, index) => (
				<BaseHandle
					key={`target-${index}-${handleProps.id || 'handle'}`}
					type='target'
					position={handleProps.position || Position.Left}
					isConnectable={isConnectable}
					{...handleProps}
					className={`${themedHandleClasses} ${handleProps.className || ''}`}
				/>
			))}
		</div>
	);
}

// Add a basic custom scrollbar style if you want, or use a plugin
// This can go into your main CSS file (e.g., index.css)
/*
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(0,0,0,0.2);
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0,0,0,0.3);
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
*/
