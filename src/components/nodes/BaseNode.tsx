import React from 'react';
import BaseHandle, { type BaseHandleProps } from '../handles/BaseHandle';
import { Position } from '@xyflow/react';
import { useNodeStyles } from '../../hooks/useNodeStyles';
import { SlottedContent, type NodeSlots } from './NodeSlots';

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

	// Slot-based content
	slots?: NodeSlots;
	children?: React.ReactNode; // Fallback for backward compatibility

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

	const styles = useNodeStyles({
		themeKey,
		isCompact,
		variant,
	});

	return (
		<button
			className={`${styles.button} ${className}`}
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
	themeKey?: string; // Allow custom theme key for styling
}

// Pre-formatted text container component
export function NodePre({
	children,
	className = '',
	themeKey = 'debug',
}: NodePreProps) {
	const isCompact = window.innerWidth < 768;

	const styles = useNodeStyles({
		themeKey, // Use the provided theme key
		isCompact,
	});

	return <pre className={`${styles.pre} ${className}`}>{children}</pre>;
}

export default function BaseNode({
	label,
	description,
	// nodeType, // Not directly used for styling now, themeKey handles it
	themeKey,
	isConnectable,
	isDragging = false,
	isHovering = false,
	widthUnits = 8, // Default increased for better layout
	heightUnits = 4, // Default increased
	gridSize = 32,
	onMouseEnter,
	onMouseLeave,
	slots,
	children,
	sourceHandles,
	targetHandles,
}: BaseNodeProps) {
	const width = widthUnits * gridSize;
	const height = heightUnits * gridSize;

	const isCompact = window.innerWidth < 768;

	const styles = useNodeStyles({
		themeKey,
		isDragging,
		isHovering,
		isCompact,
	});

	// Default header content
	const defaultHeader = (
		<>
			{label}
			{description && (
				<div className='text-xs font-normal opacity-75 mt-0.5'>
					{description}
				</div>
			)}
		</>
	);

	return (
		<div
			style={{ width: `${width}px`, minHeight: `${height}px` }}
			className={styles.container}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
		>
			{/* Use slot-based architecture if slots are provided, otherwise fallback to legacy */}
			{slots ? (
				<SlottedContent
					slots={{
						header: slots.header || defaultHeader,
						toolbar: slots.toolbar,
						content: slots.content || children,
						footer: slots.footer,
					}}
					headerClassName={styles.header}
					toolbarClassName={styles.toolbar}
					contentClassName={styles.content}
					footerClassName={styles.footer}
				/>
			) : (
				<>
					{/* Legacy mode for backward compatibility */}
					<div className={styles.header}>{defaultHeader}</div>
					<div className={styles.content}>{children}</div>
				</>
			)}

			{/* Default Handles - can be overridden by sourceHandles/targetHandles props */}
			{!sourceHandles && !targetHandles && (
				<>
					<BaseHandle
						type='target'
						position={Position.Left}
						isConnectable={isConnectable}
						className={styles.themedHandle}
						id={`${themeKey}-target-default`}
					/>
					<BaseHandle
						type='source'
						position={Position.Right}
						isConnectable={isConnectable}
						className={styles.themedHandle}
						id={`${themeKey}-source-default`}
					/>
				</>
			)}

			{/* Customizable Source Handles */}
			{sourceHandles?.map((handleProps, index) => (
				<BaseHandle
					key={`source-${index}-${handleProps.id || 'handle'}`}
					type='source'
					position={Position.Right}
					isConnectable={isConnectable}
					{...handleProps}
					className={`${styles.themedHandle} ${handleProps.className || ''}`}
				/>
			))}

			{/* Customizable Target Handles */}
			{targetHandles?.map((handleProps, index) => (
				<BaseHandle
					key={`target-${index}-${handleProps.id || 'handle'}`}
					type='target'
					position={Position.Left}
					isConnectable={isConnectable}
					{...handleProps}
					className={`${styles.themedHandle} ${handleProps.className || ''}`}
				/>
			))}
		</div>
	);
}
