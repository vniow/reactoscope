# ThreeProcessor Worklet Data Flow Analysis

## Overview

The ThreeProcessor worklet creates a bridge between Three.js visual coordinates and Web Audio API, converting animated 3D coordinate data into stereo audio output. This document explains the complete data flow from Three.js scene coordinates to audio output.

## Complete Data Flow Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│   Three.js      │    │  React Component │    │  AudioWorklet   │    │   Audio Output   │
│   Animation     │───▶│   Buffer Layer   │───▶│   Processor     │───▶│   (Speakers)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘    └──────────────────┘
   3D Coordinates      Buffering/Throttling     Audio Generation        Stereo Sound
```

## Detailed Data Flow Stages

### Stage 1: Three.js Coordinate Generation

**File: `ThreeWorkletNode.tsx` - `LineCoordinateTracker` component**

```typescript
// 1. Three.js animation loop generates moving coordinates
useFrame((state) => {
	const time = state.clock.getElapsedTime();
	const yOffset = Math.sin(time * 0.5) * 0.8; // Vertical sine wave movement

	LINE_POINTS.forEach((point) => {
		const movingPoint = point.clone();
		movingPoint.y += yOffset; // Apply vertical movement
		movingPoint.project(camera); // Convert 3D → 2D screen coordinates

		// Store NDC coordinates (-1 to +1 range)
		screenCoords.push(new Vector2(movingPoint.x, movingPoint.y));
	});
});
```

**Data Format at this stage:**

- Input: 3D world coordinates `Vector3(-1,0,0)`, `Vector3(0,0,0)`, `Vector3(1,0,0)`
- Output: 2D screen coordinates `Vector2[]` in NDC space (-1 to +1)
- Update Rate: ~60fps (every animation frame)

### Stage 2: React Component Buffer Management

**File: `ThreeWorkletNode.tsx` - `smoothAndBufferCoordinates` function**

```typescript
const smoothAndBufferCoordinates = useCallback(
	(newCoords: Vector2[]) => {
		// THROTTLING: Limit updates to 60fps (16ms intervals)
		if (
			now - lastUpdateTimeRef.current <
			COORDINATE_BUFFER_CONFIG.updateInterval
		) {
			return; // Skip this update
		}

		// FORMAT CONVERSION: Vector2 → CoordinatePoint
		const newPoints: CoordinatePoint[] = newCoords.map((coord) => ({
			x: coord.x,
			y: coord.y,
		}));

		// BUFFER MANAGEMENT: Add new points and maintain size limit
		coordinateBufferRef.current.push(...newPoints);

		// MEMORY MANAGEMENT: Trim buffer if too large (4096 max points)
		if (
			coordinateBufferRef.current.length >
			COORDINATE_BUFFER_CONFIG.maxBufferSize
		) {
			coordinateBufferRef.current = coordinateBufferRef.current.slice(
				-COORDINATE_BUFFER_CONFIG.maxBufferSize
			);
		}

		// WORKLET COMMUNICATION: Send coordinates to audio worklet
		setCoordinates([...coordinateBufferRef.current]);
	},
	[isReady, setCoordinates]
);
```

**Buffer Configuration:**

```typescript
const COORDINATE_BUFFER_CONFIG = {
	maxBufferSize: 4096, // Maximum coordinate points stored
	updateInterval: 16, // 16ms = ~60fps throttling
	smoothingFactor: 0.1, // Interpolation factor (0-1)
} as const;
```

**Data transformations:**

- Throttling: 60fps → 60fps (but with consistent timing)
- Format: `Vector2[]` → `CoordinatePoint[]`
- Buffering: Accumulates up to 4096 coordinate points
- Memory management: Circular buffer behavior

### Stage 3: Main Thread → AudioWorklet Communication

**File: `useThreeWorklet.ts` and `ThreeWorkletNode.ts`**

```typescript
// Main thread sends message to worklet
setCoordinates(coordinates: CoordinatePoint[]): this {
    if (this.isReady && this.workletNode) {
        this.workletNode.port.postMessage({
            type: 'coordinate-data',
            data: { coordinates }
        });
    }
    return this;
}
```

**Message Format:**

```javascript
{
    type: 'coordinate-data',
    data: {
        coordinates: [
            { x: -0.5, y: 0.8 },
            { x: 0.0, y: 0.2 },
            { x: 0.5, y: -0.3 },
            // ... up to 4096 points
        ]
    }
}
```

### Stage 4: AudioWorklet Data Processing

**File: `ThreeProcessor.worklet.ts` - `_onMessage` method**

```javascript
case 'coordinate-data':
    if (data && data.coordinates && Array.isArray(data.coordinates)) {
        // VALIDATION: Check each coordinate structure
        const flatCoords = [];
        for (const coord of data.coordinates) {
            if (coord && typeof coord.x === 'number' && typeof coord.y === 'number') {
                flatCoords.push(coord.x, coord.y); // Interleave: [x1,y1,x2,y2,x3,y3,...]
            }
        }

        // BUFFER UPDATE: Replace entire coordinate buffer
        if (flatCoords.length > 0) {
            this._coordinateBuffer = new Float32Array(flatCoords);
            this._bufferPosition = 0; // Reset playback position
            this._interpolationFactor = 0.0; // Reset interpolation
        }
    }
    break;
