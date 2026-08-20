import { Suspense } from 'react';
import Box from '@mui/material/Box';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useSquareSize } from '../../hooks/useSquareSize';
import { useSceneToAudio } from '../../scene/useSceneToAudio';
import { SceneSourcesArrangeScene } from './sceneSources/SceneSourcesArrangeScene';
import { SceneSourcesOverlay } from './sceneSources/SceneSourcesOverlay';

/**
 * Two canvases rationale: the oscilloscope uses frameloop="demand" (only renders
 * when audio is active) while this canvas uses frameloop="always" (always
 * animating). Their render loops are fundamentally incompatible with a shared
 * WebGL context via <View>, so separate contexts is the correct choice here.
 * Browser WebGL context limits (8–16) are not a concern for two canvases.
 */

/** Runs useSceneToAudio inside the Canvas context so useThree() works. */
function SceneAudioBridge() {
	useSceneToAudio();
	return null;
}

export function SceneInputPanel() {
	const { ref, size } = useSquareSize();

	return (
		<Box
			ref={ref}
			sx={{
				width:          '100%',
				height:         '100%',
				bgcolor:        '#000',
				display:        'flex',
				alignItems:     'center',
				justifyContent: 'center',
				overflow:       'hidden',
				borderTop:      '1px solid #1a1a1a',
			}}
		>
			<Box sx={{ width: size, height: size, flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
				{size > 0 && (
					<Canvas
						orthographic
						camera={{
							left:     -1,
							right:    1,
							top:      1,
							bottom:   -1,
							near:     0.01,
							far:      100,
							position: [0, 0, 5],
						}}
						frameloop='always'
						gl={{ antialias: true }}
						style={{ width: '100%', height: '100%', display: 'block' }}
						onCreated={(state) => {
							// Dev-only memory-tracking hook (see store/daw.ts) — this is the
							// canvas that actually hosts the scanned scene geometry, so its
							// renderer.info is the one that matters for the Scene Input leak.
							const w = window as unknown as { __reactoscope?: Record<string, unknown> };
							if (w.__reactoscope) w.__reactoscope.sceneRenderer = state.gl;
						}}
					>
						<OrbitControls makeDefault />
						{/* Suspense: svgImport/gltfImport sources load async via useLoader (#46, #48) */}
						<Suspense fallback={null}>
							<SceneSourcesArrangeScene />
						</Suspense>
						<SceneAudioBridge />
					</Canvas>
				)}
				<SceneSourcesOverlay />
			</Box>
		</Box>
	);
}
