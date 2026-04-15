import { useCallback, useEffect, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import * as graph from '../audio/graph';
import { usePlayback } from '../contexts/WoahscopeContext';
import { ERROR_MESSAGES } from '../config';

interface TonePlayerProps {
	currentTrack: string;
}

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

export function TonePlayer({ currentTrack }: TonePlayerProps) {
	const rafRef         = useRef<number>(0);
	const isScrubbingRef = useRef<boolean>(false);
	const progressRef     = useRef(0);
	const durationRef     = useRef(0);
	const progressInputRef = useRef<HTMLInputElement>(null);
	const elapsedRef      = useRef<HTMLSpanElement>(null);
	const remainingRef    = useRef<HTMLSpanElement>(null);

	const { setIsPlaying: setVizPlaying } = usePlayback();

	const [isPlaying, setIsPlaying]   = useState(false);
	const [isMuted, setIsMuted]       = useState(false);
	const [isLoaded, setIsLoaded]     = useState(false);
	const [duration, setDuration]     = useState(0);
	const [audioError, setAudioError] = useState<string | null>(null);
	const [statusMessage, setStatusMessage] = useState('');

	/**
	 * Directly mutates DOM refs rather than calling setState — intentional.
	 * This function is called inside a requestAnimationFrame loop at ~60fps during
	 * playback. Using setState here would queue 60 React re-renders per second just
	 * to update the time display, which would thrash the scheduler. Direct DOM
	 * mutation is the correct pattern for high-frequency UI updates that don't
	 * need React's reconciliation.
	 */
	const syncProgressDOM = useCallback((pos: number) => {
		if (progressInputRef.current) progressInputRef.current.value = String(pos);
		if (elapsedRef.current) elapsedRef.current.textContent = formatTime(pos);
		if (remainingRef.current) {
			const d = durationRef.current;
			remainingRef.current.textContent = d > 0 ? `-${formatTime(d - pos)}` : '-0:00';
		}
	}, []);

	const mountedRef = useRef(true);
	useEffect(() => {
		mountedRef.current = true;
		graph.onPlaybackEnd(() => {
			if (!mountedRef.current) return;
			setIsPlaying(false);
			progressRef.current = 0;
			syncProgressDOM(0);
			setStatusMessage('Playback ended');
		});
		return () => {
			mountedRef.current = false;
			graph.clearPlaybackEndCallback();
		};
	}, [syncProgressDOM]);

	useEffect(() => {
		setVizPlaying(isPlaying);
	}, [isPlaying, setVizPlaying]);

	useEffect(() => {
		if (!isPlaying) {
			cancelAnimationFrame(rafRef.current);
			return;
		}
		const tick = () => {
			if (!isScrubbingRef.current) {
				const pos = graph.getPosition();
				progressRef.current = pos;
				syncProgressDOM(pos);
			}
			rafRef.current = requestAnimationFrame(tick);
		};
		rafRef.current = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafRef.current);
	}, [isPlaying, syncProgressDOM]);

	useEffect(() => {
		if (!currentTrack) return;
		setIsPlaying(false);
		setIsLoaded(false);
		durationRef.current = 0;
		progressRef.current = 0;
		syncProgressDOM(0);
		setDuration(0);
		setAudioError(null);
		setStatusMessage('Loading track…');

		let cancelled = false;
		graph.loadTrack(currentTrack)
			.then(() => {
				if (!cancelled) {
					const d = graph.getDuration();
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
	}, [currentTrack, syncProgressDOM]);

	const handlePlayPause = async () => {
		if (!isLoaded) return;
		if (isPlaying) {
			graph.pause();
			setIsPlaying(false);
			setStatusMessage('Paused');
		} else {
			await graph.play();
			setIsPlaying(true);
			setStatusMessage('Playing');
		}
	};

	const handleMute = () => {
		graph.setMuted(!isMuted);
		setIsMuted(v => !v);
	};

	const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		syncProgressDOM(Number(e.target.value));
	};

	const handleProgressPointerUp = (e: React.PointerEvent<HTMLInputElement>) => {
		const newPos = Number((e.target as HTMLInputElement).value);
		isScrubbingRef.current = false;
		graph.seek(newPos);
		syncProgressDOM(newPos);
	};

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
			<Box
				role='status'
				aria-live='polite'
				aria-atomic='true'
				sx={srOnlySx}
			>
				{statusMessage}
			</Box>

			{audioError && (
				<Alert severity='error' onClose={() => setAudioError(null)}>
					{audioError}
				</Alert>
			)}

			<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
				<IconButton
					aria-label={isPlaying ? 'Pause' : 'Play'}
					onClick={handlePlayPause}
					disabled={!isLoaded}
					size='small'
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
					sx={{ color: isMuted ? 'primary.main' : 'text.secondary', flexShrink: 0 }}
				>
					{isMuted ? <VolumeOffIcon fontSize='small' /> : <VolumeUpIcon fontSize='small' />}
				</IconButton>
			</Box>
		</Box>
	);
}