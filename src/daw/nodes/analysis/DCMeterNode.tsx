import { memo, useEffect, useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { getDCMeterValue } from '../../../audio/engine';
import { NodeHeader } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { inputHandleStyle, outputHandleStyle } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import { HwLevelMeter } from '../shared/hwComponents';
import type { DCMeterFlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.utility;
const POLL_MS = 100;

export const DCMeterNode = memo(function DCMeterNode({ id, selected }: NodeProps<DCMeterFlowNode>) {
	const [level, setLevel] = useState(0);
	const readoutRef = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		const interval = setInterval(() => {
			const v = getDCMeterValue(id);
			if (v === null) return;
			setLevel(Math.max(0, Math.min(100, Math.abs(v) * 100)));
			if (readoutRef.current) readoutRef.current.textContent = v.toFixed(3);
		}, POLL_MS);
		return () => clearInterval(interval);
	}, [id]);

	return (
		<Box sx={{ borderRadius: 1, backgroundImage: METAL_BG, width: 1.5 * GRID_UNIT, position: 'relative', boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)' }}>
			<NodeHeader id={id} label='DCMeter' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }} className='nodrag nowheel'>
				<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
					<Typography variant='caption' color='text.disabled' sx={{ fontSize: 9 }}>DC</Typography>
					<Typography variant='caption' component='span' ref={readoutRef} sx={{ fontSize: 10, color, fontFamily: 'monospace' }}>0.000</Typography>
				</Box>
				<HwLevelMeter value={level} color={color} />
			</Box>

			<Handle type='target' position={Position.Left}  id='in-0'  style={inputHandleStyle(color)} />
			<Handle type='source' position={Position.Right} id='out-0' style={outputHandleStyle(color)} />
		</Box>
	);
});
