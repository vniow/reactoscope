import React, { useMemo, useCallback, useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Canvas3DContext, type Registry } from './CanvasContext';
import { View } from '@react-three/drei';

export function CanvasProvider({ children }: { children: React.ReactNode }) {
	const [registry, setRegistry] = useState<Registry>({});
	// Ref for container to reconnect Canvas event system and HTML content
	const containerRef = useRef<HTMLDivElement>(null);

	const registerNodeContent = useCallback(
		(nodeId: string, content: React.ReactNode) => {
			setRegistry((prev: Registry) => ({ ...prev, [nodeId]: content }));
		},
		[]
	);

	const unregisterNodeContent = useCallback((nodeId: string) => {
		setRegistry((prev: Registry) => {
			const next = { ...prev };
			delete next[nodeId];
			return next;
		});
	}, []);

	const getRegistry = useCallback(() => registry, [registry]);

	const contextValue = useMemo(
		() => ({ registerNodeContent, unregisterNodeContent, getRegistry }),
		[registerNodeContent, unregisterNodeContent, getRegistry]
	);

	// Render all registered 3D content in the shared Canvas
	const allContent = Object.entries(registry).map(([nodeId, content]) => (
		<React.Fragment key={nodeId}>{content as React.ReactNode}</React.Fragment>
	));

	return (
		<Canvas3DContext.Provider value={contextValue}>
			{/* Container holds both Canvas and HTML children for eventSource */}
			<div
				ref={containerRef}
				style={{ position: 'relative', width: '100%', height: '100%' }}
			>
				<div
					style={{
						position: 'absolute',
						inset: 0,
						pointerEvents: 'none',
						zIndex: 0, // Ensure canvas is always behind main UI
					}}
				>
					<Canvas
						style={{ width: '100vw', height: '100vh', pointerEvents: 'none' }}
					>
						{/* Port outputs all registered Views */}
						<View.Port />
						{allContent}
					</Canvas>
				</div>
				{/* Render HTML children on top */}
				<div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
			</div>
		</Canvas3DContext.Provider>
	);
}
