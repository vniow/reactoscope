import { useMemo } from 'react';

export interface NodeStyleOptions {
	themeKey: string;
	isDragging?: boolean;
	isHovering?: boolean;
	isSelected?: boolean;
	isCompact?: boolean;
	variant?: 'node' | 'ui';
}

export interface NodeStyleClasses {
	container: string;
	header: string;
	content: string;
	handleBase: string;
	themedHandle: string;
	button: string;
	pre: string;
	// Add slot-specific styling
	toolbar: string;
	footer: string;
}

/**
 * Hook that generates consistent styling classes for nodes based on theme and state
 */
export function useNodeStyles(options: NodeStyleOptions): NodeStyleClasses {
	const {
		themeKey,
		isDragging = false,
		isHovering = false,
		isSelected = false,
		isCompact = false,
		variant = 'node',
	} = options;

	return useMemo(() => {
		// Container classes with state-aware styling
		const container = [
			'p-3 rounded-node shadow-lg backdrop-blur-md border-2 flex flex-col transition-all duration-200',
			`bg-node-${themeKey}-DEFAULT/80 dark:bg-node-${themeKey}-dark-DEFAULT/80`,
			`border-node-${themeKey}-border dark:border-node-${themeKey}-dark-border`,
			`text-node-${themeKey}-text dark:text-node-${themeKey}-dark-text`,
			isHovering && 'hover:shadow-xl',
			isDragging && 'scale-105 shadow-2xl',
			isSelected && 'ring-2 ring-offset-2 ring-blue-500',
		]
			.filter(Boolean)
			.join(' ');

		// Header classes
		const header = [
			'text-sm font-semibold mb-2 pb-1 border-b cursor-move node-header relative',
			`border-node-${themeKey}-border/50 dark:border-node-${themeKey}-dark-border/50`,
		].join(' ');

		// Content area classes
		const content = 'flex-grow overflow-y-auto p-1 custom-scrollbar';

		// Handle base classes
		const handleBase =
			'w-3 h-3 rounded-full shadow-md transition-all duration-150 hover:scale-125';

		// Themed handle classes
		const themedHandle = [
			handleBase,
			`bg-node-${themeKey}-handle dark:bg-node-${themeKey}-dark-handle`,
			`border-2 border-node-${themeKey}-border dark:border-node-${themeKey}-dark-border`,
		].join(' ');

		// Button classes based on variant
		const buttonBase = [
			isCompact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
			'font-medium rounded transition-all shadow-sm hover:shadow-md',
			'max-w-full overflow-hidden text-ellipsis whitespace-nowrap',
			'focus:outline-none focus:ring-2 focus:ring-offset-1',
		].join(' ');

		const button =
			variant === 'node'
				? [
						buttonBase,
						`bg-node-${themeKey}-DEFAULT dark:bg-node-${themeKey}-dark-DEFAULT`,
						`text-node-${themeKey}-text dark:text-node-${themeKey}-dark-text`,
						'hover:brightness-110 dark:hover:brightness-125',
						`focus:ring-node-${themeKey}-border dark:focus:ring-node-${themeKey}-dark-border`,
					].join(' ')
				: [
						buttonBase,
						'bg-ui-button-primary-bg text-ui-button-primary-text',
						'hover:bg-ui-button-primary-bg-hover',
						'dark:bg-ui-button-primary-dark-bg dark:text-ui-button-primary-dark-text',
						'dark:hover:bg-ui-button-primary-dark-bg-hover',
						'focus:ring-ui-text-interactive',
					].join(' ');

		// Pre/code block classes
		const pre = [
			isCompact ? 'text-[9px] p-1' : 'text-xs p-2',
			'text-left rounded w-full overflow-auto max-w-full mt-1 max-h-[120px]',
			'bg-ui-input-bg dark:bg-ui-input-dark-bg',
			'text-ui-input-text dark:text-ui-input-dark-text',
			'border border-ui-input-border dark:border-ui-input-dark-border',
		].join(' ');

		// Toolbar classes
		const toolbar = [
			'flex gap-2 items-center justify-between mb-2 px-1',
			isCompact ? 'py-0.5' : 'py-1',
			'border-b border-current/10',
		].join(' ');

		// Footer classes
		const footer = [
			'border-t border-current/20 pt-2 mt-2',
			isCompact ? 'text-[10px]' : 'text-xs',
			'text-center opacity-60',
		].join(' ');

		return {
			container,
			header,
			content,
			handleBase,
			themedHandle,
			button,
			pre,
			toolbar,
			footer,
		};
	}, [themeKey, isDragging, isHovering, isSelected, isCompact, variant]);
}

/**
 * Utility function for combining classes with proper filtering
 */
export function combineClasses(
	...classes: (string | undefined | false)[]
): string {
	return classes.filter(Boolean).join(' ');
}
