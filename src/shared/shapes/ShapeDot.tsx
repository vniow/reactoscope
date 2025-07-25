interface ShapeDotProps {
	position: [number, number, number];
}

/**
 * Renders a small white dot (sphere) at the given position.
 */
export function ShapeDot({ position }: ShapeDotProps) {
	return (
		<mesh position={position}>
			<sphereGeometry args={[0.05, 16, 16]} />
			<meshBasicMaterial color='#fff' />
		</mesh>
	);
}
