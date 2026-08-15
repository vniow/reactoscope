import { memo, useMemo, useRef } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import { useDawStore } from '../../../store/daw';
import { getAnalyserValue } from '../../../audio/engine';
import { NodeHeader } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { inputHandleStyle, outputHandleStyle } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import { hwSelectSx, hwSelectMenuProps, hwMenuItemSx, HW_INSET } from '../shared/hwStyles';
import { useCanvasReadout } from '../shared/useCanvasReadout';
import { HwArcSlider } from '../../../components/hw/HwArcSlider';
import { ANALYSIS_SIZE_OPTIONS, type AnalyserFlowNode, type AnalyserType } from '../../../store/dawTypes';

const color = NODE_COLORS.utility;
const CANVAS_W = 176;
const CANVAS_H = 48;
const ANALYSER_TYPES: AnalyserType[] = ['fft', 'waveform'];

export const AnalyserNode = memo(function AnalyserNode({ id, data, selected }: NodeProps<AnalyserFlowNode>) {
	const setNodeParam = useDawStore(s => s.setNodeParam);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const sx = useMemo(() => ({
		select:     hwSelectSx(color, 'small'),
		selectMenu: hwSelectMenuProps(color),
		menuItem:   hwMenuItemSx(color),
	}), []);

	useCanvasReadout(canvasRef, CANVAS_W, CANVAS_H, ctx => {
		const values = getAnalyserValue(id);
		if (!values) return;

		if (data.type === 'waveform') {
			ctx.strokeStyle = color;
			ctx.lineWidth = 1;
			ctx.beginPath();
			const step = CANVAS_W / values.length;
			for (let i = 0; i < values.length; i++) {
				const x = i * step;
				const y = (1 - (values[i] + 1) / 2) * CANVAS_H;
				if (i === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
			ctx.stroke();
		} else {
			const barW = CANVAS_W / values.length;
			ctx.fillStyle = color;
			for (let i = 0; i < values.length; i++) {
				const norm = Math.max(0, Math.min(1, (values[i] + 100) / 100));
				const h = norm * CANVAS_H;
				ctx.fillRect(i * barW, CANVAS_H - h, Math.max(1, barW - 1), h);
			}
		}
	});

	return (
		<Box sx={{ borderRadius: 1, backgroundImage: METAL_BG, width: 2.5 * GRID_UNIT, position: 'relative', boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)' }}>
			<NodeHeader id={id} label='Analyser' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }} className='nodrag nowheel'>
				<Box sx={{ ...HW_INSET, p: 0.5 }}>
					<canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} style={{ display: 'block', width: '100%', height: CANVAS_H }} />
				</Box>
				<Box sx={{ display: 'flex', gap: 0.75 }}>
					<Select value={data.type} onChange={e => setNodeParam(id, { type: e.target.value as AnalyserType })} fullWidth
						sx={sx.select} MenuProps={sx.selectMenu}>
						{ANALYSER_TYPES.map(t => (
							<MenuItem key={t} value={t} sx={sx.menuItem}>{t}</MenuItem>
						))}
					</Select>
					<Select value={data.size} onChange={e => setNodeParam(id, { size: Number(e.target.value) })} fullWidth
						sx={sx.select} MenuProps={sx.selectMenu}>
						{ANALYSIS_SIZE_OPTIONS.map(s => (
							<MenuItem key={s} value={s} sx={sx.menuItem}>{s}</MenuItem>
						))}
					</Select>
				</Box>
				<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
					<HwArcSlider label='smoothing' value={data.smoothing} min={0} max={1} step={0.01} color={color} onChange={v => setNodeParam(id, { smoothing: v })} format={v => v.toFixed(2)} allowValueEdit allowBoundsEdit />
				</Box>
			</Box>

			<Handle type='target' position={Position.Left}  id='in-0'  style={inputHandleStyle(color)} />
			<Handle type='source' position={Position.Right} id='out-0' style={outputHandleStyle(color)} />
		</Box>
	);
});
