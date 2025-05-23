import { useState } from 'react';
import BaseNode, { NodeButton, NodePre } from './BaseNode';
import { NODE_THEME_KEYS, NodeType } from '../../types/nodes';
import type { NodeProps } from '@xyflow/react';

// NodeProps generic should be the data type for the node's data property
type DebugNodeProps = NodeProps;

export default function DebugNode({
	// id,
	data,
	isConnectable,
	// gridSize and widthUnits/heightUnits are now primarily handled by BaseNode defaults or passed if needed
}: DebugNodeProps) {
	const [showInfo, setShowInfo] = useState(false);

	const themeKey = NODE_THEME_KEYS[NodeType.DEBUG];

	// The old `colors` object is removed, styles come from themeKey via BaseNode

	return (
		<BaseNode
			label={data.label || 'Debug Node'}
			description={data.description || 'Displays debug information'}
			nodeType={data.nodeType}
			themeKey={themeKey}
			isConnectable={isConnectable}
			// widthUnits={6} // BaseNode has defaults, override if specific sizing is needed
			// heightUnits={5}
		>
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
					<NodePre className='mt-2 w-full'>
						{data.debugInfo
							? JSON.stringify(data.debugInfo, null, 2)
							: 'No debug info.'}
					</NodePre>
				)}
			</div>
		</BaseNode>
	);
}
