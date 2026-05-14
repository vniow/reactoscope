import { memo, useCallback, useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import {
	startGrainPlayer, stopGrainPlayer, loadTrackForGrainPlayer,
	setGrainPlayerGrainSize, setGrainPlayerOverlap,
	setGrainPlayerPlaybackRate, setGrainPlayerDetune, setGrainPlayerLoop,
	setGrainPlayerMuted, setGrainPlayerLoopStart, getGrainPlayerBufferDuration,
	useDawStore,
} from '../../store/daw';
import { NodeHeader } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { GRID_UNIT } from './gridSystem';
import { outputHandleStyle, outputLabel } from './handleStyles';
import { METAL_BG } from './metalBackground';
import { HwSliderField } from '../../components/HwSliderField';
import { AudioFileLoader } from '../../components/AudioFileLoader';
import { HwPlayerControls } from '../../components/HwPlayerControls';
import type { GrainPlayerFlowNode } from '../../store/dawTypes';

const color = NODE_COLORS.source;

export const GrainPlayerNode = memo(function GrainPlayerNode({
	id,
	data,
	selected,
}: NodeProps<GrainPlayerFlowNode>) {
	const updateNodeData = useDawStore(s => s.updateNodeData);

	const progressInputRef = useRef<HTMLInputElement>(null);
	const elapsedRef       = useRef<HTMLSpanElement>(null);
	const remainingRef     = useRef<HTMLSpanElement>(null);
	const durationRef      = useRef(0);

	const [isPlaying,    setIsPlaying]    = useState(false);
	const [isMuted,      setIsMuted]      = useState(false);
	const [isLooped,     setIsLooped]     = useState(data.loop         ?? true);
	const [isLoaded,     setIsLoaded]     = useState(false);
	const [duration,     setDuration]     = useState(0);
	const [grainSize,    setGrainSizeState]    = useState(data.grainSize    ?? 0.2);
	const [overlap,      setOverlapState]      = useState(data.overlap      ?? 0.1);
	const [playbackRate, setPlaybackRateState] = useState(data.playbackRate ?? 1);
	const [detune,       setDetuneState]       = useState(data.detune       ?? 0);

	const syncProgressDOM = useCallback((pos: number) => {
		if (progressInputRef.current) progressInputRef.current.value = String(pos);
		if (elapsedRef.current) {
			const m = Math.floor(pos / 60);
			elapsedRef.current.textContent = `${m}:${Math.floor(pos % 60).toString().padStart(2, '0')}`;
		}
		if (remainingRef.current) {
			const d = durationRef.current;
			const r = Math.max(0, d - pos);
			const m = Math.floor(r / 60);
			remainingRef.current.textContent = d > 0 ? `-${m}:${Math.floor(r % 60).toString().padStart(2, '0')}` : '-0:00';
		}
	}, []);

	const handleLoad = async (url: string) => {
		updateNodeData(id, { trackUrl: url });
		setIsLoaded(false);
		setDuration(0);
		durationRef.current = 0;
		syncProgressDOM(0);
		await loadTrackForGrainPlayer(id, url);
		const d = getGrainPlayerBufferDuration(id);
		durationRef.current = d;
		setDuration(d);
		setIsLoaded(true);
	};

	const handlePlayPause = async () => {
		if (!isLoaded) return;
		if (isPlaying) { stopGrainPlayer(id); setIsPlaying(false); }
		else           { await startGrainPlayer(id); setIsPlaying(true); }
	};

	const handleMute = () => {
		const next = !isMuted;
		setGrainPlayerMuted(id, next);
		setIsMuted(next);
	};

	const handleLoop = () => {
		const next = !isLooped;
		setGrainPlayerLoop(id, next);
		setIsLooped(next);
		updateNodeData(id, { loop: next });
	};

	return (
		<Box sx={{
			border: '1px solid', borderColor: color, borderRadius: 1,
			backgroundImage: METAL_BG, width: 2 * GRID_UNIT,
			position: 'relative', pb: 3,
		}}>
			<NodeHeader id={id} label='Grain Player' selected={selected} accentColor={color} />

			<Box sx={{ px: 1, py: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }}>

				<AudioFileLoader color={color} onLoad={handleLoad} />

				<HwPlayerControls
					color={color}
					isPlaying={isPlaying}
					isMuted={isMuted}
					isLooped={isLooped}
					isLoaded={isLoaded}
					playbackRate={playbackRate}
					duration={duration}
					progressInputRef={progressInputRef}
					elapsedRef={elapsedRef}
					remainingRef={remainingRef}
					onProgressPointerDown={() => {}}
					onProgressChange={(e) => syncProgressDOM(Number(e.target.value))}
					onProgressPointerUp={(e) => {
						const pos = Number((e.target as HTMLInputElement).value);
						setGrainPlayerLoopStart(id, pos);
					}}
					onPlayPause={handlePlayPause}
					onMute={handleMute}
					onLoop={handleLoop}
					onSpeedChange={(v) => { setPlaybackRateState(v); setGrainPlayerPlaybackRate(id, v); }}
					stopMode
				/>

				<Box className='nodrag nowheel'>
					<HwSliderField
						label='grain' value={grainSize} min={0.01} max={2} step={0.01}
						color={color} onChange={(v) => { setGrainSizeState(v); setGrainPlayerGrainSize(id, v); }}
						format={v => v.toFixed(2)} unit='s' allowValueEdit
					/>
				</Box>

				<Box className='nodrag nowheel'>
					<HwSliderField
						label='overlap' value={overlap} min={0} max={1} step={0.01}
						color={color} onChange={(v) => { setOverlapState(v); setGrainPlayerOverlap(id, v); }}
						format={v => v.toFixed(2)} allowValueEdit
					/>
				</Box>

				<Box className='nodrag nowheel'>
					<HwSliderField
						label='detune' value={detune} min={-1200} max={1200} step={1}
						color={color} onChange={(v) => { setDetuneState(v); setGrainPlayerDetune(id, v); }}
						format={v => String(v)} unit='ct' allowValueEdit
					/>
				</Box>

			</Box>

			<Handle type='source' position={Position.Bottom} id='out-0' style={outputHandleStyle(color)} />
			{outputLabel('out', color)}
		</Box>
	);
});
