import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import {
	playNode,
	pauseNode,
	seekNode,
	loadTrackForNode,
	setNodeRate,
	setNodeMuted,
	getNodePosition,
	getNodeDuration,
	onNodePlaybackEnd,
	clearNodePlaybackEndCallback,
	useDawStore,
} from '../../store/daw';
import { TrackSelector } from '../../components/TrackSelector';
import { usePlayback } from '../../contexts/WoahscopeContext';
import { BUILT_IN_TRACKS, ERROR_MESSAGES } from '../../config';
import type { PlayerFlowNode } from '../../store/dawTypes';

// visually hidden but readable by screen readers
const srOnlySx = {
	position: 'absolute',
	width: 1,
	height: 1,
	overflow: 'hidden',
	clip: 'rect(0 0 0 0)',
	clipPath: 'inset(50%)',
	whiteSpace: 'nowrap',
} as const;

function formatTime(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, '0')}`;
}

const speedMarks = [
	{ value: 0.5, label: '0.5×' },
	{ value: 1,   label: '1×'   },
	{ value: 1.5, label: '1.5×' },
	{ value: 2,   label: '2×'   },
];

export const PlayerNode = memo(function PlayerNode({ id, data }: NodeProps<PlayerFlowNode>) {
	const rafRef          = useRef<number>(0);
	const isScrubbingRef  = useRef<boolean>(false);
	const durationRef     = useRef(0);
	const progressInputRef = useRef<HTMLInputElement>(null);
	const elapsedRef      = useRef<HTMLSpanElement>(null);
	const remainingRef    = useRef<HTMLSpanElement>(null);
	const mountedRef      = useRef(true);

	const { setIsPlaying: setVizPlaying } = usePlayback();
	const updateNodeData = useDawStore(s => s.updateNodeData);

	const [isPlaying, setIsPlaying]   = useState(false);
	const [isMuted, setIsMuted]       = useState(false);
	const [isLoaded, setIsLoaded]     = useState(false);
	const [duration, setDuration]     = useState(0);
	const [audioError, setAudioError] = useState<string | null>(null);
	const [statusMessage, setStatusMessage] = useState('');
	const [playbackRate, setPlaybackRate]   = useState(1);

	/**
	 * Directly mutates DOM refs at ~60fps during playback.
	 * Same pattern as TonePlayer — avoids React re-renders for time display.
	 */
	const syncProgressDOM = useCallback((pos: number) => {
		if (progressInputRef.current) progressInputRef.current.value = String(pos);
		if (elapsedRef.current) elapsedRef.current.textContent = formatTime(pos);
		if (remainingRef.current) {
			const d = durationRef.current;
			remainingRef.current.textContent = d > 0 ? `-${formatTime(d - pos)}` : '-0:00';
		}
	}, []);

	useEffect(() => {
		mountedRef.current = true;
		onNodePlaybackEnd(id, () => {
			if (!mountedRef.current) return;
			setIsPlaying(false);
			syncProgressDOM(0);
			setStatusMessage('Playback ended');
		});
		return () => {
			mountedRef.current = false;
			clearNodePlaybackEndCallback(id);
		};
	}, [id, syncProgressDOM]);

	// Keep the oscilloscope render loop in sync with this node's playback state
	useEffect(() => {
		setVizPlaying(isPlaying);
	}, [isPlaying, setVizPlaying]);

	// RAF-based scrubber update during playback
	useEffect(() => {
		if (!isPlaying) {
			cancelAnimationFrame(rafRef.current);
			return;
		}
		const tick = () => {
			if (!isScrubbingRef.current) {
				const pos = getNodePosition(id);
				syncProgressDOM(pos);
			}
			rafRef.current = requestAnimationFrame(tick);
		};
		rafRef.current = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafRef.current);
	}, [id, isPlaying, syncProgressDOM]);

	// Load track when data.trackUrl changes
	useEffect(() => {
		if (!data.trackUrl) return;
		setIsPlaying(false);
		setIsLoaded(false);
		durationRef.current = 0;
		syncProgressDOM(0);
		setDuration(0);
		setAudioError(null);
		setStatusMessage('Loading track…');

		let cancelled = false;
		loadTrackForNode(id, data.trackUrl)
			.then(() => {
				if (!cancelled) {
					const d = getNodeDuration(id);
					durationRef.current = d;
					setDuration(d);
					setIsLoaded(true);
					setStatusMessage('Track ready');
				}
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					const msg = err instanceof Error ? err.message : ERROR_MESSAGES.unknownError;
					setAudioError(msg);
					setStatusMessage(`Error: ${msg}`);
				}
			});
		return () => { cancelled = true; };
	}, [id, data.trackUrl, syncProgressDOM]);

	const handlePlayPause = async () => {
		if (!isLoaded) return;
		if (isPlaying) {
			pauseNode(id);
			setIsPlaying(false);
			setStatusMessage('Paused');
		} else {
			await playNode(id);
			setIsPlaying(true);
			setStatusMessage('Playing');
		}
	};

	const handleMute = () => {
		setNodeMuted(id, !isMuted);
		setIsMuted(v => !v);
	};

	const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		syncProgressDOM(Number(e.target.value));
	};

	const handleProgressPointerUp = (e: React.PointerEvent<HTMLInputElement>) => {
		const newPos = Number((e.target as HTMLInputElement).value);
		isScrubbingRef.current = false;
		seekNode(id, newPos);
		syncProgressDOM(newPos);
	};

	const handleSpeedChange = (_: Event, value: number | number[]) => {
		const rate = value as number;
		setNodeRate(id, rate);
		setPlaybackRate(rate);
	};

	const handleTrackChange = (file: string) => {
		updateNodeData(id, { trackUrl: file });
	};

	const credit = BUILT_IN_TRACKS.find(t => t.file === data.trackUrl)?.credit;

	return (
		<Box
			sx={{
				p: 1.5,
				border: '1px solid',
				borderColor: 'divider',
				borderRadius: 1,
				bgcolor: 'background.paper',
				minWidth: 260,
				display: 'flex',
				flexDirection: 'column',
				gap: 1,
			}}
		>
			{/* Screen-reader status */}
			<Box role='status' aria-live='polite' aria-atomic='true' sx={srOnlySx}>
				{statusMessage}
			</Box>

			{audioError && (
				<Alert
					severity='error'
					onClose={() => setAudioError(null)}
					className='nodrag'
					sx={{ py: 0 }}
				>
					{audioError}
				</Alert>
			)}

			{/* Track selector */}
			<Box className='nodrag'>
				<TrackSelector
					tracks={BUILT_IN_TRACKS as unknown as { label: string; file: string }[]}
					currentTrack={data.trackUrl}
					onTrackChange={handleTrackChange}
				/>
				{credit && (
					<Typography variant='caption' color='text.secondary' sx={{ pl: 0.5, display: 'block', mt: 0.5 }}>
						"{credit.title}" by {credit.artist}
					</Typography>
				)}
			</Box>

			{/* Transport controls + scrubber */}
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
				<IconButton
					aria-label={isPlaying ? 'Pause' : 'Play'}
					onClick={handlePlayPause}
					disabled={!isLoaded}
					size='small'
					className='nodrag'
					sx={{ color: isPlaying ? 'primary.main' : 'text.secondary', flexShrink: 0 }}
				>
					{isPlaying ? <PauseIcon fontSize='small' /> : <PlayArrowIcon fontSize='small' />}
				</IconButton>

				<Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0, minWidth: 0 }}>
					<input
						ref={progressInputRef}
						type='range'
						aria-label='Playback position'
						min={0}
						max={duration || 1}
						step={0.1}
						defaultValue={0}
						disabled={!isLoaded}
						onPointerDown={() => { isScrubbingRef.current = true; }}
						onChange={handleProgressChange}
						onPointerUp={handleProgressPointerUp}
						className='nodrag nowheel'
						style={{
							width: '100%',
							accentColor: '#22dd22',
							cursor: isLoaded ? 'pointer' : 'default',
							margin: 0,
						}}
					/>
					<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
						<Typography variant='caption' color='text.secondary'>
							<span ref={elapsedRef}>0:00</span>
						</Typography>
						<Typography variant='caption' color='text.secondary'>
							<span ref={remainingRef}>-0:00</span>
						</Typography>
					</Box>
				</Box>

				<IconButton
					aria-label={isMuted ? 'Unmute' : 'Mute'}
					onClick={handleMute}
					disabled={!isLoaded}
					size='small'
					className='nodrag'
					sx={{ color: isMuted ? 'primary.main' : 'text.secondary', flexShrink: 0 }}
				>
					{isMuted ? <VolumeOffIcon fontSize='small' /> : <VolumeUpIcon fontSize='small' />}
				</IconButton>
			</Box>

			{/* Speed control */}
			<Box sx={{ px: 1, pb: 0.5 }} className='nodrag nowheel'>
				<Typography variant='caption' color='text.secondary'>
					speed
				</Typography>
				<Slider
					aria-label='Playback speed'
					min={0.001}
					max={2}
					step={0.01}
					value={playbackRate}
					onChange={handleSpeedChange}
					marks={speedMarks}
					valueLabelDisplay='auto'
					size='small'
					color='primary'
					sx={{ mt: 0.5 }}
				/>
			</Box>

			{/* Audio output handle */}
			<Handle
				type='source'
				position={Position.Bottom}
				id='audio-out'
				style={{ background: '#22dd22', border: '2px solid #22dd22' }}
			/>
		</Box>
	);
});
