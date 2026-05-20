import { memo, Fragment, useCallback, useEffect, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { useDawStore, loadIldaForNode, startIldaPlayback, stopIldaPlayback, getIldaFrameInfo } from '../../store/daw';
import { AudioFileLoader } from '../../components/AudioFileLoader';
import { NodeHeader, NODE_HEADER_HEIGHT } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { GRID_UNIT } from './gridSystem';
import { outputHandleStyle, rightLabel, outputLabel } from './handleStyles';
import { METAL_BG } from './metalBackground';
import { hwIconBtn, hwIconBtnLit, hwToggleSx, hwSliderSx } from './hwStyles';
import type { IldaFrameFlowNode } from '../../store/dawTypes';

const color = NODE_COLORS.scene;

// Match SceneInputNode's handle layout so muscle memory carries over.
const RIGHT_HANDLES = [
	{ id: 'out-0', label: 'X' },
	{ id: 'out-1', label: 'Y' },
	{ id: 'out-5', label: 'A' },
] as const;

const BOTTOM_HANDLES = [
	{ id: 'out-2', label: 'R', pct: '25%' },
	{ id: 'out-3', label: 'G', pct: '50%' },
	{ id: 'out-4', label: 'B', pct: '75%' },
] as const;

function getHandleTop(index: number, total: number): string {
	const fraction = (index + 1) / (total + 1);
	return `calc(${NODE_HEADER_HEIGHT}px + ${fraction} * (100% - ${NODE_HEADER_HEIGHT}px))`;
}

export const IldaFrameNode = memo(function IldaFrameNode({ id, data, selected }: NodeProps<IldaFrameFlowNode>) {
	const updateNodeData = useDawStore(s => s.updateNodeData);
	const [info,    setInfo]    = useState<{ nFrames: number; nPoints: number } | null>(null);
	const [status,  setStatus]  = useState<string>('');
	const [loading, setLoading] = useState(false);

	// (Re)load the ILDA file whenever the URL in node data changes. On patch
	// reload the URL is a stale blob — fetch will fail and the node falls back
	// to its empty state until the user re-uploads.
	useEffect(() => {
		if (!data.ildUrl) { setInfo(null); return; }
		let cancelled = false;
		setLoading(true);
		setStatus('decoding…');
		loadIldaForNode(id, data.ildUrl)
			.then((res) => {
				if (cancelled) return;
				setInfo(res);
				setStatus(`${res.nFrames} frame${res.nFrames === 1 ? '' : 's'} · ${res.nPoints} pts`);
				// Auto-pick mode based on frame count if the node is fresh.
				if (res.nFrames > 1 && data.mode === 'static') {
					updateNodeData(id, { mode: 'animated' });
				}
				if (data.isPlaying) startIldaPlayback(id, data.mode, data.fps);
			})
			.catch((err: unknown) => {
				if (cancelled) return;
				setInfo(null);
				setStatus(err instanceof Error ? err.message : 'load failed');
			})
			.finally(() => { if (!cancelled) setLoading(false); });
		return () => { cancelled = true; };
	}, [id, data.ildUrl]); // eslint-disable-line react-hooks/exhaustive-deps

	// Restart playback when mode or fps changes (only if currently playing).
	useEffect(() => {
		if (!data.isPlaying) return;
		const present = getIldaFrameInfo(id);
		if (!present) return;
		startIldaPlayback(id, data.mode, data.fps);
		// Intentionally only re-runs on mode/fps; isPlaying changes are handled in handlePlay.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data.mode, data.fps]);

	const handleLoad = useCallback((url: string, filename: string) => {
		updateNodeData(id, { ildUrl: url, filename });
	}, [id, updateNodeData]);

	const handlePlay = useCallback(() => {
		if (data.isPlaying) {
			stopIldaPlayback(id);
			updateNodeData(id, { isPlaying: false });
		} else {
			if (!info) return;
			startIldaPlayback(id, data.mode, data.fps);
			updateNodeData(id, { isPlaying: true });
		}
	}, [id, data.isPlaying, data.mode, data.fps, info, updateNodeData]);

	const handleMode = (_e: unknown, v: 'static' | 'animated' | null) => {
		if (v) updateNodeData(id, { mode: v });
	};
	const handleFps  = (_e: unknown, v: number | number[]) => {
		updateNodeData(id, { fps: Array.isArray(v) ? v[0] : v });
	};

	return (
		<Box sx={{
			border:          '1px solid',
			borderColor:     color,
			borderRadius:    1,
			backgroundImage: METAL_BG,
			width:           3 * GRID_UNIT,
			position:        'relative',
			pb:              3,
		}}>
			<NodeHeader id={id} label={data.label || 'ILDA'} selected={selected} accentColor={color} />

			<Box sx={{ px: 1, py: 0.75, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
				<AudioFileLoader
					color={color}
					accept='.ild,.ILD'
					placeholder={data.filename || 'drop .ild or click'}
					onLoad={handleLoad}
				/>

				<Typography variant='caption' color='text.disabled' sx={{ fontSize: 9, minHeight: 12 }}>
					{loading ? 'decoding…' : status || (data.filename ? 'reload .ild to play' : 'no file')}
				</Typography>

				<ToggleButtonGroup
					value={data.mode}
					exclusive
					onChange={handleMode}
					size='small'
					fullWidth
					sx={hwToggleSx(color)}
					className='nodrag'
				>
					<ToggleButton value='static'   sx={{ flex: 1, fontSize: 9, py: 0.25 }}>Static</ToggleButton>
					<ToggleButton value='animated' sx={{ flex: 1, fontSize: 9, py: 0.25 }}>Animated</ToggleButton>
				</ToggleButtonGroup>

				{data.mode === 'animated' && (
					<Box className='nodrag'>
						<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
							<Typography variant='caption' color='text.disabled' sx={{ fontSize: 9 }}>fps</Typography>
							<Typography variant='caption' color='text.disabled' sx={{ fontSize: 9 }}>{data.fps}</Typography>
						</Box>
						<Slider
							size='small'
							min={5} max={60} step={1}
							value={data.fps}
							onChange={handleFps}
							sx={hwSliderSx(color)}
						/>
					</Box>
				)}

				<Box className='nodrag' sx={{ display: 'flex', justifyContent: 'center', pt: 0.25 }}>
					<IconButton
						size='medium'
						onClick={handlePlay}
						disabled={!info}
						aria-label={data.isPlaying ? 'Stop' : 'Start'}
						sx={data.isPlaying
							? { ...hwIconBtnLit(color), p: 1 }
							: { ...hwIconBtn(color),    p: 1 }
						}
					>
						{data.isPlaying
							? <StopIcon      sx={{ fontSize: 16 }} />
							: <PlayArrowIcon sx={{ fontSize: 16 }} />
						}
					</IconButton>
				</Box>
			</Box>

			{RIGHT_HANDLES.map((h, i) => {
				const top = getHandleTop(i, RIGHT_HANDLES.length);
				return (
					<Fragment key={h.id}>
						<Handle type='source' position={Position.Right} id={h.id}
							style={{ ...outputHandleStyle(color), top }} />
						{rightLabel(h.label, top, color)}
					</Fragment>
				);
			})}

			{BOTTOM_HANDLES.map(h => (
				<Fragment key={h.id}>
					<Handle type='source' position={Position.Bottom} id={h.id}
						style={{ ...outputHandleStyle(color), left: h.pct }} />
					{outputLabel(h.label, color, h.pct)}
				</Fragment>
			))}
		</Box>
	);
});
