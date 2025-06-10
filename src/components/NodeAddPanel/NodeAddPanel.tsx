import { useState } from 'react';
import { Panel, useReactFlow } from '@xyflow/react';
import { NodeAddHeader } from './NodeAddHeader';
import { QuickAddSection } from './QuickAddSection';
import { DetailedNodeOptions } from './DetailedNodeOptions';
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

		// Collapse the panel after adding a node
		setIsExpanded(false);
	};

	return (
		<Panel
			position='top-left'
			className='w-96 max-w-full'
		>
			{/* Main container using grid layout */}
			<div
				className='relative'
				style={{
					width: `${PANEL_LAYOUT.width}px`,
					height: isExpanded
						? `${PANEL_LAYOUT.heightExpanded}px`
						: `${PANEL_LAYOUT.heightCollapsed}px`,
				}}
			>
				{/* Header Section */}
				<NodeAddHeader
					isExpanded={isExpanded}
					onToggleExpanded={() => setIsExpanded(!isExpanded)}
				/>

				{/* Quick Add Section - Always visible */}
				<QuickAddSection onAddNode={handleAddNode} />

				{/* Expanded Content - Only visible when expanded */}
				{isExpanded && (
					<>
						{/* Detailed Node Options */}
						<DetailedNodeOptions onAddNode={handleAddNode} />
					</>
				)}
			</div>
		</Panel>
	);
}
