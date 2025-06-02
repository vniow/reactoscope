import { GridBlock } from '../GridBlock';
import { PANEL_LAYOUT } from '../../config/panelLayout';
import { ALL_NODE_TYPES, type NodeTypeOption } from '../../config/nodeTypes';
import {
	getBorderVariantClasses,
	BASE_BORDER_BUTTON_CLASSES,
} from '../../utils/buttonVariants';

interface DetailedNodeOptionsProps {
	onAddNode: (nodeType: NodeTypeOption) => void;
}

export function DetailedNodeOptions({ onAddNode }: DetailedNodeOptionsProps) {
	const { gridX, gridY, gridWidth, gridHeight } =
		PANEL_LAYOUT.sections.detailedOptions;

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
				<div className='text-sm font-medium mb-2 text-center'>
					All Node Types
				</div>
				<div className='space-y-2 overflow-auto h-full'>
					{ALL_NODE_TYPES.map((option) => (
						<button
							key={option.type}
							onClick={() => onAddNode(option)}
							className={`${BASE_BORDER_BUTTON_CLASSES} ${getBorderVariantClasses(option.variant)}`}
						>
							<div className='flex items-center gap-2 mb-1'>
								<span className='text-lg'>{option.emoji}</span>
								<span className='font-medium text-sm'>{option.name}</span>
							</div>
							<div className='text-xs text-gray-600 dark:text-gray-400 pl-6'>
								{option.description}
							</div>
						</button>
					))}
				</div>
			</div>
		</GridBlock>
	);
}