```

**Buffer Format in Worklet:**

```javascript
// Original format: [{ x: -0.5, y: 0.8 }, { x: 0.0, y: 0.2 }]
// Converted to: Float32Array([-0.5, 0.8, 0.0, 0.2])
//               Indices:      [0,   1,   2,   3  ]
//               Pairs:        [x1,  y1,  x2,  y2 ]
```

### Stage 5: Real-time Audio Generation

**File: `ThreeProcessor.worklet.ts` - `generate` method**

This is called by Web Audio API at 44.1kHz (44,100 times per second) for each channel:

```javascript
generate(_input, channel, params) {
    // EARLY EXIT: No audio if inactive or empty buffer
    if (!this._isActive || this._coordinateBuffer.length === 0) {
        return 0;
    }

    // PARAMETER PROCESSING: Extract and validate real-time parameters
    const volume = Math.max(0, Math.min(1, params.volume || 1));
    const playbackSpeed = Math.max(0.1, Math.min(4.0, params.playbackSpeed || 1.0));
    const swapChannels = (params.swapChannels || 0.0) > 0.5;
    const interpolationAmount = Math.max(0, Math.min(1, params.interpolationAmount || 0.5));

    // PLAYBACK POSITION UPDATE: Move through coordinate buffer over time
    this._interpolationFactor += playbackSpeed * 0.001;

    if (this._interpolationFactor >= 1.0) {
        this._bufferPosition += 2; // Move to next coordinate pair
        this._interpolationFactor = 0.0;

        // CIRCULAR BUFFER: Loop back to start
        if (this._bufferPosition >= this._coordinateBuffer.length) {
            this._bufferPosition = 0;
        }
    }

    // INTERPOLATION: Smooth transitions between coordinate points
    const currentIndex = this._bufferPosition;
    const nextIndex = (currentIndex + 2) % this._coordinateBuffer.length;
    const t = this._interpolationFactor * interpolationAmount;

    // CHANNEL ROUTING: Determine X or Y coordinate based on channel
    const useXCoord = swapChannels ? (channel === 1) : (channel === 0);

    let sample = 0;
    if (useXCoord) {
        // LEFT CHANNEL (or right if swapped): Use X coordinates
        const currentX = this._coordinateBuffer[currentIndex];     // Even indices
        const nextX = this._coordinateBuffer[nextIndex];
        sample = currentX + (nextX - currentX) * t; // Linear interpolation
    } else {
        // RIGHT CHANNEL (or left if swapped): Use Y coordinates
        const currentY = this._coordinateBuffer[currentIndex + 1]; // Odd indices
        const nextY = this._coordinateBuffer[nextIndex + 1];
        sample = currentY + (nextY - currentY) * t; // Linear interpolation
    }

    // FINAL PROCESSING: Apply volume and clamp to valid audio range
    return Math.max(-1, Math.min(1, sample * volume));
}
```

## Buffer Management Details

### 1. React Component Buffer (`coordinateBufferRef`)

- **Purpose**: Accumulate coordinate history for smoother playback
- **Size**: Up to 4096 coordinate points
- **Behavior**: Circular buffer (oldest data discarded when full)
- **Update Rate**: Throttled to 60fps (16ms intervals)

### 2. AudioWorklet Buffer (`_coordinateBuffer`)

- **Purpose**: Store coordinate data for real-time audio generation
- **Format**: `Float32Array` with interleaved x,y values
- **Access Pattern**: Sequential playback with interpolation
- **Update**: Complete replacement when new data arrives

### 3. Playback State Management

```javascript
// Worklet internal state
this._bufferPosition = 0; // Current index in coordinate buffer (0, 2, 4, 6...)
this._interpolationFactor = 0.0; // Progress between current and next point (0.0 - 1.0)
this._playbackSpeed = 1.0; // Speed multiplier for traversal
```

## Key Performance Optimizations

### 1. Throttling

- **Location**: React component level
- **Mechanism**: Time-based throttling (16ms intervals)
- **Benefit**: Prevents overwhelming the audio worklet with updates

### 2. Circular Buffer Playback

- **Location**: Audio worklet
- **Mechanism**: Modulo arithmetic for buffer indexing
- **Benefit**: Continuous audio without gaps or clicks

### 3. Linear Interpolation

- **Location**: Audio worklet `generate()` method
- **Mechanism**: Smooth transitions between coordinate points
- **Benefit**: Reduces audio artifacts from discrete coordinate jumps

### 4. Parameter Validation

- **Location**: Both React component and audio worklet
- **Mechanism**: Clamp values to valid ranges
- **Benefit**: Prevents audio distortion and crashes

## Real-time Parameter Control

The worklet supports real-time parameter automation:

```javascript
// Parameters updated at audio rate (44.1kHz)
static get parameterDescriptors() {
    return [
        { name: 'volume', defaultValue: 0.5, minValue: 0.0, maxValue: 1.0 },
        { name: 'playbackSpeed', defaultValue: 1.0, minValue: 0.1, maxValue: 4.0 },
        { name: 'swapChannels', defaultValue: 0.0, minValue: 0.0, maxValue: 1.0 },
        { name: 'interpolationAmount', defaultValue: 0.5, minValue: 0.0, maxValue: 1.0 }
    ];
}
```

These parameters can be automated using Tone.js `Param` objects, allowing smooth transitions and precise control.

## Summary

The ThreeProcessor worklet creates a sophisticated pipeline that:

1. **Captures** animated 3D coordinates from Three.js at 60fps
2. **Buffers** and throttles coordinate data in React component layer
3. **Transfers** coordinate arrays to AudioWorkletGlobalScope via postMessage
4. **Converts** coordinate data to interleaved Float32Array format
5. **Generates** stereo audio at 44.1kHz by traversing coordinates with interpolation
6. **Routes** X coordinates to one channel, Y coordinates to the other
7. **Applies** real-time parameter control (volume, speed, channel swap, interpolation)

This architecture enables smooth, glitch-free audio generation from visual coordinate data while maintaining high performance and real-time parameter control.

## Optimization: Frame-Synchronized Updates vs Timer-Based Throttling

### Current Implementation (Timer-Based)

The current implementation uses a separate timer to throttle coordinate updates:

```typescript
// CURRENT: Timer-based throttling in smoothAndBufferCoordinates
const now = Date.now();
if (now - lastUpdateTimeRef.current < COORDINATE_BUFFER_CONFIG.updateInterval) {
	return; // Skip this update - creates timing mismatch
}
```

**Issues with Timer-Based Approach:**

- **Timing Mismatch**: Three.js renders at variable framerates, but throttling is fixed at 16ms
- **Redundant Processing**: useFrame() generates coordinates that may be discarded by throttling
- **Frame Skipping**: May miss important animation frames or process stale data
- **Performance Overhead**: Separate timing logic adds computational cost

### Optimized Implementation (Frame-Synchronized)

**Step 1: Remove Timer-Based Throttling**
Instead of throttling in `smoothAndBufferCoordinates`, synchronize directly with Three.js frames:

```typescript
// OPTIMIZED: Remove timer-based throttling
const smoothAndBufferCoordinates = useCallback(
	(newCoords: Vector2[]) => {
		// Remove this throttling block:
		// if (now - lastUpdateTimeRef.current < COORDINATE_BUFFER_CONFIG.updateInterval) {
		//     return;
		// }

		// Early return for empty coordinates - defensive programming
		if (!newCoords?.length) return;

		try {
			// Convert Vector2 to CoordinatePoint format - type safety
			const newPoints: CoordinatePoint[] = newCoords.map((coord) => ({
				x: coord.x,
				y: coord.y,
			}));

			// Add to buffer
			coordinateBufferRef.current.push(...newPoints);

			// Trim buffer if it exceeds max size - memory management
			if (
				coordinateBufferRef.current.length >
				COORDINATE_BUFFER_CONFIG.maxBufferSize
			) {
				coordinateBufferRef.current = coordinateBufferRef.current.slice(
					-COORDINATE_BUFFER_CONFIG.maxBufferSize
				);
			}

			// Send updated coordinates to worklet if ready
			if (isReady && coordinateBufferRef.current.length > 0) {
				setCoordinates([...coordinateBufferRef.current]);
			}
		} catch (error) {
			console.error('Error in smoothAndBufferCoordinates:', error);
		}
	},
	[isReady, setCoordinates] // Remove lastUpdateTimeRef dependency
);
```

**Step 2: Add Frame-Rate Adaptive Throttling (Optional)**
If you still want to limit update frequency, you can add frame-based throttling:

```typescript
function LineCoordinateTracker({
	onCoordinatesUpdate,
}: LineCoordinateTrackerProps) {
	const { camera } = useThree();
	const frameCountRef = useRef(0);
	const FRAME_SKIP = 1; // Update every N frames (1 = every frame, 2 = every other frame)

	useFrame((state) => {
		// OPTIONAL: Frame-based throttling (more efficient than timer-based)
		frameCountRef.current++;
		if (frameCountRef.current % FRAME_SKIP !== 0) {
			return; // Skip this frame
		}

		try {
			const screenCoords: Vector2[] = [];
			const time = state.clock.getElapsedTime();
			const yOffset = Math.sin(time * 0.5) * 0.8;

			LINE_POINTS.forEach((point) => {
				const movingPoint = point.clone();
				movingPoint.y += yOffset;
				movingPoint.project(camera);
				screenCoords.push(new Vector2(movingPoint.x, movingPoint.y));
			});

			onCoordinatesUpdate(screenCoords);
		} catch (error) {
			console.error('Error in LineCoordinateTracker:', error);
		}
	});

	return null;
}
```

**Step 3: Dynamic Frame Rate Adaptation (Advanced)**
For even better performance, adapt to the actual frame rate:

```typescript
function LineCoordinateTracker({
	onCoordinatesUpdate,
}: LineCoordinateTrackerProps) {
	const { camera } = useThree();
	const lastUpdateTimeRef = useRef(0);
	const TARGET_UPDATE_RATE = 60; // Target updates per second
	const UPDATE_INTERVAL = 1000 / TARGET_UPDATE_RATE; // ~16.67ms

	useFrame((state) => {
		// ADAPTIVE: Sync with frame rate but limit to target update rate
		const currentTime = state.clock.getElapsedTime() * 1000; // Convert to milliseconds

		if (currentTime - lastUpdateTimeRef.current < UPDATE_INTERVAL) {
			return; // Skip this frame to maintain target update rate
		}

		lastUpdateTimeRef.current = currentTime;

		try {
			const screenCoords: Vector2[] = [];
			const time = state.clock.getElapsedTime();
			const yOffset = Math.sin(time * 0.5) * 0.8;

			LINE_POINTS.forEach((point) => {
				const movingPoint = point.clone();
				movingPoint.y += yOffset;
				movingPoint.project(camera);
				screenCoords.push(new Vector2(movingPoint.x, movingPoint.y));
			});

			onCoordinatesUpdate(screenCoords);
		} catch (error) {
			console.error('Error in LineCoordinateTracker:', error);
		}
	});

	return null;
}
```

### Performance Benefits of Frame-Synchronized Updates

1. **Perfect Synchronization**: Updates happen exactly when Three.js renders new frames
2. **No Wasted Computation**: Every coordinate calculation is used
3. **Adaptive Performance**: Automatically adjusts to device capabilities and load
4. **Reduced Latency**: Eliminates delay between visual update and audio update
5. **Cleaner Code**: Removes redundant timing logic

### Performance Comparison: Timer vs Frame-Synchronized

| Aspect                    | Timer-Based Throttling           | Frame-Synchronized Updates    |
| ------------------------- | -------------------------------- | ----------------------------- |
| **Timing Accuracy**       | Fixed 16ms intervals             | Synced with actual frame rate |
| **CPU Efficiency**        | Redundant timing checks          | Direct frame processing       |
| **Memory Usage**          | Coordinate data may be discarded | All coordinates are used      |
| **Latency**               | Up to 16ms delay                 | Immediate processing          |
| **Frame Rate Adaptation** | No                               | Automatic                     |
| **Code Complexity**       | Higher (timing logic)            | Lower (direct processing)     |

### Implementation Examples

#### Basic Frame-Synchronized (Recommended)

```typescript
// Update every frame - maximum responsiveness
<LineCoordinateTracker
    onCoordinatesUpdate={handleCoordinatesUpdate}
    frameSkip={1} // Every frame
