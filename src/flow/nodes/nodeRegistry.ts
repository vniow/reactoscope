import type { ComponentType } from 'react';
import type { NodeProps, NodeTypes } from '@xyflow/react';
import type { ComponentVariant } from '../../shared/types/ui';

// Import all node components here
import { DebugNode } from './utilities/DebugNode';
import { DebugSimpleNode } from '../../shared/components/DebugSimpleNode';
import { DestinationNode } from './core/DestinationNode';
import { Oscilloscope3DNode } from './signal/Oscilloscope3DNode';
import { ReactoscopeProcessorNode } from './source/ReactoscopeProcessorNode';
import { XYRGBMergeNode } from './component/XYRGBMergeNode';
import { SignalNode } from './source/SignalNode';
import { ReactoscopeViewerNode } from './signal/ReactoscopeViewerNode';

// Central registry entry type
export interface NodeRegistryEntry {
	type: string;
	name: string;
	description: string;
	emoji: string;
	variant: ComponentVariant;
	component: ComponentType<NodeProps<any>>; // Using any for now to avoid complex type issues
}

// Centralized node registry
export const NODE_REGISTRY: NodeRegistryEntry[] = [
	{
		type: 'debug',
		name: 'Debug Node',
		description: 'Comprehensive debug info for all node properties',
		emoji: '🔍',
		variant: 'util',
		component: DebugNode,
	},
	{
		type: 'debug-simple',
		name: 'Debug Simple Node',
		description: 'Minimal unstyled debug node',
		emoji: '🐞',
		variant: 'util',
		component: DebugSimpleNode,
	},
	{
		type: 'destination',
		name: 'Master Output',
		description: 'Main audio output destination with master controls',
		emoji: '🎧',
		variant: 'core',
		component: DestinationNode,
	},
	{
		type: 'source',
		name: 'Reactoscope Processor',
		description: 'Generate XYRGB audio signals from 3D scene vertex data',
		emoji: '🎨',
		variant: 'source',
		component: ReactoscopeProcessorNode,
	},
	{
		type: 'signal-xyrgb',
		name: 'Reactoscope Viewer',
		description:
			'5-channel audio-visual mapping with X,Y coordinates and R,G,B colors',
		emoji: '🌈',
		variant: 'signal',
		component: ReactoscopeViewerNode,
	},
	{
		type: 'signal-3d',
		name: 'Oscilloscope',
		description: 'Oscilloscope for visualizing audio waveforms',
		emoji: '🔮',
		variant: 'signal',
		component: Oscilloscope3DNode,
	},

	{
		type: 'component-xyrgb-merge',
		name: 'XYRGB Merge',
		description:
			'Merge 5 mono channels (X, Y, R, G, B) into a single 5-channel output',
		emoji: '🔀',
		variant: 'component',
		component: XYRGBMergeNode,
	},
	{
		type: 'source-signal',
		name: 'Signal',
		description: 'Constant signal generator for modulation and control',
		emoji: '📶',
		variant: 'source',
		component: SignalNode,
	},
	// Add more nodes here as needed
];

// Programmatic nodeTypes mapping for React Flow
export const nodeTypes = Object.fromEntries(
	NODE_REGISTRY.map((node) => [node.type, node.component])
) as NodeTypes; // Explicitly cast to NodeTypes

// Utility: group nodes by variant
export const groupNodesByVariant = (): Record<
	ComponentVariant,
	NodeRegistryEntry[]
> =>
	NODE_REGISTRY.reduce(
		(acc, node) => {
			acc[node.variant] = acc[node.variant] || [];
			acc[node.variant].push(node);
			return acc;
		},
		{} as Record<ComponentVariant, NodeRegistryEntry[]>
	);

// Utility: get display order of variants (non-empty only)
export const getVariantDisplayOrder = (): ComponentVariant[] => {
	const groups = groupNodesByVariant();
	const order: ComponentVariant[] = [
		'core',
		'source',
		'instrument',
		'effect',
		'component',
		'signal',
		'event',
		'util',
	];
	return order.filter(
		(variant) => groups[variant] && groups[variant].length > 0
	);
};
