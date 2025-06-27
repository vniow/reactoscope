import { MiniMap, type MiniMapProps, type Node } from '@xyflow/react';

const nodeVariantToColorVar: Record<string, string> = {
	core: 'var(--color-variant-core)',
	source: 'var(--color-variant-source)',
	instrument: 'var(--color-variant-instrument)',
	effect: 'var(--color-variant-effect)',
	component: 'var(--color-variant-component)',
	signal: 'var(--color-variant-signal)',
	event: 'var(--color-variant-event)',
	unit: 'var(--color-variant-unit)',
	default: 'var(--color-variant-core)', // fallback
};

/**
 * A styled MiniMap component that aligns with the Reactoscope design system.
 * It uses theme-aware colors for nodes and the map background.
 */
export function StyledMiniMap(props: MiniMapProps) {
	const nodeColor = (node: Node): string => {
		const variant = (node.data?.variant as string) || 'default';
		return nodeVariantToColorVar[variant] || nodeVariantToColorVar.default;
	};

	return (
		<MiniMap
			{...props}
			nodeColor={nodeColor}
			className='!bg-slate-100/60 dark:!bg-slate-900/60 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg'
			pannable
			zoomable
		/>
	);
}
