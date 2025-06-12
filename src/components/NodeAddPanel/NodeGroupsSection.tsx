import { GridBlock } from '../GridBlock';
import { PANEL_LAYOUT } from '../../config/panelLayout';
import {
	groupNodesByVariant,
	getVariantDisplayOrder,
	VARIANT_DISPLAY_NAMES,
	type NodeTypeOption,
} from '../../config/nodeTypes';
import { VariantButton } from '../ui/VariantButton';
import type { ComponentVariant } from '../../types/ui';
import { useEffect } from 'react';

interface NodeGroupsSectionProps {
	onAddNode: (nodeType: NodeTypeOption) => void;
	isVisible: boolean;
}

export function NodeGroupsSection({
	onAddNode,
	isVisible,
}: NodeGroupsSectionProps) {
	const { gridX, gridY, gridWidth, gridHeight } =
		PANEL_LAYOUT.sections.nodeGroups;
	const nodeGroups = groupNodesByVariant();
	const variantOrder = getVariantDisplayOrder();

	// Log when component renders
	useEffect(() => {
		console.log('🎭 NodeGroupsSection rendered:', {
			isVisible,
			nodeGroups: Object.keys(nodeGroups).length,
			totalNodes: Object.values(nodeGroups).flat().length,
		});
	}, [isVisible, nodeGroups]);

	const handleAddNode = (nodeType: NodeTypeOption) => {
		console.log('🎯 NodeGroupsSection - Node clicked:', {
			nodeType: nodeType.name,
			variant: nodeType.variant,
			timestamp: new Date().toISOString(),
		});
		onAddNode(nodeType);
	};

	return (
		<GridBlock
			gridWidth={gridWidth}
			gridHeight={gridHeight}
			gridX={gridX}
			gridY={gridY}
			showBorder={false}
			transparentBackground={true}
			className={`overflow-hidden ${!isVisible ? 'pointer-events-none' : ''}`}
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
		</GridBlock>
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
						// Use high contrast primary text color
						color: 'var(--node-text-primary, light-dark(#1f2937, #f9fafb))',
						// Subtle background that doesn't interfere with text readability
						backgroundColor:
							'color-mix(in srgb, var(--node-accent) 8%, light-dark(#f8fafc, #1e293b))',
						// Accent border for visual association
						borderLeftColor: 'var(--node-accent)',
						// Add subtle border for better definition
						border:
							'1px solid color-mix(in srgb, var(--node-accent) 20%, light-dark(#e2e8f0, #374151))',
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
					<VariantButton
						key={option.type}
						variant={option.variant}
						size='lg'
						onClick={() => onAddNode(option)}
						title={option.description}
						aria-label={`Add ${option.name} node. ${option.description}`}
						icon={<span className='text-sm'>{option.emoji}</span>}
						useCustomColors={true}
						className={`
							transition-all duration-300 ease-in-out
							${
								isVisible
									? 'opacity-100 translate-y-0 scale-100'
									: 'opacity-0 translate-y-1 scale-95'
							}
							text-xs
						`}
						style={{
							transitionDelay: isVisible
								? `${animationDelay + buttonIndex * 30}ms`
								: '0ms',
						}}
					>
						{option.name.split(' ').slice(0, 2).join(' ')}
					</VariantButton>
				))}
			</div>
		</section>
	);
}
