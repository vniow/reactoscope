import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import {
	startOscillator, stopOscillator,
	setOscillatorFrequency, setOscillatorType,
} from '../../store/daw';
import { NodeHeader } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { GRID_UNIT } from './gridSystem';
import { outputHandleStyle, outputLabel } from './handleStyles';
import { METAL_BG } from './metalBackground';
import { HW_RAISED, hwLit, hwBtn, hwBtnLit } from './hwStyles';
import { HwSliderField } from '../../components/HwSliderField';
import type { OscillatorFlowNode } from '../../store/dawTypes';

const OSC_TYPES = ['sine', 'square', 'triangle', 'sawtooth'] as const;
type OscType = typeof OSC_TYPES[number];

const color = NODE_COLORS.source;

// ─── Waveform SVG icons ───────────────────────────────────────────────────────

function SineIcon({ active }: { active: boolean }) {
	const c = active ? color : 'currentColor';
	return (
		<svg viewBox='0 0 28 12' width={28} height={12} fill='none'>
			<path
				d='M 0,6 C 3.5,6 3.5,1 7,1 C 10.5,1 10.5,11 14,11 C 17.5,11 17.5,1 21,1 C 24.5,1 24.5,6 28,6'
				stroke={c} strokeWidth={1.5} strokeLinecap='round'
			/>
		</svg>
	);
}

function SquareIcon({ active }: { active: boolean }) {
	const c = active ? color : 'currentColor';
	return (
		<svg viewBox='0 0 28 12' width={28} height={12} fill='none'>
			<path
				d='M 0,2 L 14,2 L 14,10 L 28,10'
				stroke={c} strokeWidth={1.5} strokeLinecap='round' strokeLinejoin='round'
			/>
		</svg>
	);
}

function TriangleIcon({ active }: { active: boolean }) {
	const c = active ? color : 'currentColor';
	return (
		<svg viewBox='0 0 28 12' width={28} height={12} fill='none'>
			<path
				d='M 0,6 L 7,1 L 21,11 L 28,6'
				stroke={c} strokeWidth={1.5} strokeLinecap='round' strokeLinejoin='round'
			/>
		</svg>
	);
}

function SawtoothIcon({ active }: { active: boolean }) {
	const c = active ? color : 'currentColor';
	return (
		<svg viewBox='0 0 28 12' width={28} height={12} fill='none'>
			<path
				d='M 0,11 L 13,1 L 13,11 L 26,1'
				stroke={c} strokeWidth={1.5} strokeLinecap='round' strokeLinejoin='round'
			/>
		</svg>
	);
}

const WAVE_ICONS: Record<OscType, (active: boolean) => React.ReactNode> = {
	sine:     active => <SineIcon     active={active} />,
	square:   active => <SquareIcon   active={active} />,
	triangle: active => <TriangleIcon active={active} />,
	sawtooth: active => <SawtoothIcon active={active} />,
};

// ─── Component ────────────────────────────────────────────────────────────────

export const OscillatorNode = memo(function OscillatorNode({
	id,
	data,
	selected,
}: NodeProps<OscillatorFlowNode>) {
	const [isPlaying, setIsPlaying] = useState(false);
	const [frequency, setFreqState] = useState(data.frequency ?? 440);
	const [oscType,   setOscType]   = useState<OscType>(data.type ?? 'sine');

	const handleToggle = async () => {
		if (isPlaying) { stopOscillator(id); setIsPlaying(false); }
		else           { await startOscillator(id); setIsPlaying(true); }
	};

	const handleTypeSelect = (t: OscType) => {
		setOscType(t);
		setOscillatorType(id, t);
	};

	const handleFreqChange = (v: number) => {
		setFreqState(v);
		setOscillatorFrequency(id, v);
	};

	return (
		<Box sx={{
			border:          '1px solid',
			borderColor:     color,
			borderRadius:    1,
			backgroundImage: METAL_BG,
			width:           2 * GRID_UNIT,
			position:        'relative',
			pb:              2,
		}}>
			<NodeHeader id={id} label='Oscillator' selected={selected} accentColor={color} />

			<Box sx={{ px: 1, py: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }}>

				{/* Wave type toggle — 4 across */}
				<Box className='nodrag' sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
					<Box sx={{ display: 'flex', gap: '1px' }}>
						{OSC_TYPES.map((t, i) => {
							const active = oscType === t;
							const lit    = hwLit(color);
							const radius = i === 0 ? '3px 0 0 3px' : i === 3 ? '0 3px 3px 0' : '0';
							return (
								<Box
									key={t}
									onClick={() => handleTypeSelect(t)}
									sx={{
										flex:           1,
										display:        'flex',
										alignItems:     'center',
										justifyContent: 'center',
										py:             0.75,
										cursor:         'pointer',
										color:          active ? color : 'text.disabled',
										...(active ? lit : HW_RAISED),
										borderRadius:   radius,
										'&:hover': active
											? { ...lit, filter: 'brightness(1.1)' }
											: { background: 'linear-gradient(to bottom, #40404a 0%, #2e2e34 100%)', color: 'text.secondary' },
									}}
								>
									{WAVE_ICONS[t](active)}
								</Box>
							);
						})}
					</Box>
					<Typography sx={{ fontSize: 9, color: 'text.disabled', textAlign: 'center', letterSpacing: 0.5 }}>
						{oscType}
					</Typography>
				</Box>

				{/* Play / stop — full width */}
				<Button
					onClick={handleToggle}
					fullWidth
					className='nodrag'
					aria-label={isPlaying ? 'Stop oscillator' : 'Start oscillator'}
					sx={isPlaying ? { ...hwBtnLit(color), py: 0.4 } : { ...hwBtn(color), py: 0.4 }}
				>
					{isPlaying
						? <StopIcon      sx={{ fontSize: 13 }} />
						: <PlayArrowIcon sx={{ fontSize: 13 }} />}
				</Button>

				{/* Frequency slider */}
				<Box className='nodrag nowheel'>
					<HwSliderField
						label='freq'
						value={frequency}
						min={20} max={4000} step={1}
						color={color}
						onChange={handleFreqChange}
						format={v => String(v)}
						unit='Hz'
						allowValueEdit
						allowBoundsEdit
					/>
				</Box>

			</Box>

			<Handle
				type='source'
				position={Position.Bottom}
				id='out-0'
				style={outputHandleStyle(color)}
			/>
			{outputLabel('out', color)}
		</Box>
	);
});
