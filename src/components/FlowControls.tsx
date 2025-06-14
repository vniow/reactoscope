import { Panel, useReactFlow } from '@xyflow/react';
import { useTheme } from '../hooks/useAppStore';
import { useAppStore } from '../stores/appStore';
import { useUIState } from '../hooks/useAppStore';
import { NodeGroupsSection } from './NodeAddPanel/NodeGroupsSection';
import { SaveRestoreModal } from './SaveRestoreModal';
import { createNode } from '../utils/nodeFactory';
import type { NodeTypeOption } from '../config/nodeTypes';
import { GRID_UNIT } from '../config/grid';
import { useEffect, useRef, useState } from 'react';

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

	// Log when ref gets attached
	useEffect(() => {
		if (panelContainerRef.current) {
			console.log('🔗 Panel container ref attached:', {
				element: panelContainerRef.current.tagName,
				className: panelContainerRef.current.className,
				children: panelContainerRef.current.children.length,
				bounds: panelContainerRef.current.getBoundingClientRect(),
			});
		}
	}, [isNodeAddPanelExpanded]);

	const handleAddNode = (nodeTypeOption: NodeTypeOption) => {
		const newNode = createNode(nodeTypeOption);
		reactFlowInstance.setNodes((nodes) => [...nodes, newNode]);
		console.log(`🎯 Added new ${nodeTypeOption.name} node:`, newNode);
		// Close the panel after adding a node
		setIsNodeAddPanelExpanded(false);
	};

	// Handle click outside to close panel
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;

			// Get the DOM path from target to root
			const getElementPath = (element: HTMLElement): string[] => {
				const path: string[] = [];
				let current = element;
				while (current && current !== document.body) {
					const identifier = current.id
						? `#${current.id}`
						: current.className
							? `.${current.className.split(' ').join('.')}`
							: current.tagName.toLowerCase();
					path.push(
						`${current.tagName.toLowerCase()}${identifier !== current.tagName.toLowerCase() ? identifier : ''}`
					);
					current = current.parentElement as HTMLElement;
				}
				return path;
			};

			console.log('🖱️ Click detected:', {
				target: target,
				targetElement: target?.tagName,
				targetId: target?.id,
				targetClassName: target?.className,
				targetText:
					target?.textContent?.slice(0, 50) +
					(target?.textContent && target.textContent.length > 50 ? '...' : ''),
				elementPath: getElementPath(target),
				panelContainerExists: !!panelContainerRef.current,
				isNodeAddPanelExpanded,
				eventType: event.type,
				eventPhase: event.eventPhase,
				bubbles: event.bubbles,
				cancelable: event.cancelable,
			});

			// Check if panel container exists and get detailed info
			if (panelContainerRef.current) {
				const rect = panelContainerRef.current.getBoundingClientRect();
				const containsTarget = panelContainerRef.current.contains(target);
				const isWithinBounds =
					event.clientX >= rect.left &&
					event.clientX <= rect.right &&
					event.clientY >= rect.top &&
					event.clientY <= rect.bottom;

				console.log('📐 Panel container analysis:', {
					containerElement: panelContainerRef.current.tagName,
					containerClassName: panelContainerRef.current.className,
					containerChildren: panelContainerRef.current.children.length,
					rect: {
						x: rect.x,
						y: rect.y,
						width: rect.width,
						height: rect.height,
						left: rect.left,
						right: rect.right,
						top: rect.top,
						bottom: rect.bottom,
					},
					mousePosition: {
						clientX: event.clientX,
						clientY: event.clientY,
						pageX: event.pageX,
						pageY: event.pageY,
					},
					containsTarget,
					isWithinBounds,
					containsVsWithinBounds:
						containsTarget === isWithinBounds ? '✅ Match' : '⚠️ Mismatch',
				});

				// Log details about the container's children
				console.log(
					'🔍 Panel container children:',
					Array.from(panelContainerRef.current.children).map(
						(child, index) => ({
							index,
							tagName: child.tagName,
							className: child.className,
							id: child.id,
							containsTarget: child.contains(target),
							rect: child.getBoundingClientRect(),
						})
					)
				);
			}

			// Decision logic with detailed logging
			if (
				panelContainerRef.current &&
				!panelContainerRef.current.contains(target)
			) {
				console.log('❌ Click is outside panel container - closing panel');
				setIsNodeAddPanelExpanded(false);
			} else if (
				panelContainerRef.current &&
				panelContainerRef.current.contains(target)
			) {
				console.log('✅ Click is inside panel container - keeping panel open');
			} else {
				console.log('🤔 Panel container not found or undefined state');
			}
		};

		if (isNodeAddPanelExpanded) {
			console.log('👂 Adding click-outside listener for expanded panel');
			document.addEventListener('mousedown', handleClickOutside);
		} else {
			console.log('🔇 Panel closed - not listening for clicks');
		}

		return () => {
			console.log('🧹 Cleaning up click-outside listener');
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
				onClick={(e) => {
					console.log('📦 Panel container clicked:', {
						target: (e.target as HTMLElement).tagName,
						currentTarget: (e.currentTarget as HTMLElement).tagName,
						stopPropagation: 'called',
					});
					e.stopPropagation();
				}}
			>
				{/* Node Selection Panel - slides up from controls when expanded */}
				{isNodeAddPanelExpanded && (
					<div
						className={`
							mb-2 glass-panel-enhanced rounded-xl overflow-hidden
							transition-all duration-300 ease-in-out
							${
								isNodeAddPanelExpanded
									? 'opacity-100 translate-y-0 scale-100'
									: 'opacity-0 translate-y-4 scale-95 pointer-events-none'
							}
						`}
						style={{
							width: `${GRID_UNIT * 7}px`, // Match controls width
							height: `${GRID_UNIT * 7}px`, // Increased height as requested
							pointerEvents: 'auto', // Ensure interactions work
							transformOrigin: 'bottom center', // Animate from bottom (near controls)
						}}
						onClick={(e) => {
							console.log('🎨 Node panel clicked - preventing bubbling');
							e.stopPropagation();
						}}
					>
						<NodeGroupsSection
							onAddNode={handleAddNode}
							isVisible={isNodeAddPanelExpanded}
						/>
					</div>
				)}

				{/* Main Controls Container */}
				<div
					className='relative glass-panel-enhanced rounded-xl transition-all duration-300 ease-in-out'
					style={{
						width: `${GRID_UNIT * 7}px`, // Wider to accommodate 7 controls (added save/restore)
						height: `${GRID_UNIT}px`, // Single row height
					}}
				>
					<div className='flex items-center justify-center h-full gap-2 px-2'>
						{/* Add Node Control - Show node selection */}
						<button
							onClick={toggleNodeAddPanel}
							title={`${isNodeAddPanelExpanded ? 'Hide' : 'Show'} node selection`}
							className={`
							flex items-center justify-center w-12 h-12 rounded-lg 
							transition-all duration-200 
							hover:bg-black/5 dark:hover:bg-white/5 
							focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
							${isNodeAddPanelExpanded ? 'shadow-md' : ''}
						`}
							style={{
								backgroundColor: isNodeAddPanelExpanded
									? 'rgba(59, 130, 246, 0.1)'
									: undefined,
								borderColor: isNodeAddPanelExpanded
									? 'rgba(59, 130, 246, 0.3)'
									: 'transparent',
								borderWidth: '1px',
								borderStyle: 'solid',
							}}
						>
							<svg
								width='18'
								height='18'
								viewBox='0 0 24 24'
								fill='none'
								stroke='currentColor'
								strokeWidth='2.5'
								className={`transition-transform duration-200 ${isNodeAddPanelExpanded ? 'rotate-45' : ''}`}
							>
								<path
									d='M12 5v14M5 12h14'
									strokeLinecap='round'
									strokeLinejoin='round'
								/>
							</svg>
						</button>

						{/* Save/Restore Control */}
						<button
							onClick={() => setIsSaveRestoreModalOpen(true)}
							title='Save & Restore Flow States'
							className='flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset'
						>
							<span className='text-lg'>💾</span>
						</button>

						{/* Zoom In Control */}
						<button
							onClick={() => zoomIn()}
							title='Zoom In'
							className='flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset'
						>
							<span className='text-lg'>🔍</span>
							<span className='text-xs ml-1'>+</span>
						</button>

						{/* Zoom Out Control */}
						<button
							onClick={() => zoomOut()}
							title='Zoom Out'
							className='flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset'
						>
							<span className='text-lg'>🔍</span>
							<span className='text-xs ml-1'>-</span>
						</button>

						{/* Fit View Control */}
						<button
							onClick={() => fitView()}
							title='Fit View'
							className='flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset'
						>
							<span className='text-lg'>⌕</span>
						</button>
						{/* Theme Toggle Control */}
						<button
							onClick={handleThemeToggle}
							title={getThemeTitle()}
							className='flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset'
						>
							<span className='text-lg'>{getThemeIcon()}</span>
						</button>

						{/* Rainbow Toggle Control */}
						<button
							onClick={toggleRainbowMetallic}
							title={`Toggle rainbow metallic theme (${metallicBackground === 'rainbow' ? 'on' : 'off'})`}
							className='flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset'
							style={{
								background:
									metallicBackground === 'rainbow'
										? 'linear-gradient(135deg, #ff0080, #ff8c00, #40e0d0, #ff0080)'
										: undefined,
								color: metallicBackground === 'rainbow' ? 'white' : undefined,
								textShadow:
									metallicBackground === 'rainbow'
										? '0 1px 2px rgba(0,0,0,0.5)'
										: undefined,
							}}
						>
							<span className='text-lg'>🌈</span>
						</button>
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
