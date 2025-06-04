import type { AudioSlice } from './slices/audioSlice';

// Theme Types
export type Theme = 'light' | 'dark' | 'system';
export type ActualTheme = 'light' | 'dark';
export type MetallicTheme =
	| 'chrome'
	| 'gold'
	| 'copper'
	| 'titanium'
	| 'rainbow';

export interface ThemeState {
	current: Theme;
	actualTheme: ActualTheme;
	metallicBackground: MetallicTheme;
}

// Grid Handle Types - Aligned with React Flow best practices
export interface GridHandle {
	id: string; // Unique handle identifier (required for React Flow)
	type: 'source' | 'target'; // Handle type (required for React Flow)
	// Grid positioning system - converts to React Flow's position + style approach
	gridX: number; // Grid X coordinate
	gridY: number; // Grid Y coordinate
	// Optional positioning refinements
	positionX?: number; // Additional X position offset in grid units (default: 0)
	positionY?: number; // Additional Y position offset in grid units (default: 0)
	// Visual and behavioral options
	variant?: 'default' | 'primary' | 'debug' | 'secondary' | 'audio'; // Visual theme
	floating?: boolean; // Whether handle uses floating positioning (default: true)
}

// UI Types
export interface UIState {
	isNodeDragging: boolean;
	selectedNodes: string[];
	selectedEdges: string[];
	isConnecting: boolean;
}

// Audio Types
export interface AudioState {
	audioSlices: AudioSlice[];
	isPlaying: boolean;
	currentTime: number;
	duration: number;
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
}

// Main Store Interface
export interface AppStore extends ThemeActions, UIActions, AudioSlice {
	theme: ThemeState;
	ui: UIState;

	// Actions (flattened for easier access)
	setTheme: ThemeActions['setTheme'];
	initializeTheme: ThemeActions['initializeTheme'];

	setSelectedNodes: UIActions['setSelectedNodes'];
	setSelectedEdges: UIActions['setSelectedEdges'];
	setIsNodeDragging: UIActions['setIsNodeDragging'];
	setIsConnecting: UIActions['setIsConnecting'];
}
