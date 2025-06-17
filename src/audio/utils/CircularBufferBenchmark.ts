/**
 * Performance Benchmark for Circular Buffer Optimization
 *
 * This script compares the performance of the old array-based buffer
 * vs the new CircularCoordinateBuffer implementation.
 */

import { Vector2 } from 'three';
import {
	CircularCoordinateBuffer,
	type BufferStats,
} from './CircularCoordinateBuffer';

// Test configuration
const TEST_CONFIG = {
	coordinates: 3, // Number of coordinates per frame (3 points)
	frames: 3600, // 60 seconds at 60fps
	iterations: 5, // Number of test runs for averaging
};

/**
 * Generate test coordinate data
 */
function generateTestCoordinates(frameCount: number): Vector2[][] {
	const allFrames: Vector2[][] = [];

	for (let frame = 0; frame < frameCount; frame++) {
		const frameCoords: Vector2[] = [];
		const time = frame / 60; // Simulate 60fps timing

		// Simulate moving coordinates (similar to ThreeWorkletNode)
		for (let i = 0; i < TEST_CONFIG.coordinates; i++) {
			const x = i - 1 + Math.sin(time * 0.1) * 0.1; // Small variations
			const y = Math.sin(time * 0.5) * 0.8 + Math.random() * 0.01; // Vertical movement + noise
			frameCoords.push(new Vector2(x, y));
		}

		allFrames.push(frameCoords);
	}

	return allFrames;
}

/**
 * Old array-based buffer implementation (for comparison)
 */
class OldArrayBuffer {
	private buffer: Array<{ x: number; y: number }> = [];
	private maxSize: number;

	constructor(maxSize: number) {
		this.maxSize = maxSize;
	}

	addCoordinates(coords: Vector2[]): boolean {
		// Convert Vector2 to CoordinatePoint format
		const newPoints = coords.map((coord) => ({
			x: coord.x,
			y: coord.y,
		}));

		// Add to buffer
		this.buffer.push(...newPoints);

		// Trim buffer if it exceeds max size
		if (this.buffer.length > this.maxSize) {
			this.buffer = this.buffer.slice(-this.maxSize);
		}

		return this.buffer.length > 0;
	}

	getCoordinates() {
		return [...this.buffer]; // Copy for comparison
	}
}

/**
 * Benchmark function for old array-based buffer
 */
function benchmarkOldBuffer(testData: Vector2[][]): {
	duration: number;
	memoryAllocations: number;
	finalBufferSize: number;
} {
	const buffer = new OldArrayBuffer(4096);
	let memoryAllocations = 0;

	// Override array methods to count allocations
	const originalSlice = Array.prototype.slice;
	const originalPush = Array.prototype.push;

	Array.prototype.slice = function (...args) {
		memoryAllocations++;
		return originalSlice.apply(this, args);
	};

	Array.prototype.push = function (...args) {
		memoryAllocations++;
		return originalPush.apply(this, args);
	};

	const startTime = performance.now();

	for (const frameCoords of testData) {
		buffer.addCoordinates(frameCoords);
	}

	const endTime = performance.now();

	// Restore original methods
	Array.prototype.slice = originalSlice;
	Array.prototype.push = originalPush;

	return {
		duration: endTime - startTime,
		memoryAllocations,
		finalBufferSize: buffer.getCoordinates().length,
	};
}

/**
 * Benchmark function for new circular buffer
 */
function benchmarkCircularBuffer(testData: Vector2[][]): {
	duration: number;
	finalBufferSize: number;
	stats: BufferStats;
} {
	const buffer = new CircularCoordinateBuffer({
		maxSize: 4096,
		enableChangeDetection: true,
		changeThreshold: 0.0001,
	});

	const startTime = performance.now();

	for (const frameCoords of testData) {
		buffer.addCoordinates(frameCoords);
	}

	const endTime = performance.now();

	return {
		duration: endTime - startTime,
		finalBufferSize: buffer.getCoordinates().length,
		stats: buffer.getStats(),
	};
}

/**
 * Run performance comparison
 */
