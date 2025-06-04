/**
 * Common UI type definitions following discriminated union patterns
 */

// Component variant system with discriminated unions
export type ComponentVariant =
	| 'default'
	| 'debug'
	| 'primary'
	| 'secondary'
	| 'audio';

export type ComponentSize = 'sm' | 'md' | 'lg';

export type ComponentColor = 'default' | 'orange' | 'green' | 'red' | 'blue';

// Slider types
export type SliderSize = 'sm' | 'md' | 'lg';
export type SliderColor = 'default' | 'orange' | 'green' | 'red' | 'blue';

// Grid positioning interface
export interface GridPosition {
	gridX: number;
	gridY: number;
	gridWidth: number;
	gridHeight: number;
}

// Base props for grid-based components
export interface BaseGridProps extends GridPosition {
	className?: string;
	variant?: ComponentVariant;
	showDimensions?: boolean;
	showBorder?: boolean;
	transparentBackground?: boolean;
}

// Style system types
export interface VariantStyles {
	border: string;
	background: string;
	text: string;
	shadow: string;
}

// Node debug information structure
export interface NodeDebugInfo {
	identity: {
		id: string;
		type: string;
	};
	position: {
		absolutePosition: string;
		dimensions: string;
	};
	state: {
		selected: boolean;
		dragging: boolean;
		draggable: boolean;
		selectable: boolean;
		deletable: boolean;
		connectable: boolean;
	};
	relationships: {
		parentId: string | null;
		dragHandle: string | null;
		zIndex: number;
	};
}

// Accessibility props
export interface AccessibilityProps {
	'aria-label'?: string;
	'aria-describedby'?: string;
	'aria-expanded'?: boolean;
	'aria-pressed'?: boolean;
	role?: string;
}
