import { type ReactNode } from 'react';

export interface NodeSlots {
	header?: ReactNode;
	toolbar?: ReactNode;
	content?: ReactNode;
	footer?: ReactNode;
}

export interface SlotProps {
	children?: ReactNode;
	className?: string;
}

/**
 * Individual slot components that can be used within BaseNode
 */
export function NodeHeader({ children, className = '' }: SlotProps) {
	return <div className={`node-header-slot ${className}`}>{children}</div>;
}

export function NodeToolbar({ children, className = '' }: SlotProps) {
	return <div className={`node-toolbar-slot ${className}`}>{children}</div>;
}

export function NodeContent({ children, className = '' }: SlotProps) {
	return <div className={`node-content-slot ${className}`}>{children}</div>;
}

export function NodeFooter({ children, className = '' }: SlotProps) {
	return <div className={`node-footer-slot ${className}`}>{children}</div>;
}

/**
 * Component that renders slotted content in the proper order
 */
export interface SlottedContentProps {
	slots: NodeSlots;
	defaultContent?: ReactNode;
	headerClassName?: string;
	toolbarClassName?: string;
	contentClassName?: string;
	footerClassName?: string;
}

export function SlottedContent({
	slots,
	defaultContent,
	headerClassName = '',
	toolbarClassName = '',
	contentClassName = '',
	footerClassName = '',
}: SlottedContentProps) {
	return (
		<>
			{slots.header && (
				<NodeHeader className={headerClassName}>{slots.header}</NodeHeader>
			)}

			{slots.toolbar && (
				<NodeToolbar className={toolbarClassName}>{slots.toolbar}</NodeToolbar>
			)}

			{slots.content ? (
				<NodeContent className={contentClassName}>{slots.content}</NodeContent>
			) : (
				defaultContent && (
					<NodeContent className={contentClassName}>
						{defaultContent}
					</NodeContent>
				)
			)}

			{slots.footer && (
				<NodeFooter className={footerClassName}>{slots.footer}</NodeFooter>
			)}
		</>
	);
}
