import { memo, useEffect, useMemo, useRef } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import { useDawStore } from '../../../store/daw';
import { getWaveformValue } from '../../../audio/engine';
import { NodeHeader } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { inputHandleStyle, outputHandleStyle } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import { hwSelectSx, hwSelectMenuProps, hwMenuItemSx, HW_INSET } from '../shared/hwStyles';
import { ANALYSIS_SIZE_OPTIONS, type WaveformFlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.utility;
const CANVAS_W = 176;
const CANVAS_H = 48;

export const WaveformNode = memo(function WaveformNode({ id, data, selected }: NodeProps<WaveformFlowNode>) {
	const setNodeParam = useDawStore(s => s.setNodeParam);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const rafRef = useRef<number>(0);
	const sx = useMemo(() => ({
		select:     hwSelectSx(color, 'small'),
		selectMenu: hwSelectMenuProps(color),
		menuItem:   hwMenuItemSx(color),
	}), []);

	useEffect(() => {
		const draw = () => {
			const canvas  = canvasRef.current;
			const samples = getWaveformValue(id);
			if (canvas && samples) {
				const ctx = canvas.getContext('2d');
				if (ctx) {
					ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
					ctx.strokeStyle = color;
					ctx.lineWidth = 1;
					ctx.beginPath();
					const step = CANVAS_W / samples.length;
					for (let i = 0; i < samples.length; i++) {
						const x = i * step;
						const y = (1 - (samples[i] + 1) / 2) * CANVAS_H;
						if (i === 0) ctx.moveTo(x, y);
						else ctx.lineTo(x, y);
					}
					ctx.stroke();
				}
			}
			rafRef.current = requestAnimationFrame(draw);
		};
		rafRef.current = requestAnimationFrame(draw);
		return () => cancelAnimationFrame(rafRef.current);
	}, [id]);

	return (
		<Box sx={{ borderRadius: 1, backgroundImage: METAL_BG, width: 2.5 * GRID_UNIT, position: 'relative', boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)' }}>
			<NodeHeader id={id} label='Waveform' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }} className='nodrag nowheel'>
				<Box sx={{ ...HW_INSET, p: 0.5 }}>
					<canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} style={{ display: 'block', width: '100%', height: CANVAS_H }} />
				</Box>
				<Select value={data.size} onChange={e => setNodeParam(id, { size: Number(e.target.value) })} fullWidth
					sx={sx.select} MenuProps={sx.selectMenu}>
					{ANALYSIS_SIZE_OPTIONS.map(s => (
						<MenuItem key={s} value={s} sx={sx.menuItem}>{s}</MenuItem>
					))}
				</Select>
			</Box>

			<Handle type='target' position={Position.Left}  id='in-0'  style={inputHandleStyle(color)} />
			<Handle type='source' position={Position.Right} id='out-0' style={outputHandleStyle(color)} />
		</Box>
	);
});
