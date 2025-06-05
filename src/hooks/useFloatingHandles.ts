import { useState, useEffect, useMemo } from 'react';
import { Position } from '@xyflow/react';

export interface FloatingHandleConfig {
	id: string;
	position: Position;
}

export interface GridHandlePosition {
	gridX: number;
	gridY: number;
}

/**
 * Hook to manage floating handle positions for a node
 * Automatically distributes handles along their assigned edges to avoid overlapping
 */
export function useFloatingHandles(
	nodeGridWidth: number,
	nodeGridHeight: number,
	floatingHandles: FloatingHandleConfig[]
): Map<string, GridHandlePosition> {
	const [handlePositions] = useState(
		() => new Map<string, GridHandlePosition>()
	);

	// Calculate positions for floating handles
	const calculatedPositions = useMemo(() => {
		const positions = new Map<string, GridHandlePosition>();

		// Group handles by edge position
		const handlesByEdge = {
			[Position.Top]: floatingHandles.filter(
				(h) => h.position === Position.Top
			),
			[Position.Right]: floatingHandles.filter(
				(h) => h.position === Position.Right
			),
			[Position.Bottom]: floatingHandles.filter(
				(h) => h.position === Position.Bottom
			),
			[Position.Left]: floatingHandles.filter(
				(h) => h.position === Position.Left
			),
		};

		// Calculate positions for each edge
		Object.entries(handlesByEdge).forEach(([edge, handles]) => {
			if (handles.length === 0) return;

			const edgePosition = edge as Position;

			// Calculate positions based on edge
			const edgePositions = calculateEdgePositions(
				edgePosition,
				handles,
				nodeGridWidth,
				nodeGridHeight
			);

			// Store calculated positions
			handles.forEach((handle, index) => {
				positions.set(handle.id, edgePositions[index]);
			});
		});

		return positions;
	}, [nodeGridWidth, nodeGridHeight, floatingHandles]);

	// Update positions when they change
	useEffect(() => {
		handlePositions.clear();
		calculatedPositions.forEach((position, id) => {
			handlePositions.set(id, position);
		});
	}, [calculatedPositions, handlePositions]);

	return handlePositions;
}

/**
 * Calculate optimal positions for handles along a specific edge
 */
function calculateEdgePositions(
	edge: Position,
	handles: FloatingHandleConfig[],
	nodeGridWidth: number,
	nodeGridHeight: number
): GridHandlePosition[] {
	const handleCount = handles.length;
	const defaultSpacing = 1; // 1 grid unit spacing between handles

	switch (edge) {
		case Position.Top: {
			// Distribute along top edge (X varies, Y = 0)
			const availableWidth = nodeGridWidth;
			const totalSpacing = (handleCount - 1) * defaultSpacing;
			const startOffset = Math.max(0, (availableWidth - totalSpacing) / 2);

			return handles.map((_, index) => ({
				gridX: startOffset + index * defaultSpacing,
				gridY: 0,
			}));
		}

		case Position.Right: {
			// Distribute along right edge (X = nodeWidth, Y varies)
			const availableHeight = nodeGridHeight;
			const totalSpacing = (handleCount - 1) * defaultSpacing;
			const startOffset = Math.max(0, (availableHeight - totalSpacing) / 2);

			return handles.map((_, index) => ({
				gridX: 0, // Will be positioned relative to right edge
				gridY: startOffset + index * defaultSpacing,
			}));
		}

		case Position.Bottom: {
			// Distribute along bottom edge (X varies, Y = nodeHeight)
			const availableWidth = nodeGridWidth;
			const totalSpacing = (handleCount - 1) * defaultSpacing;
			const startOffset = Math.max(0, (availableWidth - totalSpacing) / 2);

			return handles.map((_, index) => ({
				gridX: startOffset + index * defaultSpacing,
				gridY: 0, // Will be positioned relative to bottom edge
			}));
		}

		case Position.Left: {
			// Distribute along left edge (X = 0, Y varies)
			const availableHeight = nodeGridHeight;
			const totalSpacing = (handleCount - 1) * defaultSpacing;
			const startOffset = Math.max(0, (availableHeight - totalSpacing) / 2);

			return handles.map((_, index) => ({
				gridX: 0,
				gridY: startOffset + index * defaultSpacing,
			}));
		}

		default:
			return [];
	}
}

/**
 * Simple hook for a single floating handle position
 * Useful when you don't need to manage multiple handles
 */
export function useFloatingHandlePosition(
	handleId: string,
	position: Position,
	floating: boolean,
	fallbackGridX: number,
	fallbackGridY: number,
	nodeGridWidth: number,
	nodeGridHeight: number
): GridHandlePosition {
	const floatingHandles = useMemo(
		() => (floating ? [{ id: handleId, position }] : []),
		[floating, handleId, position]
	);

	const floatingPositions = useFloatingHandles(
		nodeGridWidth,
		nodeGridHeight,
		floatingHandles
	);

	return floating
		? floatingPositions.get(handleId) || {
				gridX: fallbackGridX,
				gridY: fallbackGridY,
			}
		: { gridX: fallbackGridX, gridY: fallbackGridY };
}
