/**
 * XYRGB Analyzer Hook
 *
 * Creates and manages 5 Tone.js analyzers for X, Y, R, G, B audio inputs.
 * Provides real-time frequency/waveform data for visualization.
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import * as Tone from 'tone';

export interface XYRGBAnalyzerData {
	x: Float32Array;
	y: Float32Array;
	r: Float32Array;
	g: Float32Array;
	b: Float32Array;
}

export interface UseXYRGBAnalyzersOptions {
	/** FFT size for frequency analysis (default: 1024) */
	fftSize?: number;
	/** Analysis type: 'fft' for frequency, 'waveform' for time domain (default: 'waveform') */
	type?: 'fft' | 'waveform';
	/** Update rate in Hz (default: 60) */
	updateRate?: number;
}

export function useXYRGBAnalyzers(
	enabled: boolean = true,
	options: UseXYRGBAnalyzersOptions = {}
) {
	const { fftSize = 1024, type = 'waveform', updateRate = 60 } = options;

	// Analyzer instances
	const analyzersRef = useRef<{
		x: Tone.Analyser | null;
		y: Tone.Analyser | null;
		r: Tone.Analyser | null;
		g: Tone.Analyser | null;
		b: Tone.Analyser | null;
	}>({
		x: null,
		y: null,
		r: null,
		g: null,
		b: null,
	});

	// Current analyzer data
	const [analyzerData, setAnalyzerData] = useState<XYRGBAnalyzerData>({
		x: new Float32Array(fftSize / 2),
		y: new Float32Array(fftSize / 2),
		r: new Float32Array(fftSize / 2),
		g: new Float32Array(fftSize / 2),
		b: new Float32Array(fftSize / 2),
	});

	// Animation frame for updates
	const animationFrameRef = useRef<number | undefined>(undefined);
	const lastUpdateRef = useRef<number>(0);

	// Track initialization state
	const [isInitialized, setIsInitialized] = useState<boolean>(false);

	// Initialize analyzers
	useEffect(() => {
		if (!enabled) return;

		const channels = ['x', 'y', 'r', 'g', 'b'] as const;
		let needsInitialization = false;

		channels.forEach((channel) => {
			if (!analyzersRef.current[channel]) {
				analyzersRef.current[channel] = new Tone.Analyser({
					type,
					size: fftSize,
				});
				needsInitialization = true;
			}
		});

		// Mark as initialized only if we actually created new analyzers
		if (needsInitialization) {
			setIsInitialized(true);
		}

		// Start update loop
		const updateAnalyzerData = (timestamp: number) => {
			if (timestamp - lastUpdateRef.current >= 1000 / updateRate) {
				const newData: XYRGBAnalyzerData = {
					x:
						(analyzersRef.current.x?.getValue() as Float32Array) ||
						new Float32Array(fftSize / 2),
					y:
						(analyzersRef.current.y?.getValue() as Float32Array) ||
						new Float32Array(fftSize / 2),
					r:
						(analyzersRef.current.r?.getValue() as Float32Array) ||
						new Float32Array(fftSize / 2),
					g:
						(analyzersRef.current.g?.getValue() as Float32Array) ||
						new Float32Array(fftSize / 2),
					b:
						(analyzersRef.current.b?.getValue() as Float32Array) ||
						new Float32Array(fftSize / 2),
				};

				setAnalyzerData(newData);
				lastUpdateRef.current = timestamp;
			}

			if (enabled) {
				animationFrameRef.current = requestAnimationFrame(updateAnalyzerData);
			}
		};

		animationFrameRef.current = requestAnimationFrame(updateAnalyzerData);

		return () => {
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
		};
	}, [enabled, fftSize, type, updateRate]);

	// Get analyzer input nodes for audio connections (memoized for stable references)
	const analyzers = useMemo(() => {
		if (!isInitialized) {
			return {
				x: null,
				y: null,
				r: null,
				g: null,
				b: null,
			};
		}
		return {
			x: analyzersRef.current.x,
			y: analyzersRef.current.y,
			r: analyzersRef.current.r,
			g: analyzersRef.current.g,
			b: analyzersRef.current.b,
		};
	}, [isInitialized]);

	// Cleanup on unmount
	useEffect(() => {
		const currentAnalyzers = analyzersRef.current;
		return () => {
			Object.values(currentAnalyzers).forEach((analyzer) => {
				if (analyzer) {
					analyzer.dispose();
				}
			});
		};
	}, []);

	return {
		analyzerData,
		analyzers,
		isReady:
			enabled &&
			isInitialized &&
			Object.values(analyzersRef.current).every(
				(analyzer) => analyzer !== null
			),
	};
}
