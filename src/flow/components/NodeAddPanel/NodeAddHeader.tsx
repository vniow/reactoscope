import { PANEL_LAYOUT } from '../../../shared/config/panelLayout';

interface NodeAddHeaderProps {
	isExpanded: boolean;
	onToggleExpanded: () => void;
}

export function NodeAddHeader({
	isExpanded,
	onToggleExpanded,
}: NodeAddHeaderProps) {
	const { height } = PANEL_LAYOUT.sections.header;

	return (
		<div style={{ height }}>
			<button
				onClick={onToggleExpanded}
				className='flex items-center justify-between w-full px-4 py-2 text-left text-gray-800 transition-colors duration-200 hover:bg-node-interactive group focus:outline-none focus:ring-2 focus:ring-node-accent focus:ring-inset dark:text-gray-50'
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
					<span className='font-semibold text-gray-800 dark:text-gray-50'>
						Add Node
					</span>
				</div>
				<div className='flex items-center gap-1'>
					<span className='text-xs text-gray-600 transition-opacity group-hover:opacity-100 dark:text-gray-300'>
						{isExpanded ? 'Collapse' : 'Expand'}
					</span>
					<div
						className={`text-gray-600 transition-transform duration-200 dark:text-gray-300 ${isExpanded ? 'rotate-180' : ''}`}
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
		</div>
	);
}
