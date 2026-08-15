import { memo, useMemo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import { useDawStore } from '../../../store/daw';
import { NodeHeader } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { inputHandleStyle, outputHandleStyle } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import { hwSelectSx, hwSelectMenuProps, hwMenuItemSx } from '../shared/hwStyles';
import { HwArcSlider } from '../../../components/hw/HwArcSlider';
import { FILTER_ROLLOFF_OPTIONS, type FilterFlowNode, type BiquadFilterType, type FilterRolloff } from '../../../store/dawTypes';

const color = NODE_COLORS.processor;
const FILTER_TYPES: BiquadFilterType[] = [
	'lowpass', 'highpass', 'bandpass', 'lowshelf', 'highshelf', 'notch', 'allpass', 'peaking',
];

export const FilterNode = memo(function FilterNode({ id, data, selected }: NodeProps<FilterFlowNode>) {
	const setNodeParam = useDawStore(s => s.setNodeParam);
	const sx = useMemo(() => ({
		select:     hwSelectSx(color, 'small'),
		selectMenu: hwSelectMenuProps(color),
		menuItem:   hwMenuItemSx(color),
	}), []);

	return (
		<Box sx={{ borderRadius: 1, backgroundImage: METAL_BG, width: 2.5 * GRID_UNIT, position: 'relative', boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)' }}>
			<NodeHeader id={id} label='Filter' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }} className='nodrag nowheel'>
				<Box sx={{ display: 'flex', gap: 0.75 }}>
					<Select value={data.type} onChange={e => setNodeParam(id, { type: e.target.value as BiquadFilterType })} fullWidth
						sx={sx.select} MenuProps={sx.selectMenu}>
						{FILTER_TYPES.map(t => (
							<MenuItem key={t} value={t} sx={sx.menuItem}>{t}</MenuItem>
						))}
					</Select>
					<Select value={data.rolloff} onChange={e => setNodeParam(id, { rolloff: Number(e.target.value) as FilterRolloff })} fullWidth
						sx={sx.select} MenuProps={sx.selectMenu}>
						{FILTER_ROLLOFF_OPTIONS.map(r => (
							<MenuItem key={r} value={r} sx={sx.menuItem}>{r}dB/oct</MenuItem>
						))}
					</Select>
				</Box>
				<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
					<HwArcSlider label='freq'   value={data.frequency} min={20}    max={20000} step={10}   color={color} onChange={v => setNodeParam(id, { frequency: v })} format={v => String(Math.round(v))} unit='Hz' allowValueEdit allowBoundsEdit />
					<HwArcSlider label='Q'      value={data.Q}         min={0.001} max={100}   step={0.1}  color={color} onChange={v => setNodeParam(id, { Q: v })}         format={v => v.toFixed(1)}           allowValueEdit allowBoundsEdit />
					<HwArcSlider label='detune' value={data.detune}    min={-1200} max={1200}  step={1}    color={color} onChange={v => setNodeParam(id, { detune: v })}    format={v => String(Math.round(v))}  unit='ct' allowValueEdit allowBoundsEdit />
					<HwArcSlider label='gain'   value={data.gain}      min={-40}   max={40}    step={0.5}  color={color} onChange={v => setNodeParam(id, { gain: v })}      format={v => v.toFixed(1)}           unit='dB' allowValueEdit allowBoundsEdit />
				</Box>
			</Box>

			<Handle type='target' position={Position.Left}  id='in-0'  style={inputHandleStyle(color)} />
			<Handle type='source' position={Position.Right} id='out-0' style={outputHandleStyle(color)} />
		</Box>
	);
});
