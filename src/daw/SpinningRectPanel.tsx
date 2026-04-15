import { useRef } from 'react';
import Box from '@mui/material/Box';
import { Canvas, useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { useSquareSize } from '../hooks/useSquareSize';

/**
 * A simple spinning rectangle rendered in its own R3F canvas.
 *
 * Two canvases rationale: the oscilloscope uses frameloop="demand" (only renders
 * when audio is active) while this canvas uses frameloop="always" (always
 * animating). Their render loops are fundamentally incompatible with a shared
 * WebGL context via <View>, so separate contexts is the correct choice here.
 * Browser WebGL context limits (8–16) are not a concern for two canvases.
 */
function SpinningRect() {
	const ref = useRef<THREE.Mesh>(null);

	useFrame((_, delta) => {
		if (ref.current) {
			ref.current.rotation.z -= delta * 0.8;
		}
	});

	return (
		<mesh ref={ref}>
			<planeGeometry args={[1.2, 0.75]} />
			<meshBasicMaterial color='#22dd22' />
		</mesh>
	);
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
							near:     -1,
							far:      1,
							position: [0, 0, 0],
						}}
						frameloop='always'
						gl={{ antialias: true }}
						style={{ width: '100%', height: '100%', display: 'block' }}
					>
						<SpinningRect />
					</Canvas>
				)}
			</Box>
		</Box>
	);
}
