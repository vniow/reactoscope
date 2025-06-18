import { useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';

// Scene with animated square and circle outlines
export function GeometricScene() {
	const squareRef = useRef<THREE.Line>(null);
	const circleRef = useRef<THREE.Line>(null);

	// Create square outline geometry (just 4 corner vertices)
	const squareGeometry = useMemo(() => {
		const geometry = new THREE.BufferGeometry();

		// Define vertices for square outline (4 corners in order)
		const vertices = new Float32Array([
			-0.5,
			0.5,
			0, // Top-left
			0.5,
			0.5,
			0, // Top-right
			0.5,
			-0.5,
			0, // Bottom-right
			-0.5,
			-0.5,
			0, // Bottom-left
		]);

		geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

		return geometry;
	}, []);

	// Create circle outline geometry (perimeter vertices only)
	const circleGeometry = useMemo(() => {
		const geometry = new THREE.BufferGeometry();
		const segments = 32; // More segments for smoother circle
		const radius = 0.5;

		const vertices: number[] = [];

		// Create perimeter vertices only (no center vertex)
		for (let i = 0; i < segments; i++) {
			const angle = (i / segments) * Math.PI * 2;
			const x = Math.cos(angle) * radius;
			const y = Math.sin(angle) * radius;
			vertices.push(x, y, 0);
		}

		geometry.setAttribute(
			'position',
			new THREE.BufferAttribute(new Float32Array(vertices), 3)
		);

		return geometry;
	}, []);

	// Animate both objects
	useFrame((state) => {
		const time = state.clock.elapsedTime;

		if (squareRef.current) {
			// Rotate the square slowly
			squareRef.current.rotation.z = time * 0.3;
			// Move it slightly up and down
			squareRef.current.position.y = Math.sin(time * 0.5) * 0.3;
		}

		if (circleRef.current) {
			// Scale the circle rhythmically
			const scale = 1 + Math.sin(time * 2) * 0.2;
			circleRef.current.scale.setScalar(scale);
			// Move it left and right
			circleRef.current.position.x = Math.cos(time * 0.7) * 0.5;
		}
	});

	return (
		<group>
			{/* Animated square outline on the left */}
			<lineLoop
				ref={squareRef}
				position={[-1, 0, 0]}
				geometry={squareGeometry}
			>
				<lineBasicMaterial color='#00ff00' />
			</lineLoop>

			{/* Animated circle outline on the right */}
			<lineLoop
				ref={circleRef}
				position={[1, 0, 0]}
				geometry={circleGeometry}
			>
				<lineBasicMaterial color='#ff0080' />
			</lineLoop>
		</group>
	);
}
