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
	startOscillator,
	stopOscillator,
	setOscillatorFrequency,
	setOscillatorType,
	useDawStore,
} from '../../store/daw';
import type { OscillatorFlowNode } from '../../store/dawTypes';

const OSC_TYPES = ['sine', 'square', 'triangle', 'sawtooth'] as const;
type OscType = typeof OSC_TYPES[number];

export const OscillatorNode = memo(function OscillatorNode({
	id,
	data,
	selected,
}: NodeProps<OscillatorFlowNode>) {
	const [isPlaying,  setIsPlaying]  = useState(false);
	const [frequency,  setFreqState]  = useState(data.frequency ?? 440);
	const [oscType,    setOscType]    = useState<OscType>(data.type ?? 'sine');

	const onNodesChange = useDawStore(s => s.onNodesChange);

	const handleDelete = useCallback(() => {
		onNodesChange([{ type: 'remove', id }]);
	}, [id, onNodesChange]);

	const handleToggle = async () => {
		if (isPlaying) {
			stopOscillator(id);
			setIsPlaying(false);
		} else {
			await startOscillator(id);
			setIsPlaying(true);
		}
	};

	const handleFreqChange = (_: Event, value: number | number[]) => {
		const freq = value as number;
		setFreqState(freq);
		setOscillatorFrequency(id, freq);
	};

	const handleTypeChange = (e: SelectChangeEvent) => {
		const t = e.target.value as OscType;
		setOscType(t);
		setOscillatorType(id, t);
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
				OSCILLATOR
			</Typography>

			{/* Waveform type selector */}
			<Box className='nodrag' sx={{ mb: 1 }}>
				<Select
					value={oscType}
					onChange={handleTypeChange}
					size='small'
					fullWidth
					sx={{ fontSize: 12 }}
				>
					{OSC_TYPES.map(t => (
						<MenuItem key={t} value={t} sx={{ fontSize: 12 }}>
							{t}
						</MenuItem>
					))}
				</Select>
			</Box>

			{/* Frequency slider */}
			<Box className='nodrag nowheel' sx={{ px: 0.5 }}>
				<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
					<Typography variant='caption' color='text.secondary'>freq</Typography>
					<Typography variant='caption' color='text.secondary'>{frequency} Hz</Typography>
				</Box>
				<Slider
					aria-label='Frequency'
					min={20}
					max={4000}
					step={1}
					value={frequency}
					onChange={handleFreqChange}
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
					aria-label={isPlaying ? 'Stop oscillator' : 'Start oscillator'}
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
