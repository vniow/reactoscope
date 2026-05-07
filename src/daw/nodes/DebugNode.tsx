import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { NodeHeader, NODE_HEADER_HEIGHT } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { inputHandleStyle, outputHandleStyle, inputLabel, outputLabel } from './handleStyles';
import type { DebugFlowNode } from '../../store/dawTypes';

export const DebugNode = memo(function DebugNode({
	id,
	data,
	selected,
}: NodeProps<DebugFlowNode>) {
	return (
		<Box sx={{
			border:       '1px solid',
			borderColor:  NODE_COLORS.debug,
			borderRadius: 1,
			bgcolor:      `${NODE_COLORS.debug}0D`,
			minWidth:     200,
			position:     'relative',
			pb:           3,
		}}>
			<NodeHeader id={id} label={data.label} selected={selected} accentColor={NODE_COLORS.debug} />

			<Box sx={{ px: 1.5, py: 1 }}>
				<Typography variant='caption' color='text.disabled' sx={{ fontSize: 9 }}>
					Design sandbox
				</Typography>
			</Box>

			<Handle
				type='target'
				position={Position.Left}
				id='in-0'
				style={{ ...inputHandleStyle(NODE_COLORS.debug), top: `calc(${NODE_HEADER_HEIGHT}px + (100% - ${NODE_HEADER_HEIGHT}px) / 2)` }}
			/>
			{inputLabel('in', `calc(${NODE_HEADER_HEIGHT}px + (100% - ${NODE_HEADER_HEIGHT}px) / 2)`, NODE_COLORS.debug)}
			<Handle
				type='source'
				position={Position.Bottom}
				id='out-0'
				style={outputHandleStyle(NODE_COLORS.debug)}
			/>
			{outputLabel('out', NODE_COLORS.debug)}
		</Box>
	);
});
