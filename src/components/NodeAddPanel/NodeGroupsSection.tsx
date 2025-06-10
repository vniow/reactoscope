import { GridBlock } from '../GridBlock';
import { PANEL_LAYOUT } from '../../config/panelLayout';
import {
	groupNodesByVariant,
	getVariantDisplayOrder,
	VARIANT_DISPLAY_NAMES,
	type NodeTypeOption,
} from '../../config/nodeTypes';
import {
	BASE_BUTTON_CLASSES,
	VARIANT_BUTTON_CLASSES,
} from '../../utils/buttonVariants';
import type { ComponentVariant } from '../../types/ui';

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

	if (!isVisible) {
		return null;
	}

	return (
		<GridBlock
			gridWidth={gridWidth}
			gridHeight={gridHeight}
			gridX={gridX}
			gridY={gridY}
			showBorder={true}
			transparentBackground={false}
		>
			<div
				className='w-full h-full p-3 overflow-auto'
				role='region'
				aria-label='Node types grouped by category'
			>
				<div className='space-y-4'>
					{variantOrder.map((variant) => {
						const nodes = nodeGroups[variant];
						if (!nodes || nodes.length === 0) return null;

						return (
							<VariantSection
								key={variant}
								variant={variant}
								nodes={nodes}
								onAddNode={onAddNode}
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
}

function VariantSection({ variant, nodes, onAddNode }: VariantSectionProps) {
	const variantName = VARIANT_DISPLAY_NAMES[variant];
	const sectionId = `node-section-${variant}`;

	return (
		<section
			className='variant-section'
			data-variant={variant}
			aria-labelledby={sectionId}
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
				className='grid grid-cols-3 gap-2 mb-1'
				role='group'
				aria-labelledby={sectionId}
			>
				{nodes.map((option) => (
					<button
						key={option.type}
						onClick={() => onAddNode(option)}
						className={`${BASE_BUTTON_CLASSES} ${VARIANT_BUTTON_CLASSES} h-14 min-h-14 flex flex-col items-center justify-center text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 hover:scale-105 transform transition-transform`}
						title={option.description}
						aria-label={`Add ${option.name} node. ${option.description}`}
						data-variant={option.variant}
						tabIndex={0}
					>
						<div
							className='text-sm mb-1'
							aria-hidden='true'
						>
							{option.emoji}
						</div>
						<div className='text-xs leading-tight font-medium text-white'>
							{option.name.split(' ').slice(0, 2).join(' ')}
						</div>
					</button>
				))}
			</div>
		</section>
	);
}
