import { memo, useEffect, useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import DownloadIcon from '@mui/icons-material/Download';
import {
	isRecorderSupported, startRecordingNode, pauseRecordingNode, stopRecordingNode,
} from '../../../audio/engine';
import { NodeHeader } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { inputHandleStyle } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import { hwIconBtn, hwIconBtnLit } from '../shared/hwStyles';
import type { RecorderFlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.utility;

function formatDuration(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Persistent Download button, not auto-download on stop — the user decides
// when (or whether) the take leaves the browser (docs/adr/0006-recorder-v1-
// interaction-scope.md). No live params either: mimeType is constructor-only
// on Tone's Recorder, so this node has no editable data at all.
export const RecorderNode = memo(function RecorderNode({ id, selected }: NodeProps<RecorderFlowNode>) {
	const supported = isRecorderSupported();

	const [state, setState]       = useState<'idle' | 'recording' | 'paused' | 'stopped'>('idle');
	const [elapsed, setElapsed]   = useState(0);
	const [blobUrl, setBlobUrl]   = useState<string | null>(null);
	const [blobSize, setBlobSize] = useState(0);
	const [finalDuration, setFinalDuration] = useState(0);

	const startedAtRef = useRef(0);
	const accumRef      = useRef(0);
	const rafRef        = useRef(0);
	const blobUrlRef    = useRef<string | null>(null);

	useEffect(() => {
		if (state !== 'recording') return;
		startedAtRef.current = performance.now();
		const tick = () => {
			setElapsed(accumRef.current + (performance.now() - startedAtRef.current) / 1000);
			rafRef.current = requestAnimationFrame(tick);
		};
		rafRef.current = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafRef.current);
	}, [state]);

	useEffect(() => () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current); }, []);

	const handleRecord = async () => {
		if (state === 'stopped' && blobUrlRef.current) {
			URL.revokeObjectURL(blobUrlRef.current);
			blobUrlRef.current = null;
			setBlobUrl(null);
			accumRef.current = 0;
			setElapsed(0);
		}
		await startRecordingNode(id);
		setState('recording');
	};

	const handlePause = () => {
		accumRef.current = elapsed;
		pauseRecordingNode(id);
		setState('paused');
	};

	const handleStop = async () => {
		if (state === 'recording') accumRef.current = elapsed;
		const blob = await stopRecordingNode(id);
		setFinalDuration(accumRef.current);
		setState('stopped');
		if (blob) {
			const url = URL.createObjectURL(blob);
			blobUrlRef.current = url;
			setBlobUrl(url);
			setBlobSize(blob.size);
		}
	};

	return (
		<Box sx={{ borderRadius: 1, backgroundImage: METAL_BG, width: 2.5 * GRID_UNIT, position: 'relative', boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)' }}>
			<NodeHeader id={id} label='Recorder' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75, alignItems: 'center' }} className='nodrag'>
				{!supported ? (
					<Typography variant='caption' color='text.disabled' sx={{ fontSize: 9, textAlign: 'center' }}>
						MediaRecorder not supported in this browser
					</Typography>
				) : (
					<>
						<Box sx={{ display: 'flex', gap: 0.75 }}>
							<IconButton size='small' disabled={state === 'recording'} onClick={handleRecord}
								sx={state === 'recording' ? { ...hwIconBtnLit(color), p: 0.75 } : { ...hwIconBtn(color), p: 0.75 }}>
								<FiberManualRecordIcon sx={{ fontSize: 16 }} />
							</IconButton>
							<IconButton size='small' disabled={state !== 'recording' && state !== 'paused'} onClick={handlePause}
								sx={state === 'paused' ? { ...hwIconBtnLit(color), p: 0.75 } : { ...hwIconBtn(color), p: 0.75 }}>
								<PauseIcon sx={{ fontSize: 16 }} />
							</IconButton>
							<IconButton size='small' disabled={state !== 'recording' && state !== 'paused'} onClick={handleStop}
								sx={{ ...hwIconBtn(color), p: 0.75 }}>
								<StopIcon sx={{ fontSize: 16 }} />
							</IconButton>
						</Box>

						<Typography variant='caption' color='text.secondary' sx={{ fontSize: 11, fontFamily: 'monospace' }}>
							{formatDuration(state === 'stopped' ? finalDuration : elapsed)}
						</Typography>

						{state === 'stopped' && blobUrl && (
							<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
								<Typography variant='caption' color='text.disabled' sx={{ fontSize: 9 }}>
									{formatSize(blobSize)}
								</Typography>
								<IconButton size='small' component='a' href={blobUrl} download={`recording-${id}.webm`}
									sx={{ ...hwIconBtn(color), p: 0.75 }}>
									<DownloadIcon sx={{ fontSize: 16 }} />
								</IconButton>
							</Box>
						)}
					</>
				)}
			</Box>

			<Handle type='target' position={Position.Left} id='in-0' style={inputHandleStyle(color)} />
		</Box>
	);
});
