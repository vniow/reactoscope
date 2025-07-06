/**
 * Shape Manager Hook
 *
 * React hook for managing shapes in components.
 */

import { useShapeRegistry } from './ShapeRegistry';

/**
 * Hook for managing shapes in a React component
 */
export function useShapeManager() {
	const shapeRegistry = useShapeRegistry();

	const createShape = (
		id: string,
		type: string,
		config: Record<string, unknown> = {}
	) => {
		return shapeRegistry.createShape(id, { type, ...config });
	};

	const removeShape = (id: string) => {
		return shapeRegistry.removeShape(id);
	};

	const updateShape = (id: string, updates: Record<string, unknown>) => {
		return shapeRegistry.updateShape(id, updates);
	};

	const getShape = (id: string) => {
		return shapeRegistry.getShape(id);
	};

	const getAllShapes = () => {
		return shapeRegistry.getAllShapes();
	};

	const getShapesByType = (type: string) => {
		return shapeRegistry.getShapesByType(type);
	};

	return {
		createShape,
		removeShape,
		updateShape,
		getShape,
		getAllShapes,
		getShapesByType,
		registry: shapeRegistry,
	};
}
