import React, { useMemo, useCallback, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Canvas3DContext, type Registry } from './CanvasContext';

export function CanvasProvider({ children }: { children: React.ReactNode }) {
	const [registry, setRegistry] = useState<Registry>({});

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
			<div
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
					zIndex: 1,
				}}
			>
				<Canvas style={{ width: '100vw', height: '100vh' }}>
					{allContent}
				</Canvas>
			</div>
			{children}
		</Canvas3DContext.Provider>
	);
}
