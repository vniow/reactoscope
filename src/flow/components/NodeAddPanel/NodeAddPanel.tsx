import { Panel, useReactFlow } from '@xyflow/react';
import { useEffect, useRef } from 'react';
import { NodeAddHeader } from './NodeAddHeader';
import { NodeGroupsSection } from './NodeGroupsSection';
import { PANEL_LAYOUT } from '../../../shared/config/panelLayout';
import { createNode } from '../../../shared/utils/nodeFactory';
import { useUIState } from '../../../shared/stores/useAppStore';
import type { NodeTypeOption } from '../../../shared/config/nodeTypes';

export function NodeAddPanel() {
	const reactFlowInstance = useReactFlow();
	const { isNodeAddPanelExpanded, setIsNodeAddPanelExpanded } = useUIState();
	const panelRef = useRef<HTMLDivElement>(null);

	const handleAddNode = (nodeTypeOption: NodeTypeOption) => {
		const newNode = createNode(nodeTypeOption);
		reactFlowInstance.setNodes((nodes) => [...nodes, newNode]);
		console.log(`🎯 Added new ${nodeTypeOption.name} node:`, newNode);
	};

	const handleToggleExpanded = () => {
		setIsNodeAddPanelExpanded(!isNodeAddPanelExpanded);
	};

	const handlePanelClick = () => {
		if (isNodeAddPanelExpanded) {
			console.log('🖱️ Click inside add node panel');
		}
	};

	// Handle clicks outside the panel when expanded
	useEffect(() => {
		if (!isNodeAddPanelExpanded) return;

		const handleClickOutside = (event: MouseEvent) => {
			console.log('🖱️ Document click detected, checking if outside panel');

			if (panelRef.current && event.target) {
				const target = event.target as Element;
				const isClickInsidePanel = panelRef.current.contains(target);

				console.log('🔍 Click outside check:', {
					hasPanel: !!panelRef.current,
					hasTarget: !!event.target,
					targetType: event.target.constructor.name,
					isInsidePanel: isClickInsidePanel,
				});

				if (!isClickInsidePanel) {
					console.log('🖱️ Click outside add node panel');
				}
			}
		};

		console.log('👂 Adding document click listener for outside clicks');
		document.addEventListener('click', handleClickOutside, true);
		return () => {
			console.log('🧹 Removing document click listener');
			document.removeEventListener('click', handleClickOutside, true);
		};
	}, [isNodeAddPanelExpanded]);

	return (
		<Panel
			position='top-left'
			className='max-w-full pointer-events-none'
		>
			{/* Main container with custom blurred background styling */}
			<div
				ref={panelRef}
				onClick={handlePanelClick}
				className='relative glass-panel-enhanced rounded-xl transition-all duration-300 ease-in-out overflow-hidden'
				style={{
					width: `${PANEL_LAYOUT.width}px`,
					height: `${isNodeAddPanelExpanded ? PANEL_LAYOUT.heightExpanded : PANEL_LAYOUT.heightCollapsed}px`,
					pointerEvents: 'auto', // Re-enable pointer events only for the actual content
				}}
			>
				{/* Header Section */}
				<NodeAddHeader
					isExpanded={isNodeAddPanelExpanded}
					onToggleExpanded={handleToggleExpanded}
				/>

				{/* Node Groups Section - Only visible when expanded */}
				<NodeGroupsSection
					onAddNode={handleAddNode}
					isVisible={isNodeAddPanelExpanded}
				/>
			</div>
		</Panel>
	);
}
