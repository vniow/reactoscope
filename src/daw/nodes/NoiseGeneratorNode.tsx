import { memo, useCallback, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import {
	startNoise,
	stopNoise,
	setNoiseType,
	setNoiseVolume,
	useDawStore,
} from '../../store/daw';
import type { NoiseFlowNode } from '../../store/dawTypes';

const NOISE_TYPES = ['white', 'pink', 'brown'] as const;
type NoiseType = typeof NOISE_TYPES[number];

export const NoiseGeneratorNode = memo(function NoiseGeneratorNode({
	id,
	data,
	selected,
}: NodeProps<NoiseFlowNode>) {
	const [isPlaying,  setIsPlaying]  = useState(false);
	const [noiseType,  setNoiseTypeState] = useState<NoiseType>(data.noiseType ?? 'white');
	const [volume,     setVolumeState]    = useState(data.volume ?? -6);

	const onNodesChange = useDawStore(s => s.onNodesChange);

	const handleDelete = useCallback(() => {
		onNodesChange([{ type: 'remove', id }]);
	}, [id, onNodesChange]);

	const handleToggle = async () => {
		if (isPlaying) {
			stopNoise(id);
			setIsPlaying(false);
		} else {
			await startNoise(id);
			setIsPlaying(true);
		}
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
		<Box
			sx={{
				p:           1.5,
				border:      '1px solid',
				borderColor: 'divider',
				borderRadius: 1,
				bgcolor:     'background.paper',
				minWidth:    200,
				position:    'relative',
			}}
		>
			{selected && (
				<IconButton
					size='small'
					onClick={handleDelete}
					aria-label='Delete node'
					className='nodrag'
					sx={{
						position:  'absolute',
						top:       4,
						right:     4,
						zIndex:    10,
						color:     'text.secondary',
						p:         0.25,
						'&:hover': { color: 'error.main' },
					}}
				>
					<CloseIcon sx={{ fontSize: 14 }} />
				</IconButton>
			)}

			<Typography
				variant='caption'
				color='text.secondary'
				sx={{ fontWeight: 600, letterSpacing: 0.5, mb: 1, display: 'block' }}
			>
				NOISE
			</Typography>

			{/* Noise type selector */}
			<Box className='nodrag' sx={{ mb: 1 }}>
				<Select
					value={noiseType}
					onChange={handleTypeChange}
					size='small'
					fullWidth
					sx={{ fontSize: 12 }}
				>
					{NOISE_TYPES.map(t => (
						<MenuItem key={t} value={t} sx={{ fontSize: 12 }}>
							{t}
						</MenuItem>
					))}
				</Select>
			</Box>

			{/* Volume slider (dB) */}
			<Box className='nodrag nowheel' sx={{ px: 0.5 }}>
				<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
					<Typography variant='caption' color='text.secondary'>volume</Typography>
					<Typography variant='caption' color='text.secondary'>{volume} dB</Typography>
				</Box>
				<Slider
					aria-label='Volume'
					min={-40}
					max={0}
					step={1}
					value={volume}
					onChange={handleVolumeChange}
					size='small'
					color='primary'
				/>
			</Box>

			{/* Start / Stop */}
			<Box sx={{ display: 'flex', justifyContent: 'center', mt: 0.5 }}>
				<IconButton
					onClick={handleToggle}
					className='nodrag'
					size='small'
					aria-label={isPlaying ? 'Stop noise' : 'Start noise'}
					sx={{ color: isPlaying ? 'primary.main' : 'text.secondary' }}
				>
					{isPlaying
						? <StopIcon fontSize='small' />
						: <PlayArrowIcon fontSize='small' />}
				</IconButton>
			</Box>

			<Handle
				type='source'
				position={Position.Bottom}
				id='out-0'
				style={{ background: '#22dd22', border: '2px solid #22dd22' }}
			/>
		</Box>
	);
});
