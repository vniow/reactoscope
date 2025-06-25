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
				className={`
					w-full h-full p-3 scrollbar-glass
					transition-all duration-300 ease-in-out
					${
						isVisible
							? 'opacity-100 translate-y-0'
							: 'opacity-0 -translate-y-4 pointer-events-none'
					}
				`}
				role='region'
				aria-label='Node types grouped by category'
				style={{
					maxHeight: '100%',
					overflowY: 'auto',
					overflowX: 'hidden',
				}}
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
					className='text-sm font-semibold px-3 py-2 rounded transition-colors border-l-4'
					style={{
						// Use theme-aware text color
						color: 'light-dark(#1f2937, #f9fafb)',
						// Variant-aware background with subtle opacity
						backgroundColor: 'color-mix(in srgb, var(--node-accent) 8%, light-dark(#f8fafc, #1e293b))',
						// Accent border for visual association
						borderLeftColor: 'var(--node-accent)',
						// Theme-aware border
						border: '1px solid color-mix(in srgb, var(--node-accent) 20%, light-dark(#e2e8f0, #374151))',
					}}
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
							h-16 min-h-16 text-base px-4 py-3
							flex flex-col items-center justify-center text-center 
							rounded-lg transition-all duration-200 
							focus:outline-none focus:ring-2 focus:ring-offset-2
							hover:scale-105 transform 
							border border-transparent
							font-medium shadow-md
							transition-all duration-300 ease-in-out
							${
								isVisible
									? 'opacity-100 translate-y-0 scale-100'
									: 'opacity-0 translate-y-1 scale-95'
							}
							text-xs
							btn-node-primary
						`}
						style={{
							transitionDelay: isVisible
								? `${animationDelay + buttonIndex * 30}ms`
								: '0ms',
							// Ensure proper focus ring color using CSS custom property
							'--tw-ring-color': 'var(--node-accent)',
						} as React.CSSProperties}
					>
						<div className='mb-1' aria-hidden='true'>
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
