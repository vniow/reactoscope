/**
 * Common UI type definitions following discriminated union patterns
 */

// Component variant system with discriminated unions - Tone.js categories
export type ComponentVariant =
	| 'core' // Core system components (Context, Master, etc.)
	| 'source' // Audio sources (Oscillator, Player, Microphone, etc.)
	| 'instrument' // Instruments (Synth, FMSynth, AMSynth, etc.)
	| 'effect' // Effects (Reverb, Delay, Filter, etc.)
	| 'component' // Signal components (Gain, Panner, etc.)
	| 'signal' // Signal processing (Analyser, FFT, etc.)
	| 'event' // Event-based (Sequence, Part, Transport, etc.)
	| 'unit'; // Utilities and units (Frequency, Time, etc.)

export type ComponentSize = 'sm' | 'md' | 'lg';

export type ComponentColor = 'default' | 'orange' | 'green' | 'red' | 'blue';

// Slider types
export type SliderSize = 'sm' | 'md' | 'lg';
export type SliderColor = 'default' | 'orange' | 'green' | 'red' | 'blue';

// Style system types
export interface VariantStyles {
	border: string;
	// background: string;
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

// Enhanced color token system for variant-based theming
export interface VariantColorTokens {
	// Primary colors
	accent: string;
	accentHover: string;
	accentActive: string;
	
	// Text colors
	textOnAccent: string;
	textPrimary: string;
	textSecondary: string;
	
	// Background variations
	bgFrom: string;
	bgVia: string;
	bgTo: string;
	bgSubtle: string;
	
	// Border and effects
	border: string;
	borderFocus: string;
	shadow: string;
	shadowHover: string;
	
	// Opacity variations (for mixing)
	accent10: string;
	accent20: string;
	accent40: string;
	accent60: string;
	accent80: string;
}

// Color inheritance configuration for edges
export interface EdgeColorConfig {
	sourceVariant: ComponentVariant;
	targetVariant: ComponentVariant;
	colorMode: 'source' | 'target' | 'gradient' | 'mixed';
	opacity?: number;
}

// Component color inheritance props
export interface ColorInheritanceProps {
	variant?: ComponentVariant;
	inheritFrom?: string; // ID of component to inherit from
	colorTokens?: Partial<VariantColorTokens>;
	forceColors?: boolean; // Override inherited colors
}
