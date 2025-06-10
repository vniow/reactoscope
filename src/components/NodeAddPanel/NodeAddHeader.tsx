import { GridBlock } from '../GridBlock';
import { PANEL_LAYOUT } from '../../config/panelLayout';

interface NodeAddHeaderProps {
	isExpanded: boolean;
	onToggleExpanded: () => void;
}

export function NodeAddHeader({
	isExpanded,
	onToggleExpanded,
}: NodeAddHeaderProps) {
	const { gridX, gridY, gridWidth, gridHeight } = PANEL_LAYOUT.sections.header;

	return (
		<GridBlock
			gridWidth={gridWidth}
			gridHeight={gridHeight}
			gridX={gridX}
			gridY={gridY}
			showBorder={true}
			transparentBackground={false}
		>
			<button
				onClick={onToggleExpanded}
				className='flex items-center justify-between w-full px-4 py-2 text-left transition-colors duration-200 hover:bg-black/5 dark:hover:bg-white/5 group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset'
				aria-expanded={isExpanded}
				aria-label={`${isExpanded ? 'Collapse' : 'Expand'} node add panel`}
			>
				<div className='flex items-center gap-2'>
					<span
						className='text-lg'
						aria-hidden='true'
					>
						➕
					</span>
					<span className='font-semibold text-gray-900 dark:text-gray-100'>
						Add Node
					</span>
				</div>
				<div className='flex items-center gap-1'>
					<span className='text-xs text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100'>
						{isExpanded ? 'Collapse' : 'Expand'}
					</span>
					<div
						className={`transition-transform duration-200 text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 ${isExpanded ? 'rotate-180' : ''}`}
						aria-hidden='true'
					>
						<svg
							width='12'
							height='12'
							viewBox='0 0 24 24'
							fill='none'
							stroke='currentColor'
							strokeWidth='2'
						>
							<path d='m6 9 6 6 6-6' />
						</svg>
					</div>
				</div>
			</button>
		</GridBlock>
	);
}
