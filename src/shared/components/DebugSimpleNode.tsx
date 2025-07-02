import React from 'react';
import { Canvas } from '@react-three/fiber';

/**
 * DebugSimpleNode
 *
 * Minimal unstyled React Flow node for debugging with R3F canvas.
 */
// Simple 3D scene for debug visualization
function DebugScene() {
	return (
		<>
			<ambientLight intensity={0.5} />
			<pointLight position={[10, 10, 10]} />
			<mesh>
				<boxGeometry args={[1, 1, 1]} />
				<meshStandardMaterial color={'#ef4444'} />
			</mesh>
		</>
	);
}

// Minimal debug node: accepts any props and logs them
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DebugSimpleNode(props: any): React.ReactElement {
	const { id, data, selected } = props;
	console.log('DebugSimpleNode render:', { id, data, selected });
	return (
		<div
			className='grid grid-cols-1 auto-rows-min gap-2 min-w-grid-5 min-h-grid-4 bg-node-primary border border-node rounded-lg p-4'
			data-variant='unit'
			style={{
				gridTemplateRows: 'auto 1fr auto', // Header, Canvas, Footer
			}}
		>
			{/* Header with debug info */}
			<div className='text-node-primary font-semibold'>
				🔍 Debug Node: {String(id)}
			</div>

			{/* R3F Canvas container - grid-aligned fixed size */}
			<div
				className='bg-node-secondary rounded overflow-hidden r3f-canvas-container'
				style={{
					width: 'var(--spacing-grid-8)',
					height: 'var(--spacing-grid-8)',
				}}
			>
				<Canvas
					style={{ width: '100%', height: '100%' }}
					camera={{ position: [2, 2, 2], fov: 50 }}
				>
					<DebugScene />
				</Canvas>
			</div>

			{/* Data display - auto-sizing footer */}
			<pre
				className='text-node-secondary text-xs bg-node-secondary rounded p-2 overflow-auto'
				style={{
					whiteSpace: 'pre-wrap',
					maxHeight: 'var(--spacing-grid-2)', // Max 128px
				}}
			>
				{JSON.stringify(data, null, 2)}
			</pre>
		</div>
	);
}
