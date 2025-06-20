import { create } from 'zustand';
import { Vector2 } from 'three';
import type { SceneDebugMetrics } from '../SceneCoordinateTracker';

interface SceneState {
	coordinates: Vector2[];
	debugMetrics: SceneDebugMetrics | null;
	setCoordinates: (coordinates: Vector2[]) => void;
	setDebugMetrics: (metrics: SceneDebugMetrics) => void;
}

export const useSceneStore = create<SceneState>((set) => ({
	coordinates: [],
	debugMetrics: null,
	setCoordinates: (coordinates) => set({ coordinates }),
	setDebugMetrics: (debugMetrics) => set({ debugMetrics }),
}));
