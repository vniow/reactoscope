import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import {
	playNode, pauseNode, seekNode, loadTrackForNode,
	setNodeRate, setNodeMuted, setNodeLoop,
	getNodePosition, getNodeDuration,
	onNodePlaybackEnd, clearNodePlaybackEndCallback,
} from '../../../audio/engine';
import { useDawStore } from '../../../store/daw';
import { NodeHeader } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { bottomOutputHandleStyle, outputLabel } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import { AudioFileLoader } from '../../../components/hw/AudioFileLoader';
import { HwPlayerControls } from '../../../components/hw/HwPlayerControls';
import { usePlayback } from '../../../contexts/WoahscopeContext';
import type { PlayerFlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.source;

const srOnlySx = {
	position: 'absolute', width: 1, height: 1,
	clip: 'rect(0 0 0 0)', clipPath: 'inset(50%)', whiteSpace: 'nowrap',
} as const;

export const PlayerNode = memo(function PlayerNode({ id, data, selected }: NodeProps<PlayerFlowNode>) {
	const rafRef           = useRef<number>(0);
	const isScrubbingRef   = useRef<boolean>(false);
	const durationRef      = useRef(0);
	const progressInputRef = useRef<HTMLInputElement>(null);
	const elapsedRef       = useRef<HTMLSpanElement>(null);
	const remainingRef     = useRef<HTMLSpanElement>(null);
	const mountedRef       = useRef(true);

	const { setIsPlaying: setVizPlaying } = usePlayback();
	const updateNodeData = useDawStore(s => s.updateNodeData);

	const [isPlaying,    setIsPlaying]    = useState(false);
	const [isMuted,      setIsMuted]      = useState(false);
	const [isLooped,     setIsLooped]     = useState(false);
	const [isLoaded,     setIsLoaded]     = useState(false);
	const [duration,     setDuration]     = useState(0);
	const [playbackRate, setPlaybackRate] = useState(1);
	const [statusMsg,    setStatusMsg]    = useState('');

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

	useEffect(() => {
		mountedRef.current = true;
		onNodePlaybackEnd(id, () => {
			if (!mountedRef.current) return;
			setIsPlaying(false);
			syncProgressDOM(0);
			setStatusMsg('Playback ended');
		});
		return () => { mountedRef.current = false; clearNodePlaybackEndCallback(id); };
	}, [id, syncProgressDOM]);

	useEffect(() => { setVizPlaying(isPlaying); }, [isPlaying, setVizPlaying]);

	useEffect(() => {
		if (!isPlaying) { cancelAnimationFrame(rafRef.current); return; }
		const tick = () => {
			if (!isScrubbingRef.current) syncProgressDOM(getNodePosition(id));
			rafRef.current = requestAnimationFrame(tick);
		};
		rafRef.current = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafRef.current);
	}, [id, isPlaying, syncProgressDOM]);

	useEffect(() => {
		if (!data.trackUrl) return;
		setIsPlaying(false);
		setIsLoaded(false);
		durationRef.current = 0;
		syncProgressDOM(0);
		setDuration(0);
		setStatusMsg('Loading…');
		let cancelled = false;
		loadTrackForNode(id, data.trackUrl)
			.then(() => {
				if (!cancelled) {
					const d = getNodeDuration(id);
					durationRef.current = d;
					setDuration(d);
					setIsLoaded(true);
					setStatusMsg('Ready');
				}
			})
			.catch((err: unknown) => {
				if (!cancelled) setStatusMsg(`Error: ${err instanceof Error ? err.message : 'Load failed'}`);
			});
		return () => { cancelled = true; };
	}, [id, data.trackUrl, syncProgressDOM]);

	const handleLoad = (url: string) => updateNodeData(id, { trackUrl: url });

	const handlePlayPause = async () => {
		if (!isLoaded) return;
		if (isPlaying) { pauseNode(id); setIsPlaying(false); }
		else { await playNode(id); setIsPlaying(true); }
	};

	const handleMute = () => {
		const next = !isMuted;
		setNodeMuted(id, next);
		setIsMuted(next);
	};

	const handleLoop = () => {
		const next = !isLooped;
		setNodeLoop(id, next);
		setIsLooped(next);
	};

	return (
		<Box sx={{
			borderRadius: 1,
			backgroundImage: METAL_BG, width: 3 * GRID_UNIT,
			position: 'relative', pb: 3,
			boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)',
		}}>
			<NodeHeader id={id} label='Player' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }}>

				<Box role='status' aria-live='polite' aria-atomic='true' sx={srOnlySx}>{statusMsg}</Box>

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
					onProgressPointerDown={() => { isScrubbingRef.current = true; }}
					onProgressChange={(e) => syncProgressDOM(Number(e.target.value))}
					onProgressPointerUp={(e) => {
						const pos = Number((e.target as HTMLInputElement).value);
						isScrubbingRef.current = false;
						seekNode(id, pos);
					}}
					onPlayPause={handlePlayPause}
					onMute={handleMute}
					onLoop={handleLoop}
					onSpeedChange={(v) => { setNodeRate(id, v); setPlaybackRate(v); }}
				/>

			</Box>

			<Handle type='source' position={Position.Bottom} id='out-0' style={{ ...bottomOutputHandleStyle(color), left: '33%' }} />
			{outputLabel('L', color, '33%')}
			<Handle type='source' position={Position.Bottom} id='out-1' style={{ ...bottomOutputHandleStyle(color), left: '67%' }} />
			{outputLabel('R', color, '67%')}
		</Box>
	);
});
