import { PANEL_LAYOUT } from '../../../shared/config/panelLayout';
import {
	groupNodesByVariant,
	getVariantDisplayOrder,
	VARIANT_DISPLAY_NAMES,
	type NodeTypeOption,
} from '../../../shared/config/nodeTypes';
import type { ComponentVariant } from '../../../shared/types/ui';
import { useEffect } from 'react';

interface NodeGroupsSectionProps {
	onAddNode: (nodeType: NodeTypeOption) => void;
	isVisible: boolean;
}

export function NodeGroupsSection({
	onAddNode,
	isVisible,
}: NodeGroupsSectionProps) {
	const { height } = PANEL_LAYOUT.sections.nodeGroups;
	const nodeGroups = groupNodesByVariant();
	const variantOrder = getVariantDisplayOrder();

	// Log when component renders
	useEffect(() => {
		// Component rendered
	}, [isVisible, nodeGroups]);

	const handleAddNode = (nodeType: NodeTypeOption) => {
		onAddNode(nodeType);
	};

	return (
		<div
			className={`overflow-hidden ${!isVisible ? 'pointer-events-none' : ''}`}
			style={{ height }}
		>
			<div
				className='w-full h-full p-3 scrollbar-glass max-h-full overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out'
				style={{
					opacity: isVisible ? 1 : 0,
					transform: isVisible ? 'translateY(0)' : 'translateY(-1rem)',
					pointerEvents: isVisible ? 'auto' : 'none',
				}}
				role='region'
				aria-label='Node types grouped by category'
			>
				<div className='space-y-4 pb-2'>
					{variantOrder.map((variant, index) => {
						const nodes = nodeGroups[variant];
						if (!nodes || nodes.length === 0) return null;

						return (
							<VariantSection
								key={variant}
								variant={variant}
								nodes={nodes}
								onAddNode={handleAddNode}
								animationDelay={index * 50} // Stagger animation by 50ms per section
								isVisible={isVisible}
							/>
						);
					})}
				</div>
			</div>
		</div>
	);
}

interface VariantSectionProps {
	variant: ComponentVariant;
	nodes: NodeTypeOption[];
	onAddNode: (nodeType: NodeTypeOption) => void;
	animationDelay: number;
	isVisible: boolean;
}

function VariantSection({
	variant,
	nodes,
	onAddNode,
	animationDelay,
	isVisible,
}: VariantSectionProps) {
	const variantName = VARIANT_DISPLAY_NAMES[variant];
	const sectionId = `node-section-${variant}`;

	return (
		<section
			className={`
				variant-section transition-all duration-300 ease-in-out
				${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
			`}
			data-variant={variant}
			aria-labelledby={sectionId}
			style={{
				transitionDelay: isVisible ? `${animationDelay}ms` : '0ms',
			}}
		>
			{/* Section Header with variant styling and a11y compliance */}
			<div className='mb-2'>
				<h3
					id={sectionId}
					className='text-sm font-semibold px-3 py-2 rounded border-l-4 border text-gray-800 transition-colors dark:text-gray-50 border-l-[var(--node-accent)] bg-[color-mix(in_srgb,var(--node-accent)_8%,_#f8fafc)] dark:bg-[color-mix(in_srgb,var(--node-accent)_8%,_#1e293b)] border-[color-mix(in_srgb,var(--node-accent)_20%,_#e2e8f0)] dark:border-[color-mix(in_srgb,var(--node-accent)_20%,_#374151)]'
				>
					{variantName}
				</h3>
			</div>

			{/* Node Grid */}
			<div
				className='grid grid-cols-3 gap-2 m-1'
				role='group'
				aria-labelledby={sectionId}
			>
				{nodes.map((option, buttonIndex) => (
					<button
						key={option.type}
						data-variant={option.variant}
						onClick={() => onAddNode(option)}
						title={option.description}
						aria-label={`Add ${option.name} node. ${option.description}`}
						className={`
							h-16 min-h-16 text-xs px-4 py-3
							flex flex-col items-center justify-center text-center 
							rounded-lg transition-all duration-300 ease-in-out
							focus:outline-none focus:ring-2 focus:ring-offset-2
							hover:scale-105 transform 
							border border-transparent
							font-medium shadow-md
							${
								isVisible
									? 'opacity-100 translate-y-0 scale-100'
									: 'opacity-0 translate-y-1 scale-95'
							}
							btn-node-primary
						`}
						style={
							{
								transitionDelay: isVisible
									? `${animationDelay + buttonIndex * 30}ms`
									: '0ms',
								// Ensure proper focus ring color using CSS custom property
								'--tw-ring-color': 'var(--node-accent)',
							} as React.CSSProperties
						}
					>
						<div
							className='mb-1'
							aria-hidden='true'
						>
							<span className='text-sm'>{option.emoji}</span>
						</div>
						<div className='leading-tight'>
							{option.name.split(' ').slice(0, 2).join(' ')}
						</div>
					</button>
				))}
			</div>
		</section>
	);
}
