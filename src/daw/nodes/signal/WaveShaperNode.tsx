import { memo, useMemo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import ToggleButton from '@mui/material/ToggleButton';
import { useDawStore } from '../../../store/daw';
import { NodeHeader } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { inputHandleStyle, outputHandleStyle } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import { hwSelectSx, hwSelectMenuProps, hwMenuItemSx } from '../shared/hwStyles';
import { HwToggleButtonGroup } from '../shared/hwComponents';
import type { WaveShaperFlowNode, WaveShaperPreset } from '../../../store/dawTypes';

const color = NODE_COLORS.utility;
const PRESETS: { value: WaveShaperPreset; label: string }[] = [
	{ value: 'identity', label: 'identity' },
	{ value: 'softClip', label: 'soft clip' },
	{ value: 'hardClip', label: 'hard clip' },
];
const OVERSAMPLE_OPTIONS = ['none', '2x', '4x'] as const;

export const WaveShaperNode = memo(function WaveShaperNode({ id, data, selected }: NodeProps<WaveShaperFlowNode>) {
	const setNodeParam = useDawStore(s => s.setNodeParam);
	const sx = useMemo(() => ({
		select:     hwSelectSx(color, 'small'),
		selectMenu: hwSelectMenuProps(color),
		menuItem:   hwMenuItemSx(color),
	}), []);

	return (
		<Box sx={{ borderRadius: 1, backgroundImage: METAL_BG, width: 2.5 * GRID_UNIT, position: 'relative', boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)' }}>
			<NodeHeader id={id} label='WaveShaper' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }} className='nodrag nowheel'>
				<Select value={data.preset} onChange={e => setNodeParam(id, { preset: e.target.value as WaveShaperPreset })} fullWidth
					sx={sx.select} MenuProps={sx.selectMenu}>
					{PRESETS.map(p => (
						<MenuItem key={p.value} value={p.value} sx={sx.menuItem}>{p.label}</MenuItem>
					))}
				</Select>
				<HwToggleButtonGroup color={color} value={data.oversample} exclusive
					onChange={(_, v) => v && setNodeParam(id, { oversample: v })} className='nodrag'>
					{OVERSAMPLE_OPTIONS.map(opt => (
						<ToggleButton key={opt} value={opt}>{opt}</ToggleButton>
					))}
				</HwToggleButtonGroup>
			</Box>

			<Handle type='target' position={Position.Left}  id='in-0'  style={inputHandleStyle(color)} />
			<Handle type='source' position={Position.Right} id='out-0' style={outputHandleStyle(color)} />
		</Box>
	);
});
