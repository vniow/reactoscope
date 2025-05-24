import { useState } from 'react';
import BaseNode, { NodeButton, NodePre } from './BaseNode';
import { NODE_THEME_KEYS, NodeTypes } from '../../types/nodes';
import type { NodeProps } from '@xyflow/react';
import { createNodeSlots } from './nodeSlotUtils';

// Define proper data interface for DebugNode
interface DebugNodeData {
	label?: string;
	description?: string;
	nodeType?: string;
	debugInfo?: unknown;
	id?: string;
}

// NodeProps generic should be the data type for the node's data property
type DebugNodeProps = NodeProps;

export default function DebugNode({
	id,
	data,
	isConnectable,
	// gridSize and widthUnits/heightUnits are now primarily handled by BaseNode defaults or passed if needed
}: DebugNodeProps) {
	const [showInfo, setShowInfo] = useState(false);

	const themeKey = NODE_THEME_KEYS[NodeTypes.DEBUG];

	// Type assertion for data since we know the structure
	const nodeData = data as DebugNodeData;

	// Create slots for the debug node
	const slots = createNodeSlots({
		toolbar: (
			<div className='flex gap-1 text-xs opacity-70'>
				<span>Status: Active</span>
				<span>•</span>
				<span>Type: Debug</span>
			</div>
		),
		content: (
			<div className='flex flex-col items-center gap-2 p-1'>
				<NodeButton
					onClick={() => setShowInfo((v) => !v)}
					themeKey={themeKey}
					variant='node' // Use node-specific button styling
					className='w-full'
				>
					{showInfo ? 'Hide Debug Info' : 'Show Debug Info'}
				</NodeButton>
				{showInfo && (
					<NodePre
						className='mt-2 w-full'
						themeKey={themeKey}
					>
						{nodeData.debugInfo
							? JSON.stringify(nodeData.debugInfo, null, 2)
							: 'No debug info.'}
					</NodePre>
				)}
			</div>
		),
		footer: <div className='text-xs text-center opacity-60'>Node ID: {id}</div>,
	});

	return (
		<BaseNode
			label={nodeData.label || 'Debug Node'}
			description={nodeData.description || 'Displays debug information'}
			nodeType={nodeData.nodeType || NodeTypes.DEBUG}
			themeKey={themeKey}
			isConnectable={isConnectable}
			slots={slots}
		/>
	);
}
