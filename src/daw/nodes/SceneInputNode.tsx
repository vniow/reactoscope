import { memo, useState, useCallback, useRef } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { startSceneInput, stopSceneInput, getSceneInputWorkletNode } from '../../store/daw';
import {
	SAMPLE_RATE_OPTIONS,
	getStoredSampleRate,
	setStoredSampleRate,
	type SampleRate,
} from '../../scene/audioSetup';
import type { SceneInputFlowNode } from '../../store/dawTypes';

const HANDLES = [
	{ id: 'out-0', label: 'X', pct: '10%'  },
	{ id: 'out-1', label: 'Y', pct: '26%'  },
	{ id: 'out-2', label: 'R', pct: '46%'  },
	{ id: 'out-3', label: 'G', pct: '62%'  },
	{ id: 'out-4', label: 'B', pct: '78%'  },
	{ id: 'out-5', label: 'A', pct: '94%'  },
] as const;

const DEFAULT_SCAN_FREQ = 50;
const SCAN_FREQ_MIN     = 1;
const SCAN_FREQ_MAX     = 2000;

export const SceneInputNode = memo(function SceneInputNode({
	data,
}: NodeProps<SceneInputFlowNode>) {
	const [isRunning,      setIsRunning]      = useState(false);
	const [sampleRate,     setSampleRate]     = useState<SampleRate>(getStoredSampleRate);
	const [needsReload,    setNeedsReload]    = useState(false);
	const [scanFreq,       setScanFreq]       = useState<number>(data.scanFrequency ?? DEFAULT_SCAN_FREQ);
	const [editingScan,    setEditingScan]    = useState(false);
	const [scanFreqInput,  setScanFreqInput]  = useState('');
	const scanInputRef = useRef<HTMLInputElement>(null);

	const handlePlay = useCallback(async () => {
		await startSceneInput();
		setIsRunning(true);
	}, []);

	const handleStop = useCallback(() => {
		stopSceneInput();
		setIsRunning(false);
	}, []);

	const handleSampleRate = useCallback((rate: SampleRate) => {
		setStoredSampleRate(rate);
		setSampleRate(rate);
		setNeedsReload(true);
	}, []);

	const handleScanFreq = useCallback((value: number) => {
		setScanFreq(value);
		const node = getSceneInputWorkletNode();
		if (node) {
			node.port.postMessage({ type: 'scanFreq', value });
		}
	}, []);

	const commitScanFreqInput = useCallback(() => {
		const parsed = parseInt(scanFreqInput, 10);
		if (!isNaN(parsed)) {
			const clamped = Math.min(SCAN_FREQ_MAX, Math.max(SCAN_FREQ_MIN, parsed));
			handleScanFreq(clamped);
		}
		setEditingScan(false);
	}, [scanFreqInput, handleScanFreq]);

	return (
		<Box
			sx={{
				p:           1.5,
				border:      '1px solid',
				borderColor: 'divider',
				borderRadius: 1,
				bgcolor:     'background.paper',
				minWidth:    240,
				position:    'relative',
				pb:          3,
			}}
		>
			<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
				<Typography
					variant='caption'
					color='text.secondary'
					sx={{ fontWeight: 600, letterSpacing: 0.5 }}
				>
					{data.label.toUpperCase()}
				</Typography>

				<IconButton
					size='small'
					className='nodrag'
					onClick={isRunning ? handleStop : handlePlay}
					aria-label={isRunning ? 'Stop audio context' : 'Start audio context'}
					sx={{
						p:      0.25,
						color:  isRunning ? '#22dd22' : 'text.disabled',
						'&:hover': { color: isRunning ? 'error.main' : '#22dd22' },
					}}
				>
					{isRunning
						? <StopIcon sx={{ fontSize: 16 }} />
						: <PlayArrowIcon sx={{ fontSize: 16 }} />
					}
				</IconButton>
			</Box>

			<Typography
				variant='caption'
				color='text.disabled'
				sx={{ fontSize: 9, display: 'block', mt: 0.5, mb: 1 }}
			>
				Scene geometry → audio
			</Typography>

			{/* Sample rate selector */}
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }} className='nodrag'>
				<Typography variant='caption' color='text.disabled' sx={{ fontSize: 9, flexShrink: 0 }}>
					RATE
				</Typography>
				<Select
					size='small'
					value={sampleRate}
					onChange={e => handleSampleRate(Number(e.target.value) as SampleRate)}
					sx={{ fontSize: 10, height: 20, flex: 1, '.MuiSelect-select': { py: '2px', px: '6px' } }}
				>
					{SAMPLE_RATE_OPTIONS.map(r => (
						<MenuItem key={r} value={r} sx={{ fontSize: 11 }}>
							{r >= 1000 ? `${r / 1000} kHz` : `${r} Hz`}
						</MenuItem>
					))}
				</Select>
			</Box>

			{/* Scan frequency slider */}
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }} className='nodrag'>
				<Typography variant='caption' color='text.disabled' sx={{ fontSize: 9, flexShrink: 0 }}>
					SCAN
				</Typography>
				<Slider
					size='small'
					min={SCAN_FREQ_MIN}
					max={SCAN_FREQ_MAX}
					step={1}
					value={scanFreq}
					onChange={(_, v) => handleScanFreq(v as number)}
					sx={{ flex: 1, color: '#22dd22', py: '6px' }}
				/>
				{editingScan ? (
					<InputBase
						inputRef={scanInputRef}
						value={scanFreqInput}
						onChange={e => setScanFreqInput(e.target.value)}
						onBlur={commitScanFreqInput}
						onKeyDown={e => {
							if (e.key === 'Enter') commitScanFreqInput();
							if (e.key === 'Escape') setEditingScan(false);
						}}
						sx={{
							fontSize: 9,
							color: 'text.disabled',
							width: 48,
							'.MuiInputBase-input': { p: 0, textAlign: 'right' },
						}}
					/>
				) : (
					<Typography
						variant='caption'
						color='text.disabled'
						sx={{ fontSize: 9, flexShrink: 0, minWidth: 32, cursor: 'text', userSelect: 'none' }}
						onClick={() => { setScanFreqInput(String(scanFreq)); setEditingScan(true); setTimeout(() => scanInputRef.current?.select(), 0); }}
					>
						{scanFreq} Hz
					</Typography>
				)}
			</Box>

			{needsReload && (
				<Typography
					variant='caption'
					sx={{
						fontSize:  9,
						color:     '#dd8822',
						display:   'block',
						mt:        0.5,
						cursor:    'pointer',
						'&:hover': { color: '#ffaa44' },
					}}
					className='nodrag'
					onClick={() => window.location.reload()}
				>
					↻ reload to apply
				</Typography>
			)}

			{/* Handle labels */}
			<Box sx={{ position: 'absolute', bottom: 14, left: 0, width: '100%' }}>
				{HANDLES.map(h => (
					<Typography
						key={h.id}
						variant='caption'
						color='text.disabled'
						sx={{
							position:   'absolute',
							left:       h.pct,
							transform:  'translateX(-50%)',
							fontSize:   9,
							lineHeight: 1,
						}}
					>
						{h.label}
					</Typography>
				))}
			</Box>

			{/* Source handles (beam outputs) */}
			{HANDLES.map(h => (
				<Handle
					key={h.id}
					type='source'
					position={Position.Bottom}
					id={h.id}
					style={{
						left:       h.pct,
						background: '#22dd22',
						border:     '2px solid #22dd22',
					}}
				/>
			))}
		</Box>
	);
});
