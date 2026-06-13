import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { setDistortionAmount, setDistortionOversample, setDistortionWet } from '../../store/daw';
import { NodeHeader, BELOW_HEADER_HANDLE_TOP } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { GRID_UNIT } from './gridSystem';
import { inputHandleStyle, outputHandleStyle, inputLabel, rightLabel } from './handleStyles';
import { METAL_BG } from './metalBackground';
import { HW_RAISED, hwLit } from './hwStyles';
import { HwSliderField } from '../../components/HwSliderField';
import type { DistortionFlowNode } from '../../store/dawTypes';

const color = NODE_COLORS.effects;
const HANDLE_TOP = BELOW_HEADER_HANDLE_TOP;
const OVERSAMPLE_OPTIONS = ['none', '2x', '4x'] as const;

export const DistortionNode = memo(function DistortionNode({ id, data, selected }: NodeProps<DistortionFlowNode>) {
	const [distortion, setDist]       = useState(data.distortion ?? 0.4);
	const [oversample, setOversample] = useState(data.oversample ?? 'none');
	const [wet,        setWet]        = useState(data.wet        ?? 1);

	const handleOversample = (v: 'none' | '2x' | '4x') => {
		setOversample(v);
		setDistortionOversample(id, v);
	};

	return (
		<Box sx={{ border: '1px solid', borderColor: color, borderRadius: 1, backgroundImage: METAL_BG, width: 2 * GRID_UNIT, position: 'relative' }}>
			<NodeHeader id={id} label='Distortion' selected={selected} accentColor={color} />

			<Box sx={{ px: 1, pt: 2, pb: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }} className='nodrag nowheel'>
				<HwSliderField label='drive' value={distortion} min={0} max={1} step={0.01} color={color} onChange={v => { setDist(v); setDistortionAmount(id, v); }} format={v => v.toFixed(2)} allowValueEdit  allowBoundsEdit/>
				<HwSliderField label='wet'   value={wet}        min={0} max={1} step={0.01} color={color} onChange={v => { setWet(v);  setDistortionWet(id, v);    }} format={v => v.toFixed(2)} allowValueEdit />

				<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
					<Typography sx={{ fontSize: 9, color: 'text.disabled', letterSpacing: 0.5 }}>oversample</Typography>
					<Box sx={{ display: 'flex', gap: '1px' }}>
						{OVERSAMPLE_OPTIONS.map((opt, i) => {
							const active = oversample === opt;
							const radius = i === 0 ? '3px 0 0 3px' : i === 2 ? '0 3px 3px 0' : '0';
							return (
								<Box key={opt} onClick={() => handleOversample(opt)} sx={{
									flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
									py: 0.5, cursor: 'pointer',
									...(active ? hwLit(color) : HW_RAISED),
									borderRadius: radius,
									color: active ? color : 'text.disabled',
									fontSize: 9,
								}}>
									{opt}
								</Box>
							);
						})}
					</Box>
				</Box>
			</Box>

			<Handle type='target' position={Position.Left}  id='in-0'  style={{ ...inputHandleStyle(color),  top: HANDLE_TOP }} />
			{inputLabel('in', HANDLE_TOP, color)}
			<Handle type='source' position={Position.Right} id='out-0' style={{ ...outputHandleStyle(color), top: HANDLE_TOP }} />
			{rightLabel('out', HANDLE_TOP, color)}
		</Box>
	);
});