/>
```

#### Performance-Optimized for Lower-End Devices

```typescript
// Update every other frame - 50% less processing
<LineCoordinateTracker
    onCoordinatesUpdate={handleCoordinatesUpdate}
    frameSkip={2} // Every 2nd frame
/>
```

#### Battery-Optimized for Mobile

```typescript
// Update every 3rd frame - 33% processing load
<LineCoordinateTracker
    onCoordinatesUpdate={handleCoordinatesUpdate}
    frameSkip={3} // Every 3rd frame
/>
```

The frame-synchronized approach provides better performance, lower latency, and cleaner code while maintaining perfect synchronization between visual and audio updates.

### Recommended Configuration Update

```typescript
// UPDATED: Frame-synchronized configuration
const COORDINATE_BUFFER_CONFIG = {
	maxBufferSize: 4096, // Keep same buffer size
	// Remove updateInterval - now synced with useFrame()
	smoothingFactor: 0.1, // Keep interpolation factor
	frameSkip: 1, // Optional: Update every N frames (1 = every frame)
} as const;
```

### Updated Data Flow with Frame Synchronization

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│   useFrame()    │    │  Coordinate      │    │  AudioWorklet   │    │   Audio Output   │
│   @60fps        │───▶│  Processing      │───▶│   Processor     │───▶│   (Speakers)     │
│   (no throttle) │    │  @60fps          │    │   @44.1kHz      │    │   @44.1kHz       │
└─────────────────┘    └──────────────────┘    └─────────────────┘    └──────────────────┘
   Frame-Synchronized     Direct Processing       Audio Generation        Stereo Sound
```

This optimization ensures that every Three.js animation frame is captured and converted to audio data without timing mismatches or unnecessary throttling.
