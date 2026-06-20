import { memo, Fragment, useCallback, useEffect, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { useDawStore, loadIldaForNode, startIldaPlayback, stopIldaPlayback, getIldaFrameInfo } from '../../../store/daw';
import { AudioFileLoader } from '../../../components/hw/AudioFileLoader';
import { NodeHeader, NODE_HEADER_HEIGHT } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { outputHandleStyle, bottomOutputHandleStyle, rightLabel, outputLabel } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import { HwButton, HwToggleButtonGroup } from '../shared/hwComponents';
import { HwSliderField } from '../../../components/hw/HwSliderField';
import type { IldaFrameFlowNode } from '../../../store/dawTypes';

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
			borderRadius:    1,
			backgroundImage: METAL_BG,
			width:           3 * GRID_UNIT,
			position:        'relative',
			pb:              3,
			boxShadow:       selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)',
		}}>
			<NodeHeader id={id} label={data.label || 'ILDA'} selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 0.75, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
				<AudioFileLoader
					color={color}
					accept='.ild,.ILD'
					placeholder={data.filename || 'drop .ild or click'}
					onLoad={handleLoad}
				/>

				<Typography variant='caption' color='text.disabled' sx={{ fontSize: 9, minHeight: 12 }}>
					{loading ? 'decoding…' : status || (data.filename ? 'reload .ild to play' : 'no file')}
				</Typography>

				<HwToggleButtonGroup color={color} value={data.mode} exclusive onChange={handleMode} className='nodrag'>
					<ToggleButton value='static'>Static</ToggleButton>
					<ToggleButton value='animated'>Animated</ToggleButton>
				</HwToggleButtonGroup>

				{data.mode === 'animated' && (
					<Box className='nodrag nowheel'>
						<HwSliderField
							label='fps'
							value={data.fps}
							min={5} max={60} step={1}
							color={color}
							onChange={(v) => handleFps(null, v)}
							format={v => String(Math.round(v))}
						/>
					</Box>
				)}

				<HwButton color={color} lit={data.isPlaying} sx={{ py: 0.4 }}
					onClick={handlePlay} disabled={!info}
					fullWidth className='nodrag' aria-label={data.isPlaying ? 'Stop' : 'Start'}>
					{data.isPlaying
						? <StopIcon      sx={{ fontSize: 13 }} />
						: <PlayArrowIcon sx={{ fontSize: 13 }} />
					}
				</HwButton>
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
						style={{ ...bottomOutputHandleStyle(color), left: h.pct }} />
					{outputLabel(h.label, color, h.pct)}
				</Fragment>
			))}
		</Box>
	);
});
