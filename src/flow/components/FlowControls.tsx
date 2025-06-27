import { Panel, useReactFlow } from '@xyflow/react';
import { useTheme } from '../../shared/stores/useAppStore';
import { useAppStore } from '../../shared/stores/appStore';
import { useUIState } from '../../shared/stores/useAppStore';
import { NodeGroupsSection } from './NodeAddPanel/NodeGroupsSection';
import { SaveRestoreModal } from './SaveRestoreModal';
import { createNode } from '../../shared/utils/nodeFactory';
import { combineClasses } from '../../shared/utils/styleUtils';
import type { NodeTypeOption } from '../../shared/config/nodeTypes';
import { useEffect, useRef, useState } from 'react';

/**
 * Reusable control button component following design patterns
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
		// Hover and focus states
		'hover:bg-black/5 dark:hover:bg-white/5',
		'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
		// Active state
		isActive && 'bg-blue-500/10 border border-blue-500/30 shadow-md',
		// Rainbow special styling with gradient background
		isRainbow &&
			'text-white shadow-lg bg-gradient-to-br from-pink-500 via-orange-400 to-cyan-400'
	);

	return (
		<button
			onClick={onClick}
			title={title}
			className={buttonClasses}
		>
			{children}
		</button>
	);
}

export function FlowControls() {
	const { theme, setTheme } = useTheme();
	const [isSaveRestoreModalOpen, setIsSaveRestoreModalOpen] = useState(false);
	const metallicBackground = useAppStore(
		(state) => state.theme.metallicBackground
	);
	const setMetallicBackground = useAppStore(
		(state) => state.setMetallicBackground
	);
	const {
		isNodeAddPanelExpanded,
		toggleNodeAddPanel,
		setIsNodeAddPanelExpanded,
	} = useUIState();
	const { zoomIn, zoomOut, fitView } = useReactFlow();
	const reactFlowInstance = useReactFlow();
	const panelContainerRef = useRef<HTMLDivElement>(null);

	const handleAddNode = (nodeTypeOption: NodeTypeOption) => {
		const newNode = createNode(nodeTypeOption);
		reactFlowInstance.setNodes((nodes) => [...nodes, newNode]);
		// Close the panel after adding a node
		setIsNodeAddPanelExpanded(false);
	};

	// Handle click outside to close panel - simplified version
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;

			if (
				isNodeAddPanelExpanded &&
				panelContainerRef.current &&
				!panelContainerRef.current.contains(target)
			) {
				setIsNodeAddPanelExpanded(false);
			}
		};

		if (isNodeAddPanelExpanded) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [isNodeAddPanelExpanded, setIsNodeAddPanelExpanded]);

	const handleThemeToggle = () => {
		// Cycle through: light -> dark -> system -> light
		if (theme === 'light') {
			setTheme('dark');
		} else if (theme === 'dark') {
			setTheme('system');
		} else {
			setTheme('light');
		}
	};

	const getThemeIcon = () => {
		if (theme === 'light') return '☀️';
		if (theme === 'dark') return '🌙';
		return '💻'; // system
	};

	const getThemeTitle = () => {
		if (theme === 'light') return 'Switch to Dark Theme';
		if (theme === 'dark') return 'Switch to System Theme';
		return 'Switch to Light Theme';
	};

	const toggleRainbowMetallic = () => {
		setMetallicBackground(
			metallicBackground === 'rainbow' ? 'titanium' : 'rainbow'
		);
	};

	return (
		<Panel
			position='bottom-left'
			className='max-w-full'
		>
			<div
				ref={panelContainerRef}
				className='flex flex-col items-center'
			>
				{/* Node Selection Panel - slides up from controls when expanded */}
				{isNodeAddPanelExpanded && (
					<div
						className={combineClasses(
							// Base styles
							'mb-2 rounded-xl overflow-hidden w-[448px] h-[448px]',
							// Glass panel styling
							'backdrop-blur-md bg-white/80 dark:bg-gray-900/80',
							'border border-gray-200/60 dark:border-gray-700/60',
							'shadow-lg shadow-gray-500/10 dark:shadow-black/25',
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
						// Layout
						'relative w-[448px] h-16 rounded-xl',
						// Glass panel styling
						'backdrop-blur-md bg-white/80 dark:bg-gray-900/80',
						'border border-gray-200/60 dark:border-gray-700/60',
						'shadow-lg shadow-gray-500/10 dark:shadow-black/25',
						// Animation
						'transition-all duration-300 ease-in-out'
					)}
				>
					<div className='flex items-center justify-center h-full gap-2 px-2'>
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
							title={`Toggle rainbow metallic theme (${
								metallicBackground === 'rainbow' ? 'on' : 'off'
							})`}
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
