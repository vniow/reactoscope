import { Panel, useReactFlow } from '@xyflow/react';
import { useState } from 'react';
import { NodeAddHeader } from './NodeAddHeader';
import { NodeGroupsSection } from './NodeGroupsSection';
import { PANEL_LAYOUT } from '../../config/panelLayout';
import { createNode } from '../../utils/nodeFactory';
import type { NodeTypeOption } from '../../config/nodeTypes';

export function NodeAddPanel() {
	const reactFlowInstance = useReactFlow();
	const [isExpanded, setIsExpanded] = useState(false);

	const handleAddNode = (nodeTypeOption: NodeTypeOption) => {
		const newNode = createNode(nodeTypeOption);
		reactFlowInstance.setNodes((nodes) => [...nodes, newNode]);
		console.log(`🎯 Added new ${nodeTypeOption.name} node:`, newNode);
	};

	const handleToggleExpanded = () => {
		setIsExpanded(!isExpanded);
	};

	return (
		<Panel
			position='top-left'
			className='w-96 max-w-full'
		>
			{/* Main container with custom blurred background styling */}
			<div
				className='relative glass-panel-enhanced rounded-xl transition-all duration-300 ease-in-out'
				style={{
					width: `${PANEL_LAYOUT.width}px`,
					height: `${isExpanded ? PANEL_LAYOUT.heightExpanded : PANEL_LAYOUT.heightCollapsed}px`,
				}}
			>
				{/* Header Section */}
				<NodeAddHeader
					isExpanded={isExpanded}
					onToggleExpanded={handleToggleExpanded}
				/>

				{/* Node Groups Section - Only visible when expanded */}
				<NodeGroupsSection
					onAddNode={handleAddNode}
					isVisible={isExpanded}
				/>
			</div>
		</Panel>
	);
}
