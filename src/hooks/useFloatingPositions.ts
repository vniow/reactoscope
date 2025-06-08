import { useMemo } from 'react';
import {
	useNodeId,
	useNodes,
	useEdges,
	Position,
	type Node,
	type Edge,
} from '@xyflow/react';

// Simple, focused types aligned with reactoscope architecture
export interface FloatingOptions {
	minDistanceThreshold?: number;
}

export interface HandlePositions {
	source: Position;
	target: Position;
}

export interface EdgePositions {
	sourcePosition: Position;
	targetPosition: Position;
	sourcePoint: { x: number; y: number };
	targetPoint: { x: number; y: number };
}

// Pure utility functions - single responsibility each

/**
 * Get node center point using actual node position (no forced grid alignment)
 */
function getNodeCenter(node: Node): { x: number; y: number } {
	const width = node.measured?.width ?? node.width ?? 150;
	const height = node.measured?.height ?? node.height ?? 40;

	// Use actual node position without forced grid snapping
	// This allows floating handles to work correctly even when nodes are at half-grid positions
	const centerX = node.position.x + width / 2;
	const centerY = node.position.y + height / 2;

	return { x: centerX, y: centerY };
}

/**
 * Get node bounds using actual node position (no forced grid alignment)
 */
function getNodeBounds(node: Node) {
	const width = node.measured?.width ?? node.width ?? 150;
	const height = node.measured?.height ?? node.height ?? 40;

	// Use actual node position without forced grid alignment
	// This ensures floating handles position correctly regardless of grid snapping
	return {
		x: node.position.x,
		y: node.position.y,
		width,
		height,
	};
}

/**
 * Calculate direction between two points
 */
function getDirection(
	from: { x: number; y: number },
	to: { x: number; y: number }
): Position {
	const dx = to.x - from.x;
	const dy = to.y - from.y;

	if (Math.abs(dx) > Math.abs(dy)) {
		return dx > 0 ? Position.Right : Position.Left;
	} else {
		return dy > 0 ? Position.Bottom : Position.Top;
	}
}

/**
 * Get handle position based on connected nodes
 */
function getOptimalPosition(
	currentNode: Node,
	connectedNodes: Node[],
	handleType: 'source' | 'target',
	minDistance: number
): Position {
	const defaultPosition =
		handleType === 'source' ? Position.Bottom : Position.Top;

	if (connectedNodes.length === 0) {
		return defaultPosition;
	}

	const currentCenter = getNodeCenter(currentNode);

	// Calculate average position of connected nodes
	const connectedCenters = connectedNodes.map(getNodeCenter);
	const avgX =
		connectedCenters.reduce((sum, pos) => sum + pos.x, 0) /
		connectedCenters.length;
	const avgY =
		connectedCenters.reduce((sum, pos) => sum + pos.y, 0) /
		connectedCenters.length;

	// Check distance to avoid jitter
	const distance = Math.sqrt(
		(avgX - currentCenter.x) ** 2 + (avgY - currentCenter.y) ** 2
	);
	if (distance < minDistance) {
		return defaultPosition;
	}

	return getDirection(currentCenter, { x: avgX, y: avgY });
}

/**
 * Get connection point on node edge
 */
function getConnectionPoint(
	node: Node,
	position: Position
): { x: number; y: number } {
	const bounds = getNodeBounds(node);

	switch (position) {
		case Position.Top:
			return { x: bounds.x + bounds.width / 2, y: bounds.y };
		case Position.Bottom:
			return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height };
		case Position.Left:
			return { x: bounds.x, y: bounds.y + bounds.height / 2 };
		case Position.Right:
			return { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 };
		default:
			return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height };
	}
}

/**
 * Get connected nodes for a specific handle
 */
function getConnectedNodes(
	nodeId: string,
	nodes: Node[],
	edges: Edge[],
	handleType: 'source' | 'target'
): Node[] {
	const relevantEdges = edges.filter((edge) =>
		handleType === 'source' ? edge.source === nodeId : edge.target === nodeId
	);

	return relevantEdges
		.map((edge) => {
			const targetId = handleType === 'source' ? edge.target : edge.source;
			return nodes.find((node) => node.id === targetId);
		})
		.filter((node): node is Node => node !== undefined);
}

// Focused hooks - each with single responsibility

/**
 * Hook for floating handle positions
 * Responsibility: Calculate optimal handle positions for floating nodes
 */
export function useFloatingHandles(
	nodeId?: string,
	options: FloatingOptions = {}
): HandlePositions {
	const currentNodeId = useNodeId() ?? nodeId;
	const nodes = useNodes();
	const edges = useEdges();
	const { minDistanceThreshold = 50 } = options;

	return useMemo(() => {
		if (!currentNodeId) {
			return { source: Position.Bottom, target: Position.Top };
		}

		const currentNode = nodes.find((node) => node.id === currentNodeId);
		if (!currentNode) {
			return { source: Position.Bottom, target: Position.Top };
		}

		const sourceConnected = getConnectedNodes(
			currentNodeId,
			nodes,
			edges,
			'source'
		);
		const targetConnected = getConnectedNodes(
			currentNodeId,
			nodes,
			edges,
			'target'
		);

		return {
			source: getOptimalPosition(
				currentNode,
				sourceConnected,
				'source',
				minDistanceThreshold
			),
			target: getOptimalPosition(
				currentNode,
				targetConnected,
				'target',
				minDistanceThreshold
			),
		};
	}, [currentNodeId, nodes, edges, minDistanceThreshold]);
}

