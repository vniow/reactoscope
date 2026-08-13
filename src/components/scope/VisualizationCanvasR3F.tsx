import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Canvas } from '@react-three/fiber';
import { ERROR_MESSAGES } from '../../config';
import { WoscopeSceneR3F } from './WoahcopeSceneR3F';

function detectUnsupported(): string | null {
	const canvas = document.createElement('canvas');
	if (!canvas.getContext('webgl2')) return ERROR_MESSAGES.webgl2NotSupported;
	if (!window.AudioContext && !(window as Window & { webkitAudioContext?: unknown }).webkitAudioContext) {
		return ERROR_MESSAGES.audioNotAvailable;
	}
	return null;
}

// Run once at module load — creating a canvas element on every render is wasteful.
const _unsupportedMessage = detectUnsupported();

export function VisualizationCanvasR3F() {
	const unsupportedMessage = _unsupportedMessage;

	if (unsupportedMessage) {
		return (
			<Box
				sx={{
					width: '100%',
					height: '100%',
					bgcolor: '#000',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					p: 3,
				}}
			>
				<Typography color='error' align='center'>
					{unsupportedMessage}
				</Typography>
			</Box>
		);
	}

	return (
		<Box
			role='img'
			aria-label='Audio oscilloscope visualization'
			sx={{
				width: '100%',
				height: '100%',
				bgcolor: '#000',
				overflow: 'hidden',
			}}
		>
			<Canvas
				orthographic
				camera={{
					left: -1,
					right: 1,
					top: 1,
					bottom: -1,
					near: -1,
					far: 1,
					position: [0, 0, 0],
				}}
				frameloop="demand"
				gl={{ antialias: false }}
				style={{ width: '100%', height: '100%', display: 'block' }}
				onCreated={(state) => {
					// Dev-only memory-tracking hook (see store/daw.ts) — stash the
					// renderer so its live GPU object counts (state.gl.info) are
					// pollable from evaluate_script.
					const w = window as unknown as { __reactoscope?: Record<string, unknown> };
					if (w.__reactoscope) w.__reactoscope.scopeRenderer = state.gl;
				}}
			>
				<WoscopeSceneR3F />
			</Canvas>
		</Box>
	);
}
