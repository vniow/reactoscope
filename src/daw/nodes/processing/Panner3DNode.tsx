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
import type { Panner3DFlowNode, Panner3DPanningModel } from '../../../store/dawTypes';

const color = NODE_COLORS.processor;
const PANNING_MODELS: Panner3DPanningModel[] = ['equalpower', 'HRTF'];

export const Panner3DNode = memo(function Panner3DNode({ id, data, selected }: NodeProps<Panner3DFlowNode>) {
	const setNodeParam = useDawStore(s => s.setNodeParam);
	const sx = useMemo(() => ({
		select:     hwSelectSx(color, 'small'),
		selectMenu: hwSelectMenuProps(color),
		menuItem:   hwMenuItemSx(color),
	}), []);

	return (
		<Box sx={{ borderRadius: 1, backgroundImage: METAL_BG, width: 3 * GRID_UNIT, position: 'relative', boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)' }}>
			<NodeHeader id={id} label='Panner3D' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }} className='nodrag nowheel'>
				<Select value={data.panningModel} onChange={e => setNodeParam(id, { panningModel: e.target.value as Panner3DPanningModel })} fullWidth
					sx={sx.select} MenuProps={sx.selectMenu}>
					{PANNING_MODELS.map(m => (
						<MenuItem key={m} value={m} sx={sx.menuItem}>{m}</MenuItem>
					))}
				</Select>
				<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
					<HwArcSlider label='x' value={data.positionX} min={-10} max={10} step={0.1} color={color} onChange={v => setNodeParam(id, { positionX: v })} format={v => v.toFixed(1)} allowValueEdit allowBoundsEdit />
					<HwArcSlider label='y' value={data.positionY} min={-10} max={10} step={0.1} color={color} onChange={v => setNodeParam(id, { positionY: v })} format={v => v.toFixed(1)} allowValueEdit allowBoundsEdit />
					<HwArcSlider label='z' value={data.positionZ} min={-10} max={10} step={0.1} color={color} onChange={v => setNodeParam(id, { positionZ: v })} format={v => v.toFixed(1)} allowValueEdit allowBoundsEdit />
				</Box>
			</Box>

			<Handle type='target' position={Position.Left}  id='in-0'  style={inputHandleStyle(color)} />
			<Handle type='source' position={Position.Right} id='out-0' style={outputHandleStyle(color)} />
		</Box>
	);
});
