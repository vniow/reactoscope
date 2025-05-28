/**
 * VisualizerControls.ts
 * Manages visualizer controls for the audio visualizer node
 */

export interface VisualizerControlsValues {
	lineColor: string;
	lineThickness: number;
	lineIntensity: number;
	audioScale: number;
	highQuality: boolean;
}

export const DEFAULT_VISUALIZER_CONTROLS: VisualizerControlsValues = {
	lineColor: '#00ff00',
	lineThickness: 0.012,
	lineIntensity: 1.0,
	audioScale: 0.8,
	highQuality: true,
};

/**
 * Hook to provide visualizer controls - simplified version for node integration
 */
export function useVisualizerControls(
	overrides?: Partial<VisualizerControlsValues>
): VisualizerControlsValues {
	return {
		...DEFAULT_VISUALIZER_CONTROLS,
		...overrides,
	};
}
