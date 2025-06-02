import { type Node, Position, useNodes } from '@xyflow/react';

/**
 * Calculates dynamic connection points for an edge between two nodes,
 * making the edge appear to connect to "floating" handles.
 * The connection points are chosen on the side of each node that faces the other node.
 *
 * @param sourceNode The source node.
 * @param targetNode The target node.
 * @returns An object with source/target X, Y coordinates and nominal positions, or null if nodes are not ready.
 */
export function calculateFloatingConnectionPoints(
	sourceNode: Node,
	targetNode: Node
): {
	sourceX: number;
	sourceY: number;
	targetX: number;
	targetY: number;
	sourcePosition: Position; // Nominal side for styling/path calculation (e.g., for getBezierPath)
	targetPosition: Position; // Nominal side for styling/path calculation
} | null {
	if (
		!sourceNode.measured?.width ||
		!sourceNode.measured?.height ||
		!targetNode.measured?.width ||
		!targetNode.measured?.height ||
		!sourceNode.position || // Use position (relative) and assume parent is the pane for simplicity
		!targetNode.position // React Flow updates this to absolute if no parent, or relative to parent
	) {
		return null; // Nodes not fully measured or positioned yet
	}

	// Use relative positions; React Flow handles converting these to absolute for rendering if nodes are top-level
	const sxAbs = sourceNode.position.x;
	const syAbs = sourceNode.position.y;
	const sw = sourceNode.measured.width;
	const sh = sourceNode.measured.height;

	const txAbs = targetNode.position.x;
	const tyAbs = targetNode.position.y;
	const tw = targetNode.measured.width;
	const th = targetNode.measured.height;

	const sourceCenter = { x: sxAbs + sw / 2, y: syAbs + sh / 2 };
	const targetCenter = { x: txAbs + tw / 2, y: tyAbs + th / 2 };

	const dx = targetCenter.x - sourceCenter.x;
	const dy = targetCenter.y - sourceCenter.y;

	let sourcePointX: number, sourcePointY: number, finalSourcePos: Position;

	if (Math.abs(dx) * sh > Math.abs(dy) * sw) {
		// More horizontal displacement relative to node dimensions
		if (dx > 0) {
			// Target is to the right
			sourcePointX = sxAbs + sw;
			sourcePointY = syAbs + sh / 2;
			finalSourcePos = Position.Right;
		} else {
			// Target is to the left
			sourcePointX = sxAbs;
			sourcePointY = syAbs + sh / 2;
			finalSourcePos = Position.Left;
		}
	} else {
		// More vertical displacement relative to node dimensions
		if (dy > 0) {
			// Target is below
			sourcePointX = sxAbs + sw / 2;
			sourcePointY = syAbs + sh;
			finalSourcePos = Position.Bottom;
		} else {
			// Target is above
			sourcePointX = sxAbs + sw / 2;
			sourcePointY = syAbs;
			finalSourcePos = Position.Top;
		}
	}

	// Repeat for target node
	const dxTarget = sourceCenter.x - targetCenter.x;
	const dyTarget = sourceCenter.y - targetCenter.y;

	let targetPointX: number, targetPointY: number, finalTargetPos: Position;

	if (Math.abs(dxTarget) * th > Math.abs(dyTarget) * tw) {
		if (dxTarget > 0) {
			targetPointX = txAbs + tw;
			targetPointY = tyAbs + th / 2;
			finalTargetPos = Position.Right;
		} else {
			targetPointX = txAbs;
			targetPointY = tyAbs + th / 2;
			finalTargetPos = Position.Left;
		}
	} else {
		if (dyTarget > 0) {
			targetPointX = txAbs + tw / 2;
			targetPointY = tyAbs + th;
			finalTargetPos = Position.Bottom;
		} else {
			targetPointX = txAbs + tw / 2;
			targetPointY = tyAbs;
			finalTargetPos = Position.Top;
		}
	}

	return {
		sourceX: sourcePointX,
		sourceY: sourcePointY,
		sourcePosition: finalSourcePos,
		targetX: targetPointX,
		targetY: targetPointY,
		targetPosition: finalTargetPos,
	};
}

/**
 * A React Flow hook to get dynamic connection point data for a "floating" edge.
 * This data includes absolute X, Y coordinates for the source and target points,
 * and the nominal side (Position) of the connection on each node.
 *
 * To be used within custom edge components (e.g., FloatingEdge.tsx).
 *
 * @param sourceNodeId The ID of the source node.
 * @param targetNodeId The ID of the target node.
 * @returns Connection point data or null if nodes are not found or not ready.
 */
export const useFloatingEdgePathData = (
	sourceNodeId: string,
	targetNodeId: string
) => {
	const nodes = useNodes(); // Gets all current nodes from React Flow
	const sourceNode = nodes.find((n) => n.id === sourceNodeId);
	const targetNode = nodes.find((n) => n.id === targetNodeId);

	if (!sourceNode || !targetNode) {
		return null; // One or both nodes not found
	}

	return calculateFloatingConnectionPoints(sourceNode, targetNode);
};
