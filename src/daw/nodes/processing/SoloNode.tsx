import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import { useDawStore } from '../../../store/daw';
import { NodeHeader } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { inputHandleStyle, outputHandleStyle } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import { HwSwitch } from '../shared/hwComponents';
import type { SoloFlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.processor;

export const SoloNode = memo(function SoloNode({ id, selected }: NodeProps<SoloFlowNode>) {
	const toggleSolo   = useDawStore(s => s.toggleSolo);
	const soloedNodeId = useDawStore(s => s.soloedNodeId);
	const isSoloed      = soloedNodeId === id;
	const isMutedByPeer = soloedNodeId !== null && !isSoloed;

	return (
		<Box sx={{ borderRadius: 1, backgroundImage: METAL_BG, width: 1.5 * GRID_UNIT, position: 'relative', opacity: isMutedByPeer ? 0.55 : 1, boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)' }}>
			<NodeHeader id={id} label='Solo' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 0.75, display: 'flex', justifyContent: 'center' }} className='nodrag nowheel'>
				<HwSwitch checked={isSoloed} color={color} onChange={() => toggleSolo(id)} label='solo' />
			</Box>

			<Handle type='target' position={Position.Left}  id='in-0'  style={inputHandleStyle(color)} />
			<Handle type='source' position={Position.Right} id='out-0' style={outputHandleStyle(color)} />
		</Box>
	);
});
