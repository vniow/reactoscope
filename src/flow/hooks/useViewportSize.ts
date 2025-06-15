/**
 * useViewportSize.ts
 * Custom hook to get viewport size and maintain a square aspect ratio
 */
import { useState, useEffect } from 'react';

interface ViewportSize {
	width: number;
	height: number;
	squareSize: number;
}

export function useViewportSize(): ViewportSize {
	const [size, setSize] = useState<ViewportSize>({
		width: window.innerWidth,
		height: window.innerHeight,
		squareSize: calculateSquareSize(window.innerWidth),
	});

	function calculateSquareSize(windowWidth: number): number {
		// Make the square size half the viewport width, but with a max size
		return Math.min(windowWidth * 0.5, 800);
	}

	useEffect(() => {
		function updateSize() {
			const width = window.innerWidth;
			const squareSize = calculateSquareSize(width);

			setSize({
				width,
				height: window.innerHeight,
				squareSize,
			});
		}

		window.addEventListener('resize', updateSize);
		updateSize(); // Initial calculation

		return () => window.removeEventListener('resize', updateSize);
	}, []);

	return size;
}
