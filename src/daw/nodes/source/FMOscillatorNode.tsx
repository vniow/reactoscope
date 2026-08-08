import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { useDawStore } from '../../../store/daw';
import { NodeHeader } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { bottomOutputHandleStyle } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import { HW_RAISED, hwLit } from '../shared/hwStyles';
import { HwButton } from '../shared/hwComponents';
import { HwArcSlider } from '../../../components/hw/HwArcSlider';
import { WAVE_ICONS, OSC_TYPES } from '../shared/WaveformIcons';
import type { FMOscillatorFlowNode, OscType } from '../../../store/dawTypes';

const color = NODE_COLORS.source;

function WaveRow({ value, label: rowLabel, onChange }: { value: OscType; label: string; onChange: (t: OscType) => void }) {
	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
			<Typography sx={{ fontSize: 8, color: 'text.disabled', letterSpacing: 0.5, textTransform: 'uppercase' }}>
				{rowLabel}
			</Typography>
			<Box sx={{ display: 'flex', gap: '1px' }}>
				{OSC_TYPES.map((t, i) => {
					const active = value === t;
					const lit    = hwLit(color);
					const radius = i === 0 ? '3px 0 0 3px' : i === 3 ? '0 3px 3px 0' : '0';
					return (
						<Box key={t} onClick={() => onChange(t)} sx={{
							flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
							py: 0.5, cursor: 'pointer',
							color: active ? color : 'text.disabled',
							...(active ? lit : HW_RAISED),
							borderRadius: radius,
							'&:hover': active
								? { ...lit, filter: 'brightness(1.1)' }
								: { background: 'linear-gradient(to bottom, #40404a 0%, #2e2e34 100%)', color: 'text.secondary' },
						}}>
							{WAVE_ICONS[t](active, color)}
						</Box>
					);
				})}
			</Box>
		</Box>
	);
}

export const FMOscillatorNode = memo(function FMOscillatorNode({ id, data, selected }: NodeProps<FMOscillatorFlowNode>) {
	const setNodeParam = useDawStore(s => s.setNodeParam);
	const startNode    = useDawStore(s => s.startNode);
	const stopNode     = useDawStore(s => s.stopNode);
	const isPlaying    = useDawStore(s => s.playingNodes.has(id));

	const handleToggle = async () => {
		if (isPlaying) stopNode(id);
		else           await startNode(id);
	};

	return (
		<Box sx={{ borderRadius: 1, backgroundImage: METAL_BG, width: 2 * GRID_UNIT, position: 'relative', pb: 2, boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)' }}>
			<NodeHeader id={id} label='FM Osc' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }}>

				<Box className='nodrag'>
					<WaveRow value={data.type}           label='carrier'  onChange={t => setNodeParam(id, { type: t })} />
				</Box>
				<Box className='nodrag'>
					<WaveRow value={data.modulationType} label='mod type' onChange={t => setNodeParam(id, { modulationType: t })} />
				</Box>

				<HwButton color={color} lit={isPlaying} sx={{ py: 0.4 }} onClick={handleToggle} fullWidth className='nodrag'
					aria-label={isPlaying ? 'Stop FM oscillator' : 'Start FM oscillator'}>
					{isPlaying ? <StopIcon sx={{ fontSize: 13 }} /> : <PlayArrowIcon sx={{ fontSize: 13 }} />}
				</HwButton>

				<Box className='nodrag nowheel' sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
					<HwArcSlider label='freq'        value={data.frequency}       min={20}    max={4000} step={1}   color={color} onChange={v => setNodeParam(id, { frequency: v })}       format={v => String(v)}    unit='Hz' allowValueEdit allowBoundsEdit />
					<HwArcSlider label='mod idx'     value={data.modulationIndex} min={0}     max={50}   step={0.1} color={color} onChange={v => setNodeParam(id, { modulationIndex: v })} format={v => v.toFixed(1)}            allowValueEdit allowBoundsEdit />
					<HwArcSlider label='harmonicity' value={data.harmonicity}     min={0}     max={20}   step={0.1} color={color} onChange={v => setNodeParam(id, { harmonicity: v })}     format={v => v.toFixed(1)}            allowValueEdit allowBoundsEdit />
					<HwArcSlider label='detune'      value={data.detune}          min={-1200} max={1200} step={1}   color={color} onChange={v => setNodeParam(id, { detune: v })}          format={v => String(v)}    unit='ct' allowValueEdit allowBoundsEdit />
					<HwArcSlider label='phase'       value={data.phase}           min={0}     max={360}  step={1}   color={color} onChange={v => setNodeParam(id, { phase: v })}           format={v => String(v)}    unit='°'  allowValueEdit />
				</Box>

			</Box>

			<Handle type='source' position={Position.Bottom} id='out-0' style={bottomOutputHandleStyle(color)} />
		</Box>
	);
});
