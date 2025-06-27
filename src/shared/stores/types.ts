import type { FlowSlice } from '../../flow/stores/flowSlice';
import type { Position } from '@xyflow/react';

// Theme Types
export type Theme = 'light' | 'dark' | 'system';
export type ActualTheme = 'light' | 'dark';
export type MetallicTheme = 'titanium' | 'rainbow';

export interface ThemeState {
	current: Theme;
	actualTheme: ActualTheme;
	metallicBackground: MetallicTheme;
}

// Handle Types - Aligned with React Flow best practices
export interface Handle {
	id: string; // Unique handle identifier (required for React Flow)
	type: 'source' | 'target'; // Handle type (required for React Flow)
	// Positioning refinements - now uses standard React Flow position
	position: Position; // React Flow position (Left, Right, Top, Bottom)
	// Visual and behavioral options
	variant?: 'default' | 'primary' | 'debug' | 'secondary' | 'audio'; // Visual theme
}

// UI Types
export interface UIState {
	isNodeDragging: boolean;
	selectedNodes: string[];
	selectedEdges: string[];
	isConnecting: boolean;
	isNodeAddPanelExpanded: boolean; // Add state for NodeAddPanel visibility
}

// Action Types
export interface ThemeActions {
	setTheme: (theme: Theme) => void;
	setMetallicBackground: (metallic: MetallicTheme) => void;
	initializeTheme: () => void;
}

export interface UIActions {
	setSelectedNodes: (nodeIds: string[]) => void;
	setSelectedEdges: (edgeIds: string[]) => void;
	setIsNodeDragging: (isDragging: boolean) => void;
	setIsConnecting: (isConnecting: boolean) => void;
	setIsNodeAddPanelExpanded: (isExpanded: boolean) => void; // Add action for NodeAddPanel
	toggleNodeAddPanel: () => void; // Add toggle action for convenience
}

// Main Store Interface - Uses composition pattern for better maintainability
export interface AppStore extends ThemeActions, UIActions, FlowSlice {
	theme: ThemeState;
	ui: UIState;

	// Explicitly declare all actions for better IntelliSense and type safety
	// Theme actions
	setTheme: ThemeActions['setTheme'];
	setMetallicBackground: ThemeActions['setMetallicBackground'];
	initializeTheme: ThemeActions['initializeTheme'];

	// UI actions
	setSelectedNodes: UIActions['setSelectedNodes'];
	setSelectedEdges: UIActions['setSelectedEdges'];
	setIsNodeDragging: UIActions['setIsNodeDragging'];
	setIsConnecting: UIActions['setIsConnecting'];
	setIsNodeAddPanelExpanded: UIActions['setIsNodeAddPanelExpanded'];
	toggleNodeAddPanel: UIActions['toggleNodeAddPanel'];
}
