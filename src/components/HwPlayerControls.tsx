import type { RefObject } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RepeatIcon from '@mui/icons-material/Repeat';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { HwSliderField } from './HwSliderField';
import { hwIconBtn, hwIconBtnLit } from '../daw/nodes/hwStyles';

export interface HwPlayerControlsProps {
	color:       string;
	isPlaying:   boolean;
	isMuted:     boolean;
	isLooped:    boolean;
	isLoaded:    boolean;
	playbackRate: number;

	// If provided, a seek scrubber is rendered
	duration?:            number;
	progressInputRef?:    RefObject<HTMLInputElement | null>;
	elapsedRef?:          RefObject<HTMLSpanElement | null>;
	remainingRef?:        RefObject<HTMLSpanElement | null>;
	onProgressPointerDown?: () => void;
	onProgressChange?:    (e: React.ChangeEvent<HTMLInputElement>) => void;
	onProgressPointerUp?: (e: React.PointerEvent<HTMLInputElement>) => void;

	onPlayPause:   () => void;
	onMute:        () => void;
	onLoop:        () => void;
	onSpeedChange: (v: number) => void;

	// Whether the play button shows a Stop icon instead of Pause when playing
	stopMode?: boolean;
}

function formatTime(s: number): string {
	const m = Math.floor(s / 60);
	return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
}

export function HwPlayerControls({
	color, isPlaying, isMuted, isLooped, isLoaded, playbackRate,
	duration, progressInputRef, elapsedRef, remainingRef,
	onProgressPointerDown, onProgressChange, onProgressPointerUp,
	onPlayPause, onMute, onLoop, onSpeedChange,
	stopMode = false,
}: HwPlayerControlsProps) {
	const iconBtn    = hwIconBtn(color);
	const iconBtnLit = hwIconBtnLit(color);

	const PlayIcon = isPlaying ? (stopMode ? StopIcon : PauseIcon) : PlayArrowIcon;

	const hasScrubber = duration !== undefined && progressInputRef && elapsedRef && remainingRef;

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>

			{/* Transport row */}
			<Box sx={{ display: 'flex', alignItems: 'center', gap: '2px' }} className='nodrag'>

				{/* Play/Pause or Play/Stop */}
				<IconButton
					size='small'
					onClick={onPlayPause}
					disabled={!isLoaded}
					aria-label={isPlaying ? (stopMode ? 'Stop' : 'Pause') : 'Play'}
					sx={{ ...(isPlaying ? iconBtnLit : iconBtn), flexShrink: 0 }}
				>
					<PlayIcon sx={{ fontSize: 14 }} />
				</IconButton>

				{/* Scrubber (when duration is available) */}
				{hasScrubber ? (
					<Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
						<input
							ref={progressInputRef}
							type='range'
							aria-label='Playback position'
							min={0}
							max={duration || 1}
							step={0.1}
							defaultValue={0}
							disabled={!isLoaded}
							onPointerDown={onProgressPointerDown}
							onChange={onProgressChange}
							onPointerUp={onProgressPointerUp}
							className='nodrag nowheel'
							style={{ width: '100%', accentColor: color, margin: 0, cursor: isLoaded ? 'pointer' : 'default' }}
						/>
						<Box sx={{ display: 'flex', justifyContent: 'space-between', px: 0.25 }}>
							<Typography variant='caption' sx={{ fontSize: 8, color: 'text.disabled', lineHeight: 1 }}>
								<span ref={elapsedRef}>0:00</span>
							</Typography>
							<Typography variant='caption' sx={{ fontSize: 8, color: 'text.disabled', lineHeight: 1 }}>
								<span ref={remainingRef}>{duration ? `-${formatTime(duration)}` : '-0:00'}</span>
							</Typography>
						</Box>
					</Box>
				) : (
					<Box sx={{ flex: 1 }} />
				)}

				{/* Loop */}
				<IconButton
					size='small'
					onClick={onLoop}
					aria-label={isLooped ? 'Disable loop' : 'Enable loop'}
					sx={{ ...(isLooped ? iconBtnLit : iconBtn), flexShrink: 0 }}
				>
					<RepeatIcon sx={{ fontSize: 14 }} />
				</IconButton>

				{/* Mute */}
				<IconButton
					size='small'
					onClick={onMute}
					disabled={!isLoaded}
					aria-label={isMuted ? 'Unmute' : 'Mute'}
					sx={{ ...(isMuted ? iconBtnLit : iconBtn), flexShrink: 0 }}
				>
					{isMuted
						? <VolumeOffIcon sx={{ fontSize: 14 }} />
						: <VolumeUpIcon  sx={{ fontSize: 14 }} />}
				</IconButton>
			</Box>

			{/* Speed */}
			<Box className='nodrag nowheel'>
				<HwSliderField
					label='speed'
					value={playbackRate}
					min={0.1} max={4} step={0.01}
					color={color}
					onChange={onSpeedChange}
					format={v => v.toFixed(2)}
					unit='×'
					allowValueEdit
					allowBoundsEdit
				/>
			</Box>
		</Box>
	);
}
