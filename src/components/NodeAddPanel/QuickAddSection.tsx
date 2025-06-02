import { GridBlock } from '../GridBlock';
import { PANEL_LAYOUT } from '../../config/panelLayout';
import { QUICK_ADD_NODES, type NodeTypeOption } from '../../config/nodeTypes';
import {
	getButtonVariantClasses,
	BASE_BUTTON_CLASSES,
} from '../../utils/buttonVariants';

interface QuickAddSectionProps {
	onAddNode: (nodeType: NodeTypeOption) => void;
}

export function QuickAddSection({ onAddNode }: QuickAddSectionProps) {
	const { gridX, gridY, gridWidth, gridHeight } =
		PANEL_LAYOUT.sections.quickAdd;

	return (
		<GridBlock
			gridWidth={gridWidth}
			gridHeight={gridHeight}
			gridX={gridX}
			gridY={gridY}
			variant='default'
			showBorder={true}
			transparentBackground={false}
		>
			<div className='w-full h-full p-2'>
				<div className='text-sm font-medium mb-2 text-center'>Quick Add</div>
				<div className='grid grid-cols-4 gap-1'>
					{QUICK_ADD_NODES.map((option) => (
						<button
							key={option.type}
							onClick={() => onAddNode(option)}
							className={`${BASE_BUTTON_CLASSES} ${getButtonVariantClasses(option.variant)}`}
							title={option.description}
						>
							<div className='text-sm mb-1'>{option.emoji}</div>
							<div className='text-xs leading-tight'>
								{option.name.split(' ')[0]}
							</div>
						</button>
					))}
				</div>
			</div>
		</GridBlock>
	);
}
