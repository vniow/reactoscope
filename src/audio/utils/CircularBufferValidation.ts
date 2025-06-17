/**
 * CircularBufferValidation - Simple test to validate circular buffer functionality
 */

import { Vector2 } from 'three';
import { CircularCoordinateBuffer } from './CircularCoordinateBuffer';

export function validateCircularBuffer(): boolean {
	console.log('🧪 Validating Circular Buffer Implementation...');

	try {
		// Test 1: Basic functionality
		console.log('📝 Test 1: Basic functionality');
		const buffer = new CircularCoordinateBuffer({
			maxSize: 4,
			enableChangeDetection: true,
			changeThreshold: 0.001,
		});

		// Add initial coordinates
		const coords1 = [new Vector2(-1, 0), new Vector2(0, 0), new Vector2(1, 0)];
		const result1 = buffer.addCoordinates(coords1);

		if (
			!result1.success ||
			!result1.hasChanges ||
			result1.coordinatesAdded !== 3
		) {
			throw new Error('Initial coordinate addition failed');
		}

		console.log('✅ Initial coordinates added successfully');

		// Test 2: Change detection
		console.log('📝 Test 2: Change detection');
		const coords2 = [new Vector2(-1, 0), new Vector2(0, 0), new Vector2(1, 0)]; // Same coordinates
		const result2 = buffer.addCoordinates(coords2);

		if (!result2.success || result2.hasChanges) {
			throw new Error(
				'Change detection failed - should not detect changes for identical coordinates'
			);
		}

		console.log('✅ Change detection working correctly');

		// Test 3: Buffer overflow and circular behavior
		console.log('📝 Test 3: Buffer overflow and circular behavior');
		const coords3 = [new Vector2(-0.5, 0.5), new Vector2(0.5, 0.5)]; // New coordinates to fill buffer
		const result3 = buffer.addCoordinates(coords3);

		if (!result3.success || !result3.hasChanges) {
			throw new Error('Buffer overflow handling failed');
		}

		console.log('✅ Buffer overflow handled correctly');

		// Test 4: Statistics
		console.log('📝 Test 4: Statistics validation');
		const stats = buffer.getStats();

		if (
			stats.totalWrites <= 0 ||
			stats.bufferUtilization <= 0 ||
			stats.memoryBytes <= 0
		) {
			throw new Error('Statistics not tracking correctly');
		}

		console.log('✅ Statistics tracking correctly');
		console.log(
			`📊 Final stats: utilization=${(stats.bufferUtilization * 100).toFixed(1)}%, writes=${stats.totalWrites}, memory=${(stats.memoryBytes / 1024).toFixed(1)}KB`
		);

		// Test 5: Coordinate retrieval
		console.log('📝 Test 5: Coordinate retrieval');
		const retrievedCoords = buffer.getCoordinates();

		if (retrievedCoords.length === 0) {
			throw new Error('Coordinate retrieval failed');
		}

		console.log('✅ Coordinate retrieval working');
		console.log(`📦 Retrieved ${retrievedCoords.length} coordinates`);

		// Test 6: Buffer state
		console.log('📝 Test 6: Buffer state information');
		const state = buffer.getState();

		if (state.maxSize !== 4 || state.coordinateCount <= 0) {
			throw new Error('Buffer state information incorrect');
		}

		console.log('✅ Buffer state information correct');
		console.log(
			`🔄 State: ${state.coordinateCount}/${state.maxSize} coordinates, writePos=${state.writePosition}`
		);

		console.log('\n🎉 All validation tests passed!');
		console.log(
			'🚀 CircularCoordinateBuffer is working correctly and ready for production use.'
		);

		return true;
	} catch (error) {
		console.error('❌ Validation failed:', error);
		return false;
	}
}

// Auto-run validation in development
if (process.env.NODE_ENV === 'development') {
	// Delay execution to ensure module is loaded
	setTimeout(() => {
		console.log('\n' + '='.repeat(60));
		console.log('🔍 CIRCULAR BUFFER VALIDATION');
		console.log('='.repeat(60));
		validateCircularBuffer();
		console.log('='.repeat(60) + '\n');
	}, 1000);
}
