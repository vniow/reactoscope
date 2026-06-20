import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { startAutoFilter, stopAutoFilter, setAutoFilterFrequency, setAutoFilterBaseFrequency, setAutoFilterOctaves, setAutoFilterWet } from '../../../store/daw';
import { NodeHeader } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { inputHandleStyle, outputHandleStyle } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import { HwButton } from '../shared/hwComponents';
import { HwArcSlider } from '../../../components/hw/HwArcSlider';
import type { AutoFilterFlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.effects;

export const AutoFilterNode = memo(function AutoFilterNode({ id, data, selected }: NodeProps<AutoFilterFlowNode>) {
	const [isRunning,     setIsRunning]     = useState(false);
	const [frequency,     setFreq]          = useState(data.frequency     ?? 1);
	const [baseFrequency, setBaseFrequency] = useState(data.baseFrequency ?? 200);
	const [octaves,       setOctaves]       = useState(data.octaves       ?? 2.6);
	const [wet,           setWet]           = useState(data.wet           ?? 1);

	const handleToggle = async () => {
		if (isRunning) { stopAutoFilter(id); setIsRunning(false); }
		else           { await startAutoFilter(id); setIsRunning(true); }
	};

	return (
		<Box sx={{ borderRadius: 1, backgroundImage: METAL_BG, width: 2 * GRID_UNIT, position: 'relative', boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)' }}>
			<NodeHeader id={id} label='AutoFilter' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }} className='nodrag nowheel'>
				<HwButton color={color} lit={isRunning} sx={{ py: 0.4 }} onClick={handleToggle} fullWidth className='nodrag' aria-label={isRunning ? 'Stop' : 'Start'}>
					{isRunning ? <StopIcon sx={{ fontSize: 13 }} /> : <PlayArrowIcon sx={{ fontSize: 13 }} />}
				</HwButton>
				<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
					<HwArcSlider labelBelow label='freq'    value={frequency}     min={0.1} max={10}   step={0.1}  color={color} onChange={v => { setFreq(v);          setAutoFilterFrequency(id, v);     }} format={v => v.toFixed(1)} unit='Hz' allowValueEdit allowBoundsEdit />
					<HwArcSlider labelBelow label='base'    value={baseFrequency} min={20}  max={2000} step={10}   color={color} onChange={v => { setBaseFrequency(v); setAutoFilterBaseFrequency(id, v); }} format={v => String(v)}    unit='Hz' allowValueEdit allowBoundsEdit />
					<HwArcSlider labelBelow label='octaves' value={octaves}       min={1}   max={8}    step={0.1}  color={color} onChange={v => { setOctaves(v);       setAutoFilterOctaves(id, v);       }} format={v => v.toFixed(1)}            allowValueEdit allowBoundsEdit />
					<HwArcSlider labelBelow label='wet'     value={wet}           min={0}   max={1}    step={0.01} color={color} onChange={v => { setWet(v);           setAutoFilterWet(id, v);           }} format={v => v.toFixed(2)}            allowValueEdit />
				</Box>
			</Box>

			<Handle type='target' position={Position.Left}  id='in-0'  style={inputHandleStyle(color)} />
			<Handle type='source' position={Position.Right} id='out-0' style={outputHandleStyle(color)} />
		</Box>
	);
});
