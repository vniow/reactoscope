import { useState } from 'react';
import { Panel } from '@xyflow/react';
import { useFlowActions } from '../../hooks/useFlow';
import { TransportControls } from '../TransportControls';
import { GridBlock } from '../GridBlock';
import { GridButton } from '../ui/GridButton';
import { NodeAddHeader } from './NodeAddHeader';
import { QuickAddSection } from './QuickAddSection';
import { DetailedNodeOptions } from './DetailedNodeOptions';
import { MetallicThemeSelector } from './MetallicThemeSelector';
import { PANEL_LAYOUT } from '../../config/panelLayout';
import { createNode, createTestFlowNodes } from '../../utils/nodeFactory';
import type { NodeTypeOption } from '../../config/nodeTypes';

export function NodeAddPanel() {
	const { addNode } = useFlowActions();
	const [isExpanded, setIsExpanded] = useState(false);

	const handleAddNode = (nodeTypeOption: NodeTypeOption) => {
		const newNode = createNode(nodeTypeOption);
		addNode(newNode);
		console.log(`🎯 Added new ${nodeTypeOption.name} node:`, newNode);

		// Collapse the panel after adding a node
		setIsExpanded(false);
	};

	const handleAddTestFlow = () => {
		console.log(
			'🧪 Creating test flow with oscillators connected to visualizer'
		);

		const testNodes = createTestFlowNodes();
		testNodes.forEach((node) => addNode(node));

		setTimeout(() => {
			console.log(
				'✅ Test flow created with oscillators connected to visualizer'
			);
		}, 100);
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

				{/* Test Flow Button */}
				<GridButton
					gridWidth={PANEL_LAYOUT.sections.testFlow.gridWidth}
					gridHeight={PANEL_LAYOUT.sections.testFlow.gridHeight}
					gridX={PANEL_LAYOUT.sections.testFlow.gridX}
					gridY={PANEL_LAYOUT.sections.testFlow.gridY}
					variant='secondary'
					showBorder={true}
					transparentBackground={false}
					buttonLabel='🧪 Create Test Flow'
					onClick={handleAddTestFlow}
				/>

				{/* Expanded Content - Only visible when expanded */}
				{isExpanded && (
					<>
						{/* Detailed Node Options */}
						<DetailedNodeOptions onAddNode={handleAddNode} />

						{/* Metallic Theme Selector */}
						<MetallicThemeSelector
							gridWidth={PANEL_LAYOUT.sections.metallicTheme.gridWidth}
							gridHeight={PANEL_LAYOUT.sections.metallicTheme.gridHeight}
							gridX={PANEL_LAYOUT.sections.metallicTheme.gridX}
							gridY={PANEL_LAYOUT.sections.metallicTheme.gridY}
						/>

						{/* Transport Controls Section */}
						<GridBlock
							gridWidth={PANEL_LAYOUT.sections.transportControls.gridWidth}
							gridHeight={PANEL_LAYOUT.sections.transportControls.gridHeight}
							gridX={PANEL_LAYOUT.sections.transportControls.gridX}
							gridY={PANEL_LAYOUT.sections.transportControls.gridY}
							variant='audio'
							showBorder={true}
							transparentBackground={false}
						>
							<div className='w-full h-full flex items-center justify-center'>
								<TransportControls />
							</div>
						</GridBlock>
					</>
				)}
			</div>
		</Panel>
	);
}
