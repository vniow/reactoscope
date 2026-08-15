import { memo, useEffect, useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useDawStore } from '../../../store/daw';
import { getMeterValue } from '../../../audio/engine';
import { NodeHeader } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { inputHandleStyle, outputHandleStyle } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import { HwSwitch, HwLevelMeter } from '../shared/hwComponents';
import { HwArcSlider } from '../../../components/hw/HwArcSlider';
import type { MeterFlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.utility;
const POLL_MS = 100;

export const MeterNode = memo(function MeterNode({ id, data, selected }: NodeProps<MeterFlowNode>) {
	const setNodeParam = useDawStore(s => s.setNodeParam);
	const [level, setLevel] = useState(0);
	const readoutRef = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		const interval = setInterval(() => {
			const v = getMeterValue(id);
			if (v === null) return;
			const pct = data.normalRange
				? v * 100
				: ((v + 60) / 60) * 100; // rough -60..0dB -> 0..100
			const clamped = Math.max(0, Math.min(100, pct));
			setLevel(clamped);
			if (readoutRef.current) readoutRef.current.textContent = v.toFixed(1);
		}, POLL_MS);
		return () => clearInterval(interval);
	}, [id, data.normalRange]);

	return (
		<Box sx={{ borderRadius: 1, backgroundImage: METAL_BG, width: 2 * GRID_UNIT, position: 'relative', boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)' }}>
			<NodeHeader id={id} label='Meter' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }} className='nodrag nowheel'>
				<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
					<Typography variant='caption' color='text.disabled' sx={{ fontSize: 9 }}>level</Typography>
					<Typography variant='caption' component='span' ref={readoutRef} sx={{ fontSize: 10, color, fontFamily: 'monospace' }}>0.0</Typography>
				</Box>
				<HwLevelMeter value={level} color={color} />
				<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
					<HwArcSlider label='smoothing' value={data.smoothing} min={0} max={1} step={0.01} color={color} onChange={v => setNodeParam(id, { smoothing: v })} format={v => v.toFixed(2)} allowValueEdit allowBoundsEdit />
				</Box>
				<HwSwitch checked={data.normalRange} color={color} onChange={() => setNodeParam(id, { normalRange: !data.normalRange })} label='normal range' />
			</Box>

			<Handle type='target' position={Position.Left}  id='in-0'  style={inputHandleStyle(color)} />
			<Handle type='source' position={Position.Right} id='out-0' style={outputHandleStyle(color)} />
		</Box>
	);
});
