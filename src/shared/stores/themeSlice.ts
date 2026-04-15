import type { StateCreator } from 'zustand';

// Node theme configuration with semantic utility classes
export interface NodeThemeClasses {
	name: string;
	containerClass: string;
	headerClass: string;
	buttonClass: string;
	inputClass: string;
}

// Node category types for semantic grouping
export type NodeCategory =
	| 'audio-generation'
	| 'audio-processing'
	| 'audio-output'
	| 'audio-analysis'
	| 'visual'
	| 'debug';

// Semantic theme classes for each node category
export const NODE_THEME_CLASSES: Record<NodeCategory, NodeThemeClasses> = {
	'audio-generation': {
		name: 'Audio Generation',
		containerClass: 'node-container-audio-generation',
		headerClass: 'node-header-audio-generation',
		buttonClass: 'btn-audio-generation',
		inputClass: 'input-control-audio-generation',
	},
	'audio-processing': {
		name: 'Audio Processing',
		containerClass: 'node-container-audio-processing',
		headerClass: 'node-header-audio-processing',
		buttonClass: 'btn-audio-processing',
		inputClass: 'input-control-audio-processing',
	},
	'audio-output': {
		name: 'Audio Output',
		containerClass: 'node-container-audio-output',
		headerClass: 'node-header-audio-output',
		buttonClass: 'btn-audio-output',
		inputClass: 'input-control-audio-output',
	},
	'audio-analysis': {
		name: 'Audio Analysis',
		containerClass: 'node-container-audio-analysis',
		headerClass: 'node-header-audio-analysis',
		buttonClass: 'btn-audio-analysis',
		inputClass: 'input-control-audio-analysis',
	},
	visual: {
		name: 'Visual',
		containerClass: 'node-container-visual',
		headerClass: 'node-header-visual',
		buttonClass: 'btn-visual',
		inputClass: 'input-control-visual',
	},
	debug: {
		name: 'Debug',
		containerClass: 'node-container-debug',
		headerClass: 'node-header-debug',
		buttonClass: 'btn-debug',
		inputClass: 'input-control-debug',
	},
} as const;

// Node type to category mapping
export const NODE_TYPE_CATEGORY_MAP: Record<string, NodeCategory> = {
	// Audio generation
	oscillator: 'audio-generation',
	multioscillator: 'audio-generation',
	noisegen: 'audio-generation',
	'noise-generator': 'audio-generation',

	// Audio processing
	gain: 'audio-processing',
	filter: 'audio-processing',
	delay: 'audio-processing',
	reverb: 'audio-processing',
	compressor: 'audio-processing',
	distortion: 'audio-processing',

	// Audio output
	destination: 'audio-output',
	speaker: 'audio-output',
	recorder: 'audio-output',

	// Audio analysis
	oscilloscope: 'audio-analysis',
	simpleosc: 'audio-analysis',
	simplexy: 'audio-analysis',
	spectrum: 'audio-analysis',
	analyser: 'audio-analysis',

	// Visual/3D
	threejs: 'visual',
	webgl: 'visual',
	canvas: 'visual',
	geometric: 'visual',

	// Debug/utility
	debug: 'debug',
	console: 'debug',
	monitor: 'debug',
} as const;

export interface ThemeSlice {
	nodeThemeClasses: typeof NODE_THEME_CLASSES;
	nodeTypeCategoryMap: typeof NODE_TYPE_CATEGORY_MAP;
	getNodeThemeClasses: (nodeType: string) => NodeThemeClasses;
	getNodeCategory: (nodeType: string) => NodeCategory;
	addNodeTypeMapping: (nodeType: string, category: NodeCategory) => void;
}

export const createThemeSlice: StateCreator<ThemeSlice> = (set, get) => ({
	nodeThemeClasses: NODE_THEME_CLASSES,
	nodeTypeCategoryMap: NODE_TYPE_CATEGORY_MAP,

	getNodeThemeClasses: (nodeType: string) => {
		const { nodeThemeClasses, nodeTypeCategoryMap } = get();
		const category = nodeTypeCategoryMap[nodeType] || 'debug';
		return nodeThemeClasses[category];
	},

	getNodeCategory: (nodeType: string) => {
		const { nodeTypeCategoryMap } = get();
		return nodeTypeCategoryMap[nodeType] || 'debug';
	},

	addNodeTypeMapping: (nodeType: string, category: NodeCategory) => {
		set((state) => ({
			nodeTypeCategoryMap: {
				...state.nodeTypeCategoryMap,
				[nodeType]: category,
			},
		}));
	},
});
