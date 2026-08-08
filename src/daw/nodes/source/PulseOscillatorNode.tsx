import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { useDawStore } from '../../../store/daw';
import { NodeHeader } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { bottomOutputHandleStyle } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import { HwButton } from '../shared/hwComponents';
import { HwArcSlider } from '../../../components/hw/HwArcSlider';
import type { PulseOscillatorFlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.source;

export const PulseOscillatorNode = memo(function PulseOscillatorNode({ id, data, selected }: NodeProps<PulseOscillatorFlowNode>) {
	const setNodeParam = useDawStore(s => s.setNodeParam);
	const startNode    = useDawStore(s => s.startNode);
	const stopNode     = useDawStore(s => s.stopNode);
	const isPlaying    = useDawStore(s => s.playingNodes.has(id));

	const handleToggle = async () => {
		if (isPlaying) stopNode(id);
		else           await startNode(id);
	};

	return (
		<Box sx={{ borderRadius: 1, backgroundImage: METAL_BG, width: 2 * GRID_UNIT, position: 'relative', pb: 2, boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)' }}>
			<NodeHeader id={id} label='Pulse Osc' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }}>

				<HwButton color={color} lit={isPlaying} sx={{ py: 0.4 }} onClick={handleToggle} fullWidth className='nodrag'
					aria-label={isPlaying ? 'Stop pulse oscillator' : 'Start pulse oscillator'}>
					{isPlaying ? <StopIcon sx={{ fontSize: 13 }} /> : <PlayArrowIcon sx={{ fontSize: 13 }} />}
				</HwButton>

				<Box className='nodrag nowheel' sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
					<HwArcSlider label='freq'   value={data.frequency} min={20}    max={4000} step={1}    color={color} onChange={v => setNodeParam(id, { frequency: v })} format={v => String(v)}    unit='Hz' allowValueEdit allowBoundsEdit />
					<HwArcSlider label='width'  value={data.width}     min={0}     max={1}    step={0.01} color={color} onChange={v => setNodeParam(id, { width: v })}     format={v => v.toFixed(2)}           allowValueEdit allowBoundsEdit />
					<HwArcSlider label='detune' value={data.detune}    min={-1200} max={1200} step={1}    color={color} onChange={v => setNodeParam(id, { detune: v })}    format={v => String(v)}    unit='ct' allowValueEdit allowBoundsEdit />
					<HwArcSlider label='phase'  value={data.phase}     min={0}     max={360}  step={1}    color={color} onChange={v => setNodeParam(id, { phase: v })}     format={v => String(v)}    unit='°'  allowValueEdit />
				</Box>

			</Box>

			<Handle type='source' position={Position.Bottom} id='out-0' style={bottomOutputHandleStyle(color)} />
		</Box>
	);
});
