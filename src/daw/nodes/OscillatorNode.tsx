import { memo, useCallback, useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import MenuItem from '@mui/material/MenuItem';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import Slider from '@mui/material/Slider';
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
import type { OscillatorFlowNode } from '../../store/dawTypes';

const OSC_TYPES = ['sine', 'square', 'triangle', 'sawtooth'] as const;
type OscType = typeof OSC_TYPES[number];

export const OscillatorNode = memo(function OscillatorNode({
	id,
	data,
	selected,
}: NodeProps<OscillatorFlowNode>) {
	const [isPlaying,   setIsPlaying]   = useState(false);
	const [frequency,   setFreqState]   = useState(data.frequency ?? 440);
	const [oscType,     setOscType]     = useState<OscType>(data.type ?? 'sine');
	const [editingFreq, setEditingFreq] = useState(false);
	const [freqInput,   setFreqInput]   = useState('');
	const freqInputRef = useRef<HTMLInputElement>(null);

	const handleToggle = async () => {
		if (isPlaying) { stopOscillator(id); setIsPlaying(false); }
		else           { await startOscillator(id); setIsPlaying(true); }
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

	const commitFreqInput = useCallback(() => {
		const parsed = parseFloat(freqInput);
		if (!isNaN(parsed)) {
			const clamped = Math.min(4000, Math.max(20, parsed));
			setFreqState(clamped);
			setOscillatorFrequency(id, clamped);
		}
		setEditingFreq(false);
	}, [freqInput, id]);

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
			<NodeHeader id={id} label='Oscillator' selected={selected} accentColor={NODE_COLORS.source} />

			<Box sx={{ px: 1.5, py: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
				<Box className='nodrag'>
					<Select
						value={oscType}
						onChange={handleTypeChange}
						size='small'
						fullWidth
						sx={{ fontSize: 12 }}
					>
						{OSC_TYPES.map(t => (
							<MenuItem key={t} value={t} sx={{ fontSize: 12 }}>{t}</MenuItem>
						))}
					</Select>
				</Box>

				<Box className='nodrag nowheel'>
					<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.25 }}>
						<Typography variant='caption' color='text.secondary'>freq</Typography>
						{editingFreq ? (
							<InputBase
								inputRef={freqInputRef}
								value={freqInput}
								onChange={e => setFreqInput(e.target.value)}
								onBlur={commitFreqInput}
								onKeyDown={e => {
									if (e.key === 'Enter') commitFreqInput();
									if (e.key === 'Escape') setEditingFreq(false);
								}}
								sx={{
									fontSize: 12, color: 'text.secondary', width: 72,
									'.MuiInputBase-input': { p: 0, textAlign: 'right' },
								}}
							/>
						) : (
							<Typography
								variant='caption'
								color='text.secondary'
								sx={{ cursor: 'text', userSelect: 'none' }}
								onClick={() => {
									setFreqInput(String(frequency));
									setEditingFreq(true);
									setTimeout(() => freqInputRef.current?.select(), 0);
								}}
							>
								{frequency} Hz
							</Typography>
						)}
					</Box>
					<Slider
						aria-label='Frequency'
						min={20} max={4000} step={1}
						value={frequency}
						onChange={handleFreqChange}
						size='small'
						color='primary'
					/>
				</Box>

				<Box sx={{ display: 'flex', justifyContent: 'center' }}>
					<IconButton
						onClick={handleToggle}
						className='nodrag'
						size='small'
						aria-label={isPlaying ? 'Stop oscillator' : 'Start oscillator'}
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
