import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useDawStore } from '../../../store/daw';
import { NodeHeader } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { inputHandleStyle, outputHandleStyle } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import { CompressorControls } from '../shared/CompressorControls';
import type { MidSideCompressorFlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.dynamics;

export const MidSideCompressorNode = memo(function MidSideCompressorNode({ id, data, selected }: NodeProps<MidSideCompressorFlowNode>) {
	const setNodeParam = useDawStore(s => s.setNodeParam);

	return (
		<Box sx={{ borderRadius: 1, backgroundImage: METAL_BG, width: 5 * GRID_UNIT, position: 'relative', boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)' }}>
			<NodeHeader id={id} label='MidSideCompressor' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 1, textAlign: 'center' }}>
				<Typography variant='caption' color='text.disabled' sx={{ fontSize: 9 }}>
					requires a stereo input signal
				</Typography>
			</Box>

			<Box sx={{ px: 1.75, pt: 1, pb: 0.75, display: 'flex', gap: 2 }} className='nodrag nowheel'>
				<Box sx={{ flex: 1 }}>
					<Typography variant='caption' color='text.secondary' sx={{ fontSize: 10, display: 'block', textAlign: 'center', mb: 0.5 }}>mid</Typography>
					<CompressorControls value={data.mid} onChange={update => setNodeParam(id, { mid: { ...data.mid, ...update } })} color={color} />
				</Box>
				<Box sx={{ flex: 1 }}>
					<Typography variant='caption' color='text.secondary' sx={{ fontSize: 10, display: 'block', textAlign: 'center', mb: 0.5 }}>side</Typography>
					<CompressorControls value={data.side} onChange={update => setNodeParam(id, { side: { ...data.side, ...update } })} color={color} />
				</Box>
			</Box>

			<Handle type='target' position={Position.Left}  id='in-0'  style={inputHandleStyle(color)} />
			<Handle type='source' position={Position.Right} id='out-0' style={outputHandleStyle(color)} />
		</Box>
	);
});
