import { memo, Fragment } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import { NodeHeader, NODE_HEADER_HEIGHT } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { inputHandleStyle, outputHandleStyle, inputLabel, computeHandleTops } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import type { MergeFlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.processor;
const LABELS = ['L', 'R'];

export const MergeNode = memo(function MergeNode({ id, selected }: NodeProps<MergeFlowNode>) {
	const tops = computeHandleTops(2, 'normal');
	const outTop = `calc(${NODE_HEADER_HEIGHT}px + (100% - ${NODE_HEADER_HEIGHT}px) / 2)`;

	return (
		<Box sx={{ borderRadius: 1, backgroundImage: METAL_BG, width: 1.5 * GRID_UNIT, height: 2 * GRID_UNIT, position: 'relative', boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)' }}>
			<NodeHeader id={id} label='Merge' selected={selected} accentColor={color} filledHeader />

			{tops.map((top, i) => (
				<Fragment key={i}>
					<Handle type='target' position={Position.Left} id={`in-${i}`} style={{ ...inputHandleStyle(color), top }} />
					{inputLabel(LABELS[i], top, color)}
				</Fragment>
			))}

			<Handle type='source' position={Position.Right} id='out-0' style={{ ...outputHandleStyle(color), top: outTop }} />
		</Box>
	);
});
