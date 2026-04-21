import { memo, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import { useDawStore } from '../../store/daw';
import type { StubFlowNode, StubKind } from '../../store/dawTypes';

// Handle topology for each stub kind
const STUB_TOPOLOGY: Record<StubKind, { inputs: string[]; outputs: string[] }> = {
	reverb:         { inputs: ['in-0'],         outputs: ['out-0'] },
	delay:          { inputs: ['in-0'],         outputs: ['out-0'] },
	filter:         { inputs: ['in-0'],         outputs: ['out-0'] },
	distortion:     { inputs: ['in-0'],         outputs: ['out-0'] },
	compressor:     { inputs: ['in-0'],         outputs: ['out-0'] },
	noiseGenerator: { inputs: [],               outputs: ['out-0'] },
	panner:         { inputs: ['in-0'],         outputs: ['out-0', 'out-1'] },
	split:          { inputs: ['in-0'],         outputs: ['out-0', 'out-1'] },
	merge:          { inputs: ['in-0', 'in-1'], outputs: ['out-0'] },
};

/** Distribute N handles evenly as percentages across the node width. */
function getHandleLeft(index: number, total: number): string {
	if (total === 1) return '50%';
	return `${((index + 1) / (total + 1)) * 100}%`;
}

export const StubNode = memo(function StubNode({
	id,
	data,
	selected,
}: NodeProps<StubFlowNode>) {
	const onNodesChange = useDawStore(s => s.onNodesChange);
	const topo = STUB_TOPOLOGY[data.kind];

	const handleDelete = useCallback(() => {
		onNodesChange([{ type: 'remove', id }]);
	}, [id, onNodesChange]);

	return (
		<Box
			sx={{
				p:           1.5,
				border:      '1px dashed',
				borderColor: 'text.disabled',
				borderRadius: 1,
				bgcolor:     'background.paper',
				minWidth:    140,
				textAlign:   'center',
				position:    'relative',
				opacity:     0.8,
			}}
		>
			{selected && (
				<IconButton
					size='small'
					onClick={handleDelete}
					aria-label='Delete node'
					className='nodrag'
					sx={{
						position:  'absolute',
						top:       4,
						right:     4,
						zIndex:    10,
						color:     'text.secondary',
						p:         0.25,
						'&:hover': { color: 'error.main' },
					}}
				>
					<CloseIcon sx={{ fontSize: 14 }} />
				</IconButton>
			)}

			<Typography
				variant='caption'
				color='text.disabled'
				sx={{ fontWeight: 600, letterSpacing: 0.5, display: 'block' }}
			>
				{data.label.toUpperCase()}
			</Typography>
			<Typography
				variant='caption'
				color='text.disabled'
				display='block'
				sx={{ mt: 0.25, fontSize: 9 }}
			>
				stub
			</Typography>

			{topo.inputs.map((handleId, i) => (
				<Handle
					key={handleId}
					type='target'
					position={Position.Top}
					id={handleId}
					style={{
						left:       getHandleLeft(i, topo.inputs.length),
						background: '#666',
						border:     '2px solid #666',
					}}
				/>
			))}

			{topo.outputs.map((handleId, i) => (
				<Handle
					key={handleId}
					type='source'
					position={Position.Bottom}
					id={handleId}
					style={{
						left:       getHandleLeft(i, topo.outputs.length),
						background: '#666',
						border:     '2px solid #666',
					}}
				/>
			))}
		</Box>
	);
});
