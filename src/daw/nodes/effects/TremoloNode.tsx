import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { startTremolo, stopTremolo, setTremoloFrequency, setTremoloDepth, setTremoloWet } from '../../../store/daw';
import { NodeHeader } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { inputHandleStyle, outputHandleStyle } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import { HwButton } from '../shared/hwComponents';
import { HwArcSlider } from '../../../components/hw/HwArcSlider';
import type { TremoloFlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.effects;

export const TremoloNode = memo(function TremoloNode({ id, data, selected }: NodeProps<TremoloFlowNode>) {
	const [isRunning, setIsRunning] = useState(false);
	const [frequency, setFreq]      = useState(data.frequency ?? 10);
	const [depth,     setDepth]     = useState(data.depth     ?? 0.5);
	const [wet,       setWet]       = useState(data.wet       ?? 0.5);

	const handleToggle = async () => {
		if (isRunning) { stopTremolo(id); setIsRunning(false); }
		else           { await startTremolo(id); setIsRunning(true); }
	};

	return (
		<Box sx={{ borderRadius: 1, backgroundImage: METAL_BG, width: 2 * GRID_UNIT, position: 'relative', boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)' }}>
			<NodeHeader id={id} label='Tremolo' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 0.75, display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }} className='nodrag nowheel'>
				<HwButton color={color} lit={isRunning} sx={{ py: 0.4 }} onClick={handleToggle} fullWidth className='nodrag' aria-label={isRunning ? 'Stop' : 'Start'}>
					{isRunning ? <StopIcon sx={{ fontSize: 13 }} /> : <PlayArrowIcon sx={{ fontSize: 13 }} />}
				</HwButton>
				<HwArcSlider labelBelow label='freq'  value={frequency} min={0.1} max={20} step={0.1}  color={color} onChange={v => { setFreq(v);  setTremoloFrequency(id, v); }} format={v => v.toFixed(1)} unit='Hz' allowValueEdit allowBoundsEdit />
				<HwArcSlider labelBelow label='depth' value={depth}     min={0}   max={1}  step={0.01} color={color} onChange={v => { setDepth(v); setTremoloDepth(id, v);     }} format={v => v.toFixed(2)}            allowValueEdit allowBoundsEdit />
				<HwArcSlider labelBelow label='wet'   value={wet}       min={0}   max={1}  step={0.01} color={color} onChange={v => { setWet(v);   setTremoloWet(id, v);       }} format={v => v.toFixed(2)}            allowValueEdit />
			</Box>

			<Handle type='target' position={Position.Left}  id='in-0'  style={inputHandleStyle(color)} />
			<Handle type='source' position={Position.Right} id='out-0' style={outputHandleStyle(color)} />
		</Box>
	);
});
