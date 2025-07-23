import { Panel } from '@xyflow/react';
import { NodeGroupsSection } from './NodeAddPanel/NodeGroupsSection';
import { SaveRestoreModal } from './SaveRestoreModal';
import { useFlowControls } from '../hooks/useFlowControls';
import { combineClasses } from '../../shared/utils/styleUtils';

/**
 * ControlButton: purely presentational reusable button following design patterns
 */
interface ControlButtonProps {
	onClick: () => void;
	title: string;
	children: React.ReactNode;
	isActive?: boolean;
	isRainbow?: boolean;
}

function ControlButton({
	onClick,
	title,
	children,
	isActive = false,
	isRainbow = false,
}: ControlButtonProps) {
	const buttonClasses = combineClasses(
		// Base button styles
		'flex items-center justify-center w-12 h-12 rounded-lg',
		'transition-all duration-200',
		// Semantic hover background
		'hover:bg-interactive-hover',
		// Focus ring uses semantic interactive focus color
		'focus:outline-none focus:ring-2 focus:ring-[var(--color-interactive-border-focus)] focus:ring-inset',
		// Active state semantic styling
		isActive &&
			'bg-[var(--color-interactive-border)]/10 border-[var(--color-interactive-border)]/30 shadow-[var(--color-interactive-border)]',
		// Rainbow special styling using semantic rainbow tokens
		isRainbow &&
			'text-white shadow-lg bg-gradient-to-br ' +
				'from-[var(--color-rainbow-red)] via-[var(--color-rainbow-orange)] to-[var(--color-rainbow-cyan)]'
	);

	return (
		<button
			onClick={onClick}
			aria-label={title}
			title={title}
			className={buttonClasses}
		>
			{children}
		</button>
	);
}

/**
 * FlowControls: presenter component rendering control panel UI
 */
export function FlowControls() {
	const {
		isSaveRestoreModalOpen,
		setIsSaveRestoreModalOpen,
		metallicBackground,
		isNodeAddPanelExpanded,
		toggleNodeAddPanel,
		zoomIn,
		zoomOut,
		fitView,
		handleAddNode,
		handleThemeToggle,
		getThemeIcon,
		getThemeTitle,
		toggleRainbowMetallic,
	} = useFlowControls();

	return (
		<Panel
			position='bottom-left'
			className='max-w-full'
		>
			<div className='flex flex-col items-center'>
				{/* Node Selection Panel - slides up from controls when expanded */}
				{isNodeAddPanelExpanded && (
					<div
						className={combineClasses(
							// Base styles using grid utilities
							'mb-2 rounded-xl overflow-hidden w-grid-7 h-grid-7',
							// Glass panel styling (semantic surface & interactive border)
							'backdrop-blur-md bg-[var(--color-surface)]/80 dark:bg-[var(--color-surface-elevated)]/80',
							'border border-[var(--color-interactive-border)]/60 dark:border-[var(--color-interactive-border)]/60',
							'shadow-lg shadow-[var(--color-interactive-border)]/10 dark:shadow-[var(--color-interactive-border)]/25',
							// Animation
							'transition-all duration-300 ease-in-out origin-bottom',
							// Conditional states
							isNodeAddPanelExpanded
								? 'opacity-100 translate-y-0 scale-100'
								: 'opacity-0 translate-y-4 scale-95 pointer-events-none'
						)}
					>
						<NodeGroupsSection
							onAddNode={handleAddNode}
							isVisible={isNodeAddPanelExpanded}
						/>
					</div>
				)}

				{/* Main Controls Container */}
				<div
					className={combineClasses(
						// Layout using grid utilities
						'relative w-grid-7 h-grid-1 rounded-xl',
						// Glass panel styling (semantic surface & interactive border)
						'backdrop-blur-md bg-[var(--color-surface)]/80 dark:bg-[var(--color-surface-elevated)]/80',
						'border border-[var(--color-interactive-border)]/60 dark:border-[var(--color-interactive-border)]/60',
						'shadow-lg shadow-[var(--color-interactive-border)]/10 dark:shadow-[var(--color-interactive-border)]/25',
						// Animation
						'transition-all duration-300 ease-in-out'
					)}
				>
					<div
						className='flex items-center justify-center h-full gap-2 px-2'
						role='toolbar'
						aria-label='Flow controls'
					>
						{/* Add Node Control */}
						<ControlButton
							onClick={toggleNodeAddPanel}
							title={`${isNodeAddPanelExpanded ? 'Hide' : 'Show'} node selection`}
							isActive={isNodeAddPanelExpanded}
						>
							<svg
								width='18'
								height='18'
								viewBox='0 0 24 24'
								fill='none'
								stroke='currentColor'
								strokeWidth='2.5'
								className={`transition-transform duration-200 ${
									isNodeAddPanelExpanded ? 'rotate-45' : ''
								}`}
							>
								<path
									d='M12 5v14M5 12h14'
									strokeLinecap='round'
									strokeLinejoin='round'
								/>
							</svg>
						</ControlButton>

						{/* Save/Restore Control */}
						<ControlButton
							onClick={() => setIsSaveRestoreModalOpen(true)}
							title='Save & Restore Flow States'
						>
							<span className='text-lg'>💾</span>
						</ControlButton>

						{/* Zoom In Control */}
						<ControlButton
							onClick={() => zoomIn()}
							title='Zoom In'
						>
							<span className='text-lg'>🔍</span>
							<span className='text-xs ml-1'>+</span>
						</ControlButton>

						{/* Zoom Out Control */}
						<ControlButton
							onClick={() => zoomOut()}
							title='Zoom Out'
						>
							<span className='text-lg'>🔍</span>
							<span className='text-xs ml-1'>-</span>
						</ControlButton>

						{/* Fit View Control */}
						<ControlButton
							onClick={() => fitView()}
							title='Fit View'
						>
							<span className='text-lg'>⌕</span>
						</ControlButton>

						{/* Theme Toggle Control */}
						<ControlButton
							onClick={handleThemeToggle}
							title={getThemeTitle()}
						>
							<span className='text-lg'>{getThemeIcon()}</span>
						</ControlButton>

						{/* Rainbow Toggle Control */}
						<ControlButton
							onClick={toggleRainbowMetallic}
							title={`Toggle rainbow metallic theme (${metallicBackground === 'rainbow' ? 'on' : 'off'})`}
							isRainbow={metallicBackground === 'rainbow'}
						>
							<span className='text-lg'>🌈</span>
						</ControlButton>
					</div>
				</div>

				{/* Save/Restore Modal */}
				<SaveRestoreModal
					isOpen={isSaveRestoreModalOpen}
					onClose={() => setIsSaveRestoreModalOpen(false)}
				/>
			</div>
		</Panel>
	);
}