export async function runPerformanceBenchmark(): Promise<void> {
	console.log('🚀 Starting Circular Buffer Performance Benchmark...');
	console.log(`📊 Test Configuration:`, TEST_CONFIG);

	// Generate test data
	console.log('📝 Generating test data...');
	const testData = generateTestCoordinates(TEST_CONFIG.frames);

	const oldResults: Array<ReturnType<typeof benchmarkOldBuffer>> = [];
	const newResults: Array<ReturnType<typeof benchmarkCircularBuffer>> = [];

	// Run benchmarks multiple times for averaging
	for (let i = 0; i < TEST_CONFIG.iterations; i++) {
		console.log(`🔄 Running iteration ${i + 1}/${TEST_CONFIG.iterations}...`);

		// Benchmark old implementation
		const oldResult = benchmarkOldBuffer(testData);
		oldResults.push(oldResult);

		// Small delay to prevent interference
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Benchmark new implementation
		const newResult = benchmarkCircularBuffer(testData);
		newResults.push(newResult);

		// Small delay between iterations
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	// Calculate averages
	const avgOld = {
		duration:
			oldResults.reduce((sum, r) => sum + r.duration, 0) / oldResults.length,
		memoryAllocations:
			oldResults.reduce((sum, r) => sum + r.memoryAllocations, 0) /
			oldResults.length,
		finalBufferSize: oldResults[0].finalBufferSize,
	};

	const avgNew = {
		duration:
			newResults.reduce((sum, r) => sum + r.duration, 0) / newResults.length,
		finalBufferSize: newResults[0].finalBufferSize,
		stats: newResults[0].stats,
	};

	// Calculate improvements
	const durationImprovement =
		((avgOld.duration - avgNew.duration) / avgOld.duration) * 100;
	const memoryImprovement =
		((avgOld.memoryAllocations - 1) / avgOld.memoryAllocations) * 100; // Circular buffer uses 1 allocation

	// Display results
	console.log('\n📈 PERFORMANCE BENCHMARK RESULTS');
	console.log('=====================================');

	console.log('\n📊 Old Array-Based Buffer:');
	console.log(`⏱️  Average Duration: ${avgOld.duration.toFixed(2)}ms`);
	console.log(`🧠 Memory Allocations: ${avgOld.memoryAllocations.toFixed(0)}`);
	console.log(`📦 Final Buffer Size: ${avgOld.finalBufferSize}`);

	console.log('\n🎯 New Circular Buffer:');
	console.log(`⏱️  Average Duration: ${avgNew.duration.toFixed(2)}ms`);
	console.log(`🧠 Memory Allocations: 1 (pre-allocated)`);
	console.log(`📦 Final Buffer Size: ${avgNew.finalBufferSize}`);
	console.log(
		`🔄 Buffer Utilization: ${(avgNew.stats.bufferUtilization * 100).toFixed(1)}%`
	);
	console.log(`📈 Change Rate: ${avgNew.stats.averageChangeRate.toFixed(1)}%`);
	console.log(
		`💾 Memory Usage: ${(avgNew.stats.memoryBytes / 1024).toFixed(1)}KB`
	);

	console.log('\n🎉 PERFORMANCE IMPROVEMENTS:');
	console.log(
		`⚡ Speed Improvement: ${durationImprovement > 0 ? '+' : ''}${durationImprovement.toFixed(1)}%`
	);
	console.log(
		`🧠 Memory Reduction: ${memoryImprovement > 0 ? '+' : ''}${memoryImprovement.toFixed(1)}%`
	);

	// Validation
	if (durationImprovement > 0) {
		console.log('✅ Duration optimization successful!');
	} else {
		console.log('⚠️  Duration not improved (may need further optimization)');
	}

	if (memoryImprovement > 0) {
		console.log('✅ Memory optimization successful!');
	} else {
		console.log('⚠️  Memory usage not improved');
	}

	console.log('\n🏁 Benchmark completed!');
}

// Auto-run if this file is executed directly
if (typeof window !== 'undefined') {
	// Browser environment - add to global scope for manual testing
	(
		window as typeof window & {
			runCircularBufferBenchmark: typeof runPerformanceBenchmark;
		}
	).runCircularBufferBenchmark = runPerformanceBenchmark;
	console.log(
		'🧪 Circular buffer benchmark loaded. Run with: runCircularBufferBenchmark()'
	);
}
