import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { startNoise, stopNoise, setNoiseType, setNoiseVolume } from '../../store/daw';
import { NodeHeader } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { GRID_UNIT } from './gridSystem';
import { outputHandleStyle, outputLabel } from './handleStyles';
import { METAL_BG } from './metalBackground';
import { HW_RAISED, hwLit, hwIconBtn, hwIconBtnLit } from './hwStyles';
import { HwSliderField } from '../../components/HwSliderField';
import type { NoiseFlowNode } from '../../store/dawTypes';

const NOISE_TYPES = ['white', 'pink', 'brown'] as const;
type NoiseType = typeof NOISE_TYPES[number];

const color = NODE_COLORS.source;

export const NoiseGeneratorNode = memo(function NoiseGeneratorNode({
	id,
	data,
	selected,
}: NodeProps<NoiseFlowNode>) {
	const [isPlaying,  setIsPlaying]      = useState(false);
	const [noiseType,  setNoiseTypeState] = useState<NoiseType>(data.noiseType ?? 'white');
	const [volume,     setVolumeState]    = useState(data.volume ?? -6);

	const handleToggle = async () => {
		if (isPlaying) { stopNoise(id); setIsPlaying(false); }
		else           { await startNoise(id); setIsPlaying(true); }
	};

	const handleTypeSelect = (t: NoiseType) => {
		setNoiseTypeState(t);
		setNoiseType(id, t);
	};

	const handleVolumeChange = (v: number) => {
		setVolumeState(v);
		setNoiseVolume(id, v);
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
			<NodeHeader id={id} label='Noise' selected={selected} accentColor={color} />

			<Box sx={{ px: 1, py: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }}>

				{/* Noise type toggle — 3 across */}
				<Box className='nodrag' sx={{ display: 'flex', gap: '1px' }}>
					{NOISE_TYPES.map((t, i) => {
						const active = noiseType === t;
						const lit    = hwLit(color);
						const radius = i === 0 ? '3px 0 0 3px' : i === 2 ? '0 3px 3px 0' : '0';
						return (
							<Button
								key={t}
								onClick={() => handleTypeSelect(t)}
								sx={{
									flex:           1,
									minWidth:       0,
									px:             0.5,
									py:             0.5,
									fontSize:       9,
									fontWeight:     600,
									letterSpacing:  0.3,
									textTransform:  'none',
									color:          active ? color : 'text.disabled',
									...(active ? lit : HW_RAISED),
									borderRadius:   radius,
									'&:hover': active
										? { ...lit, filter: 'brightness(1.1)' }
										: { background: 'linear-gradient(to bottom, #40404a 0%, #2e2e34 100%)', color: 'text.secondary' },
								}}
							>
								{t}
							</Button>
						);
					})}
				</Box>

				<Box className='nodrag nowheel'>
					<HwSliderField
						label='volume'
						value={volume}
						min={-40} max={0} step={1}
						color={color}
						onChange={handleVolumeChange}
						format={v => String(v)}
						unit='dB'
						allowValueEdit
						allowBoundsEdit
					/>
				</Box>

				<Box sx={{ display: 'flex', justifyContent: 'center' }} className='nodrag'>
					<IconButton
						onClick={handleToggle}
						size='small'
						aria-label={isPlaying ? 'Stop noise' : 'Start noise'}
						sx={isPlaying ? hwIconBtnLit(color) : hwIconBtn(color)}
					>
						{isPlaying ? <StopIcon sx={{ fontSize: 14 }} /> : <PlayArrowIcon sx={{ fontSize: 14 }} />}
					</IconButton>
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
