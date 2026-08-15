import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import { NodeHeader, NODE_HEADER_HEIGHT } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { inputHandleStyle, outputHandleStyle } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import type { AudioToGainFlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.utility;
const HANDLE_TOP = `calc(${NODE_HEADER_HEIGHT}px + ${0.5 * GRID_UNIT}px)`;

export const AudioToGainNode = memo(function AudioToGainNode({ id, selected }: NodeProps<AudioToGainFlowNode>) {
	return (
		<Box sx={{ borderRadius: 1, backgroundImage: METAL_BG, width: 1.75 * GRID_UNIT, height: NODE_HEADER_HEIGHT + GRID_UNIT, position: 'relative', boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)' }}>
			<NodeHeader id={id} label='AudioToGain' selected={selected} accentColor={color} filledHeader />

			<Handle type='target' position={Position.Left}  id='in-0'  style={{ ...inputHandleStyle(color),  top: HANDLE_TOP }} />
			<Handle type='source' position={Position.Right} id='out-0' style={{ ...outputHandleStyle(color), top: HANDLE_TOP }} />
		</Box>
	);
});
