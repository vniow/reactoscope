import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { startNoise, stopNoise, setNoiseType, setNoiseVolume } from '../../store/daw';
import { NodeHeader } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { GRID_UNIT } from './gridSystem';
import { outputHandleStyle, outputLabel } from './handleStyles';
import { METAL_BG } from './metalBackground';
import type { NoiseFlowNode } from '../../store/dawTypes';

const NOISE_TYPES = ['white', 'pink', 'brown'] as const;
type NoiseType = typeof NOISE_TYPES[number];

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

	const handleTypeChange = (e: SelectChangeEvent) => {
		const t = e.target.value as NoiseType;
		setNoiseTypeState(t);
		setNoiseType(id, t);
	};

	const handleVolumeChange = (_: Event, value: number | number[]) => {
		const db = value as number;
		setVolumeState(db);
		setNoiseVolume(id, db);
	};

	return (
		<Box sx={{
			border:       '1px solid',
			borderColor:  NODE_COLORS.source,
			borderRadius: 1,
			backgroundImage: METAL_BG,
			width:        2 * GRID_UNIT,
			height:       3 * GRID_UNIT,
			position:     'relative',
			pb:           3,
		}}>
			<NodeHeader id={id} label='Noise' selected={selected} accentColor={NODE_COLORS.source} />

			<Box sx={{ px: 1.5, py: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
				<Box className='nodrag'>
					<Select
						value={noiseType}
						onChange={handleTypeChange}
						size='small'
						fullWidth
						sx={{ fontSize: 12 }}
					>
						{NOISE_TYPES.map(t => (
							<MenuItem key={t} value={t} sx={{ fontSize: 12 }}>{t}</MenuItem>
						))}
					</Select>
				</Box>

				<Box className='nodrag nowheel'>
					<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
						<Typography variant='caption' color='text.secondary'>volume</Typography>
						<Typography variant='caption' color='text.secondary'>{volume} dB</Typography>
					</Box>
					<Slider
						aria-label='Volume'
						min={-40} max={0} step={1}
						value={volume}
						onChange={handleVolumeChange}
						size='small'
						color='primary'
					/>
				</Box>

				<Box sx={{ display: 'flex', justifyContent: 'center' }}>
					<IconButton
						onClick={handleToggle}
						className='nodrag'
						size='small'
						aria-label={isPlaying ? 'Stop noise' : 'Start noise'}
						sx={{ color: isPlaying ? 'primary.main' : 'text.secondary' }}
					>
						{isPlaying ? <StopIcon fontSize='small' /> : <PlayArrowIcon fontSize='small' />}
					</IconButton>
				</Box>
			</Box>

			<Handle
				type='source'
				position={Position.Bottom}
				id='out-0'
				style={outputHandleStyle(NODE_COLORS.source)}
			/>
			{outputLabel('out', NODE_COLORS.source)}
		</Box>
	);
});
