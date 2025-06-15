import type { NodeProps } from '@xyflow/react';
import type { NodeDebugInfo } from '../types/ui';

/**
 * Debug utilities following the principle of separating debug code from production logic
 */

export function formatDebugValue(value: unknown): string {
	if (value === undefined) return 'undefined';
	if (value === null) return 'null';
	if (typeof value === 'boolean') return value.toString();
	if (typeof value === 'number') return `${Math.round(value * 100) / 100}`;
	if (typeof value === 'object') return JSON.stringify(value, null, 1);
	return String(value);
}

export function extractNodeDebugInfo(props: NodeProps): NodeDebugInfo {
	const {
		id,
		type,
		positionAbsoluteX = 0,
		positionAbsoluteY = 0,
		width = 0,
		height = 0,
		selected = false,
		dragging = false,
		draggable = true,
		selectable = true,
		deletable = true,
		isConnectable = true,
		parentId,
		dragHandle,
		zIndex = 0,
	} = props;

	return {
		identity: {
			id: String(id),
			type: String(type),
		},
		position: {
			absolutePosition: `x: ${Math.round(positionAbsoluteX)}, y: ${Math.round(positionAbsoluteY)}`,
			dimensions: `${width ? Math.round(width) : 'auto'} × ${height ? Math.round(height) : 'auto'}`,
		},
		state: {
			selected,
			dragging,
			draggable,
			selectable,
			deletable,
			connectable: isConnectable,
		},
		relationships: {
			parentId: parentId || null,
			dragHandle: dragHandle || null,
			zIndex,
		},
	};
}

export function createDebugInfoRenderer() {
	return function renderDebugInfo(info: Record<string, unknown>) {
		return Object.entries(info);
	};
}

/**
 * Development-only debug features
 */
export const isDevelopment = process.env.NODE_ENV === 'development';

export function withDebugFeatures<T>(component: T): T {
	if (!isDevelopment) {
		return component;
	}
	return component;
}