/**
 * Hook for floating edge positions
 * Responsibility: Calculate edge connection points for floating nodes only
 */
export function useFloatingEdgePositions(
	sourceId: string,
	targetId: string,
	options: FloatingOptions = {}
): EdgePositions {
	const nodes = useNodes();
	const { minDistanceThreshold = 50 } = options;

	return useMemo(() => {
		const sourceNode = nodes.find((node) => node.id === sourceId);
		const targetNode = nodes.find((node) => node.id === targetId);

		if (!sourceNode || !targetNode) {
			return {
				sourcePosition: Position.Right,
				targetPosition: Position.Left,
				sourcePoint: { x: 0, y: 0 },
				targetPoint: { x: 0, y: 0 },
			};
		}

		// Calculate optimal positions
		const sourcePosition = getOptimalPosition(
			sourceNode,
			[targetNode],
			'source',
			minDistanceThreshold
		);
		const targetPosition = getOptimalPosition(
			targetNode,
			[sourceNode],
			'target',
			minDistanceThreshold
		);

		// Calculate connection points
		const sourcePoint = getConnectionPoint(sourceNode, sourcePosition);
		const targetPoint = getConnectionPoint(targetNode, targetPosition);

		return { sourcePosition, targetPosition, sourcePoint, targetPoint };
	}, [nodes, sourceId, targetId, minDistanceThreshold]);
}

/**
 * Check if a node uses floating handles
 * Based on reactoscope's node types that support dynamic positioning
 */
export function isFloatingNode(node: Node): boolean {
	// Support floating handles for position-logger nodes (from migration)
	// and debug nodes which can demonstrate floating functionality
	return node.type === 'position-logger' || node.type === 'debug';
}

/**
 * Hook for hybrid edge positions (floating + static)
 * Responsibility: Handle mixed floating/static edge scenarios
 */
export function useHybridEdgePositions(
	sourceId: string,
	targetId: string,
	fallbackProps: {
		sourcePosition?: Position;
		targetPosition?: Position;
		sourceX?: number;
		sourceY?: number;
		targetX?: number;
		targetY?: number;
	},
	options: FloatingOptions = {}
): EdgePositions {
	const nodes = useNodes();
	const floatingPositions = useFloatingEdgePositions(
		sourceId,
		targetId,
		options
	);

	return useMemo(() => {
		const sourceNode = nodes.find((node) => node.id === sourceId);
		const targetNode = nodes.find((node) => node.id === targetId);

		if (!sourceNode || !targetNode) {
			return {
				sourcePosition: fallbackProps.sourcePosition || Position.Right,
				targetPosition: fallbackProps.targetPosition || Position.Left,
				sourcePoint: {
					x: fallbackProps.sourceX || 0,
					y: fallbackProps.sourceY || 0,
				},
				targetPoint: {
					x: fallbackProps.targetX || 0,
					y: fallbackProps.targetY || 0,
				},
			};
		}

		// Use floating positions if both nodes are floating, otherwise use fallback
		const bothFloating =
			isFloatingNode(sourceNode) && isFloatingNode(targetNode);

		if (bothFloating) {
			return floatingPositions;
		}

		// Mixed scenario: calculate positions per node type
		let sourcePosition: Position;
		let targetPosition: Position;
		let sourcePoint: { x: number; y: number };
		let targetPoint: { x: number; y: number };

		if (isFloatingNode(sourceNode)) {
			sourcePosition = floatingPositions.sourcePosition;
			sourcePoint = floatingPositions.sourcePoint;
		} else {
			sourcePosition = fallbackProps.sourcePosition || Position.Right;
			sourcePoint = {
				x: fallbackProps.sourceX || 0,
				y: fallbackProps.sourceY || 0,
			};
		}

		if (isFloatingNode(targetNode)) {
			targetPosition = floatingPositions.targetPosition;
			targetPoint = floatingPositions.targetPoint;
		} else {
			targetPosition = fallbackProps.targetPosition || Position.Left;
			targetPoint = {
				x: fallbackProps.targetX || 0,
				y: fallbackProps.targetY || 0,
			};
		}

		return { sourcePosition, targetPosition, sourcePoint, targetPoint };
	}, [
		nodes,
		sourceId,
		targetId,
		floatingPositions,
		fallbackProps.sourcePosition,
		fallbackProps.targetPosition,
		fallbackProps.sourceX,
		fallbackProps.sourceY,
		fallbackProps.targetX,
		fallbackProps.targetY,
	]);
}
