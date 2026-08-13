import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import {
	startGrainPlayer, stopGrainPlayer, loadTrackForGrainPlayer,
	setGrainPlayerGrainSize, setGrainPlayerOverlap,
	setGrainPlayerPlaybackRate, setGrainPlayerDetune, setGrainPlayerLoop,
	setGrainPlayerMuted, setGrainPlayerLoopStart, setGrainPlayerLoopEnd,
	setGrainPlayerReverse, getGrainPlayerBufferDuration,
} from '../../../audio/engine';
import { useDawStore } from '../../../store/daw';
import { NodeHeader } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { bottomOutputHandleStyle, outputLabel } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import { HwLed } from '../shared/hwComponents';
import { HwSliderField } from '../../../components/hw/HwSliderField';
import { AudioFileLoader } from '../../../components/hw/AudioFileLoader';
import { HwPlayerControls } from '../../../components/hw/HwPlayerControls';
import type { GrainPlayerFlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.source;

export const GrainPlayerNode = memo(function GrainPlayerNode({
	id,
	data,
	selected,
}: NodeProps<GrainPlayerFlowNode>) {
	const updateNodeData = useDawStore(s => s.updateNodeData);

	const [isPlaying,    setIsPlaying]    = useState(false);
	const [isMuted,      setIsMuted]      = useState(false);
	const [isLooped,     setIsLooped]     = useState(data.loop         ?? true);
	const [isReversed,   setIsReversed]   = useState(data.reverse      ?? false);
	const [isLoaded,     setIsLoaded]     = useState(false);
	const [grainSize,    setGrainSizeState]    = useState(data.grainSize    ?? 0.2);
	const [overlap,      setOverlapState]      = useState(data.overlap      ?? 0.1);
	const [playbackRate, setPlaybackRateState] = useState(data.playbackRate ?? 1);
	const [detune,       setDetuneState]       = useState(data.detune       ?? 0);
	const [loopStart,    setLoopStartState]    = useState(data.loopStart    ?? 0);
	const [loopEnd,      setLoopEndState]      = useState(data.loopEnd      ?? 0);

	const handleLoad = async (url: string) => {
		updateNodeData(id, { trackUrl: url });
		await loadTrackForGrainPlayer(id, url);
		setIsLoaded(true);
		// Reset loop bounds now that we have a real buffer duration
		const dur = getGrainPlayerBufferDuration(id);
		if (loopEnd === 0 && dur > 0) {
			setLoopEndState(dur);
			setGrainPlayerLoopEnd(id, dur);
			updateNodeData(id, { loopEnd: dur });
		}
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

	const handleReverse = () => {
		const next = !isReversed;
		setGrainPlayerReverse(id, next);
		setIsReversed(next);
		updateNodeData(id, { reverse: next });
	};

	return (
		<Box sx={{
			borderRadius: 1,
			backgroundImage: METAL_BG, width: 2 * GRID_UNIT,
			position: 'relative', pb: 3,
			boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)',
		}}>
			<NodeHeader id={id} label='Grain Player' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }}>

				<AudioFileLoader color={color} onLoad={handleLoad} />

				<HwPlayerControls
					color={color}
					isPlaying={isPlaying}
					isMuted={isMuted}
					isLooped={isLooped}
					isLoaded={isLoaded}
					playbackRate={playbackRate}
					onPlayPause={handlePlayPause}
					onMute={handleMute}
					onLoop={handleLoop}
					onSpeedChange={(v) => { setPlaybackRateState(v); setGrainPlayerPlaybackRate(id, v); }}
					stopMode
				/>

				<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 0.5 }} className='nodrag'>
					<HwLed checked={isReversed} color={color} onClick={handleReverse} label='Reverse playback' role='switch' />
				</Box>

				<Box className='nodrag nowheel'>
					<HwSliderField
						label='grain' value={grainSize} min={0.01} max={2} step={0.01}
						color={color} onChange={(v) => { setGrainSizeState(v); setGrainPlayerGrainSize(id, v); }}
						format={v => v.toFixed(2)} unit='s' allowValueEdit allowBoundsEdit
					/>
				</Box>

				<Box className='nodrag nowheel'>
					<HwSliderField
						label='overlap' value={overlap} min={0} max={1} step={0.01}
						color={color} onChange={(v) => { setOverlapState(v); setGrainPlayerOverlap(id, v); }}
						format={v => v.toFixed(2)} allowValueEdit allowBoundsEdit
					/>
				</Box>

				<Box className='nodrag nowheel'>
					<HwSliderField
						label='detune' value={detune} min={-1200} max={1200} step={1}
						color={color} onChange={(v) => { setDetuneState(v); setGrainPlayerDetune(id, v); }}
						format={v => String(v)} unit='ct' allowValueEdit allowBoundsEdit
					/>
				</Box>

				<Box className='nodrag nowheel'>
					<HwSliderField
						label='loop start' value={loopStart} min={0} max={loopEnd > 0 ? loopEnd : 600} step={0.01}
						color={color} onChange={(v) => {
							setLoopStartState(v);
							setGrainPlayerLoopStart(id, v);
							updateNodeData(id, { loopStart: v });
						}}
						format={v => v.toFixed(2)} unit='s' allowValueEdit allowBoundsEdit
					/>
				</Box>

				<Box className='nodrag nowheel'>
					<HwSliderField
						label='loop end' value={loopEnd} min={loopStart} max={600} step={0.01}
						color={color} onChange={(v) => {
							setLoopEndState(v);
							setGrainPlayerLoopEnd(id, v);
							updateNodeData(id, { loopEnd: v });
						}}
						format={v => v.toFixed(2)} unit='s' allowValueEdit allowBoundsEdit
					/>
				</Box>

			</Box>

			<Handle type='source' position={Position.Bottom} id='out-0' style={{ ...bottomOutputHandleStyle(color), left: '33%' }} />
			{outputLabel('L', color, '33%')}
			<Handle type='source' position={Position.Bottom} id='out-1' style={{ ...bottomOutputHandleStyle(color), left: '67%' }} />
			{outputLabel('R', color, '67%')}
		</Box>
	);
});
