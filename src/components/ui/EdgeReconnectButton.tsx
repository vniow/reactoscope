import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { combineClasses, getDeleteButtonClasses } from '../../utils/styleUtils';

interface EdgeReconnectButtonProps {
	edgeId: string;
	title?: string;
	className?: string;
}

export function EdgeReconnectButton({
	edgeId,
	title = 'Reconnect edge',
	className = '',
}: EdgeReconnectButtonProps) {
	const { setEdges } = useReactFlow();

	const handleReconnectStart = useCallback(() => {
		// Mark the edge as updatable and ready for reconnection
		setEdges((edges) =>
			edges.map((edge) => {
				if (edge.id === edgeId) {
					return {
						...edge,
						updatable: true, // Ensure the edge is updatable
						data: {
							...edge.data,
							isReconnecting: true, // Optional: to track reconnection state
						},
					};
				}
				return edge;
			})
		);
	}, [edgeId, setEdges]);

	// Use shared styling utilities for consistent appearance with delete button
	const buttonClasses = combineClasses(
		getDeleteButtonClasses(),
		'transform rotate-45', // Rotate the × symbol 45 degrees to make it a diamond/plus shape
		className
	);

	return (
		<div className='absolute pointer-events-none left-0 top-0 w-full h-full z-50'>
			<button
				onMouseDown={handleReconnectStart}
				className={buttonClasses}
				style={{
					boxShadow: '0 4px 12px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.15)',
					filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
					backgroundColor: '#4f46e5', // Indigo background to differentiate from delete button
					borderColor: '#4338ca',
				}}
				title={title}
				aria-label={title}
			>
				×
			</button>
		</div>
	);
}
