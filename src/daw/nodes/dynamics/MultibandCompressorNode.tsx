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
import { HwArcSlider } from '../../../components/hw/HwArcSlider';
import { CompressorControls } from '../shared/CompressorControls';
import type { MultibandCompressorFlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.dynamics;

// v1 UI shows threshold+ratio only per band — attack/release/knee stay at
// their defaults (docs/node-roadmap.md: 17 live controls is too heavy).
const BAND_PARAMS = ['threshold', 'ratio'] as const;

export const MultibandCompressorNode = memo(function MultibandCompressorNode({ id, data, selected }: NodeProps<MultibandCompressorFlowNode>) {
	const setNodeParam = useDawStore(s => s.setNodeParam);

	return (
		<Box sx={{ borderRadius: 1, backgroundImage: METAL_BG, width: 7 * GRID_UNIT, position: 'relative', boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)' }}>
			<NodeHeader id={id} label='MultibandCompressor' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 1, pb: 0.5, display: 'flex', gap: 1, justifyContent: 'center' }} className='nodrag nowheel'>
				<HwArcSlider label='low freq' value={data.lowFrequency}  min={20}  max={2000}  step={10} color={color}
					onChange={v => setNodeParam(id, { lowFrequency: v })}  format={v => String(Math.round(v))} unit='Hz' allowValueEdit allowBoundsEdit />
				<HwArcSlider label='hi freq'  value={data.highFrequency} min={200} max={20000} step={10} color={color}
					onChange={v => setNodeParam(id, { highFrequency: v })} format={v => String(Math.round(v))} unit='Hz' allowValueEdit allowBoundsEdit />
			</Box>

			<Box sx={{ px: 1.75, pb: 0.75, display: 'flex', gap: 1.5 }} className='nodrag nowheel'>
				<Box sx={{ flex: 1 }}>
					<Typography variant='caption' color='text.secondary' sx={{ fontSize: 10, display: 'block', textAlign: 'center', mb: 0.5 }}>low</Typography>
					<CompressorControls value={data.low} onChange={update => setNodeParam(id, { low: { ...data.low, ...update } })} color={color} params={[...BAND_PARAMS]} />
				</Box>
				<Box sx={{ flex: 1 }}>
					<Typography variant='caption' color='text.secondary' sx={{ fontSize: 10, display: 'block', textAlign: 'center', mb: 0.5 }}>mid</Typography>
					<CompressorControls value={data.mid} onChange={update => setNodeParam(id, { mid: { ...data.mid, ...update } })} color={color} params={[...BAND_PARAMS]} />
				</Box>
				<Box sx={{ flex: 1 }}>
					<Typography variant='caption' color='text.secondary' sx={{ fontSize: 10, display: 'block', textAlign: 'center', mb: 0.5 }}>high</Typography>
					<CompressorControls value={data.high} onChange={update => setNodeParam(id, { high: { ...data.high, ...update } })} color={color} params={[...BAND_PARAMS]} />
				</Box>
			</Box>

			<Handle type='target' position={Position.Left}  id='in-0'  style={inputHandleStyle(color)} />
			<Handle type='source' position={Position.Right} id='out-0' style={outputHandleStyle(color)} />
		</Box>
	);
});
