import { useMemo } from 'react';
import Box from '@mui/material/Box';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useSquareSize } from '../hooks/useSquareSize';
import { useSceneToAudio } from '../scene/useSceneToAudio';

/**
 * Two canvases rationale: the oscilloscope uses frameloop="demand" (only renders
 * when audio is active) while this canvas uses frameloop="always" (always
 * animating). Their render loops are fundamentally incompatible with a shared
 * WebGL context via <View>, so separate contexts is the correct choice here.
 * Browser WebGL context limits (8–16) are not a concern for two canvases.
 */

const BOX_GEO = new THREE.BoxGeometry(1, 1, 1);

function WireframeCube() {
	const edgesArgs = useMemo<[THREE.BufferGeometry]>(() => [BOX_GEO], []);

	return (
		<lineSegments>
			<edgesGeometry args={edgesArgs} />
			<lineBasicMaterial color='#22dd22' />
		</lineSegments>
	);
}

/** Runs useSceneToAudio inside the Canvas context so useThree() works. */
function SceneAudioBridge() {
	useSceneToAudio();
	return null;
}

export function SpinningRectPanel() {
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
			<Box sx={{ width: size, height: size, flexShrink: 0, overflow: 'hidden' }}>
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
					>
						<OrbitControls makeDefault />
						<WireframeCube />
						<SceneAudioBridge />
					</Canvas>
				)}
			</Box>
		</Box>
	);
}
