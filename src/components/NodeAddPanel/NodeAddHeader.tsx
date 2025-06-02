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
			variant='primary'
			showBorder={true}
			transparentBackground={false}
		>
			<div className='flex items-center justify-between w-full px-2'>
				<div className='flex items-center gap-2'>
					<span className='text-lg'>➕</span>
					<span className='font-semibold'>Add Node</span>
				</div>
				<button
					onClick={onToggleExpanded}
					className='p-1 rounded hover:bg-white/20 transition-colors'
					title={isExpanded ? 'Collapse' : 'Expand'}
				>
					<svg
						className={`w-4 h-4 transition-transform ${
							isExpanded ? 'rotate-180' : ''
						}`}
						fill='none'
						stroke='currentColor'
						viewBox='0 0 24 24'
					>
						<path
							strokeLinecap='round'
							strokeLinejoin='round'
							strokeWidth={2}
							d='M19 9l-7 7-7-7'
						/>
					</svg>
				</button>
			</div>
		</GridBlock>
	);
}
