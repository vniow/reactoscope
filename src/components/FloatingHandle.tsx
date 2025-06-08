import { Handle, type HandleProps } from '@xyflow/react';
import { useFloatingHandles } from '../hooks/useFloatingPositions';

interface FloatingHandleProps extends Omit<HandleProps, 'position'> {
	nodeId?: string;
	minDistanceThreshold?: number;
	showDebugInfo?: boolean;
	/** Visual variant aligned with reactoscope's design system */
	variant?: 'default' | 'primary' | 'debug' | 'secondary' | 'audio';
}

/**
 * FloatingHandle component that automatically calculates optimal handle position
 * based on connected nodes. Integrates with reactoscope's grid system for
 * consistent positioning and visual alignment.
 */
export function FloatingHandle({
	type,
	nodeId,
	minDistanceThreshold = 50,
	showDebugInfo = false,
	variant = 'default',
	...handleProps
}: FloatingHandleProps) {
	// Calculate optimal positions for all handle types
	const positions = useFloatingHandles(nodeId, {
		minDistanceThreshold,
		useGridAlignment: true,
	});

	// Get the position for this specific handle type
	const position = positions[type];

	// Reactoscope-aligned styling based on variant
	const variantStyles = {
		default: {
			backgroundColor: '#94a3b8',
			border: '2px solid #475569',
			width: '12px',
			height: '12px',
		},
		primary: {
			backgroundColor: '#3b82f6',
			border: '2px solid #1e40af',
			width: '12px',
			height: '12px',
		},
		debug: {
			backgroundColor: '#e91e63',
			border: '2px solid #ad1457',
			width: '14px',
			height: '14px',
		},
		secondary: {
			backgroundColor: '#64748b',
			border: '2px solid #334155',
			width: '10px',
			height: '10px',
		},
		audio: {
			backgroundColor: '#10b981',
			border: '2px solid #047857',
			width: '12px',
			height: '12px',
		},
	};

	const handleStyle = {
		...variantStyles[variant],
		...handleProps.style,
	};

	// Debug info styling aligned with reactoscope's theme
	const debugColors = {
		default: '#6b7280',
		primary: '#3b82f6',
		debug: '#e91e63',
		secondary: '#64748b',
		audio: '#10b981',
	};

	return (
		<>
			<Handle
				type={type}
				position={position}
				style={handleStyle}
				{...handleProps}
			/>
			{showDebugInfo && (
				<div
					style={{
						position: 'absolute',
						fontSize: '8px',
						color: debugColors[variant],
						backgroundColor: 'rgba(255,255,255,0.95)',
						padding: '3px 6px',
						borderRadius: '4px',
						border: `1px solid ${debugColors[variant]}`,
						pointerEvents: 'none',
						fontWeight: 'bold',
						fontFamily: 'ui-monospace, monospace',
						boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
						zIndex: 1000,
						...(type === 'source'
							? { bottom: '-22px', left: '50%', transform: 'translateX(-50%)' }
							: { top: '-22px', left: '50%', transform: 'translateX(-50%)' }),
					}}
				>
					FLOAT {type.toUpperCase()}: {position}
				</div>
			)}
		</>
	);
}
