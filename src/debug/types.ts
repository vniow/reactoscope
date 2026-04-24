export interface DebugSnapshot {
	frameCount: number;
	shaderPrograms: number;
	lineRTPixelAfterFade: [number, number, number, number];
	lineRTPixelAfterLine: [number, number, number, number];
	blur1RTPixel: [number, number, number, number];
	blur3RTPixel: [number, number, number, number];
	canvasPixelAfterBlit: [number, number, number, number];
	waveformLeft:  { min: number; max: number; sample: number[] };
	waveformRight: { min: number; max: number; sample: number[] };
	audioContextState: string;
	nPoints: number;
	// drag correlation fields
	isDragging: boolean;
	lastDragStartMs: number;
	lastDragStopMs: number;
	audioVersionAtDragStop: number;
	silenceStartMs: number;
	silenceEndMs: number;
}

export const EMPTY_SNAPSHOT: DebugSnapshot = {
	frameCount: 0,
	shaderPrograms: 0,
	lineRTPixelAfterFade: [0, 0, 0, 0],
	lineRTPixelAfterLine: [0, 0, 0, 0],
	blur1RTPixel: [0, 0, 0, 0],
	blur3RTPixel: [0, 0, 0, 0],
	canvasPixelAfterBlit: [0, 0, 0, 0],
	waveformLeft:  { min: 0, max: 0, sample: [] },
	waveformRight: { min: 0, max: 0, sample: [] },
	audioContextState: 'unknown',
	nPoints: 0,
	isDragging: false,
	lastDragStartMs: 0,
	lastDragStopMs: 0,
	audioVersionAtDragStop: -1,
	silenceStartMs: 0,
	silenceEndMs: 0,
};
