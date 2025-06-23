import { Suspense, useRef, Component, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import type { Mesh } from 'three';

const canvasResize = {
	scroll: false,
	debounce: { scroll: 50, resize: 0 },
};

class CanvasErrorBoundary extends Component<
	{ children: ReactNode },
	{ hasError: boolean }
> {
	constructor(props: { children: ReactNode }) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError() {
		return { hasError: true };
	}

	render() {
		if (this.state.hasError) {
			return <WebGLFallback />;
		}
		return this.props.children;
	}
}

function WebGLFallback() {
	return (
		<div className='text-purple-300 text-sm flex items-center justify-center h-full'>
			Your browser doesn&apos;t support WebGL 😢
		</div>
	);
}

function RotatingCube({ wireframe }: { wireframe: boolean }) {
	const meshRef = useRef<Mesh>(null);

	useFrame((_state, delta) => {
		if (meshRef.current) {
			meshRef.current.rotation.x += delta;
			meshRef.current.rotation.y += delta * 0.5;
		}
	});

	return (
		<mesh
			ref={meshRef}
			position={[0, 0, 0]}
		>
			<boxGeometry args={[1.5, 1.5, 1.5]} />
			<meshStandardMaterial
				color='hotpink'
				wireframe={wireframe}
			/>
		</mesh>
	);
}

function GridHelper({ visible }: { visible: boolean }) {
	if (!visible) return null;

	return (
		<>
			<gridHelper args={[10, 10, '#444444', '#222222']} />
			<axesHelper args={[2]} />
		</>
	);
}

function Scene({
	wireframe,
	showGrid,
}: {
	wireframe: boolean;
	showGrid: boolean;
}) {
	return (
		<>
			<color
				attach='background'
				args={['#1a1a1a']}
			/>
			<ambientLight intensity={0.6} />
			<directionalLight
				position={[10, 10, 5]}
				intensity={1}
			/>
			<pointLight
				position={[10, 10, 10]}
				intensity={0.5}
			/>
			<RotatingCube wireframe={wireframe} />
			<GridHelper visible={showGrid} />
		</>
	);
}

type Fiber3DProps = {
	zoom: number;
	wireframe: boolean;
	showGrid: boolean;
};

export function Fiber3D({ zoom, wireframe, showGrid }: Fiber3DProps) {
	return (
		<div style={{ width: '100%', height: '100%', position: 'relative' }}>
			<CanvasErrorBoundary>
				<Canvas
					resize={canvasResize}
					dpr={1}
					fallback={<WebGLFallback />}
					style={{
						width: '100%',
						height: '100%',
						display: 'block',
						maxWidth: '100%',
						maxHeight: '100%',
					}}
					gl={{
						antialias: true,
						alpha: false,
						powerPreference: 'high-performance',
						preserveDrawingBuffer: false,
					}}
				>
					<OrthographicCamera
						makeDefault
						position={[3, 3, 3]}
						zoom={zoom}
						near={0.1}
						far={1000}
					/>
					<Suspense fallback={null}>
						<Scene
							wireframe={wireframe}
							showGrid={showGrid}
						/>
					</Suspense>
				</Canvas>
			</CanvasErrorBoundary>
		</div>
	);
}
