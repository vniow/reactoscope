# Reactoscope XYscope Optimization Plan

## Overview: XYscope → Reactoscope Architecture Mapping

| XYscope Component       | Reactoscope Equivalent      | Status         |
| ----------------------- | --------------------------- | -------------- |
| p5.js Graphics          | Three.js Scene              | ✅ Implemented |
| Coordinate Arrays       | Vertex Data Arrays          | ✅ Implemented |
| VectorProcessor Worklet | XYRGBInterpolator Worklet   | ✅ Optimized   |
| 2-Channel Audio (X,Y)   | 5-Channel Audio (X,Y,R,G,B) | ✅ Enhanced    |
| XXY Oscilloscope        | XYRGBScope3D                | ✅ Implemented |
| Audio Filtering         | RC Filter Implementation    | ✅ Just Added  |
| Amplitude Control       | Per-Channel Scaling         | ✅ Just Added  |

## Key XYscope Patterns Successfully Adapted

### 1. **Sequential Array Traversal** ✅

```javascript
// XYscope Pattern:
const indexIncrement = frequency / sampleRate;
let index = (index + indexIncrement) % 1;
const arrayIndex = Math.floor(index * coords.length);

// Reactoscope Implementation:
const vertexIndex =
	Math.floor(this._index * this._vertices.length) % this._vertices.length;
this._index += indexIncrement;
```

### 2. **Audio Filtering** ✅

```javascript
// XYscope RC Low-Pass:
const alpha = dt / (rc + dt);
filtered = filtered + alpha * (input - filtered);

// Reactoscope Implementation:
const rc = 1.0 / (2.0 * Math.PI * this._lowPassFreq);
const alpha = dt / (rc + dt);
this._filterState.lowPass.x +=
	alpha * (filtered.x - this._filterState.lowPass.x);
```

### 3. **Amplitude Scaling** ✅

```javascript
// XYscope Pattern:
rawLeftValue = coords[index] * amplitude.x;

// Reactoscope Implementation:
x: currentVertex.screen.x * this._amplitude.x,
y: currentVertex.screen.y * this._amplitude.y,
r: currentVertex.color.r * this._amplitude.r,
```

## 🔥 Advanced Optimizations to Implement

### 1. **Buffer Management Optimization**

XYscope uses efficient buffer reuse. Let's optimize Reactoscope's vertex buffer handling:

```typescript
// Current: Creating new arrays each time
this._vertices = [...vertices];

// Optimized: Pre-allocated buffers with efficient copying
class VertexBuffer {
	private _buffer: Float32Array;
	private _capacity: number;
	private _length: number;

	updateVertices(vertices: VertexInfo[]) {
		// Resize buffer if needed
		if (vertices.length > this._capacity) {
			this._buffer = new Float32Array(vertices.length * 5); // x,y,r,g,b
			this._capacity = vertices.length;
		}

		// Efficient flat array copy
		for (let i = 0; i < vertices.length; i++) {
			const offset = i * 5;
			this._buffer[offset] = vertices[i].screen.x;
			this._buffer[offset + 1] = vertices[i].screen.y;
			this._buffer[offset + 2] = vertices[i].color.r;
			this._buffer[offset + 3] = vertices[i].color.g;
			this._buffer[offset + 4] = vertices[i].color.b;
		}
		this._length = vertices.length;
	}
}
```

### 2. **Coordinate Normalization & Mapping**

XYscope constrains values to [-1,1]. Let's add proper coordinate mapping:

```typescript
// Add to worklet processor
_normalizeCoordinates(vertex: VertexInfo) {
  return {
    // Map screen coordinates to [-1,1] range
    x: Math.max(-1, Math.min(1, vertex.screen.x * 2 - 1)),
    y: Math.max(-1, Math.min(1, vertex.screen.y * 2 - 1)),
    // Ensure colors are in [0,1] range
    r: Math.max(0, Math.min(1, vertex.color.r)),
    g: Math.max(0, Math.min(1, vertex.color.g)),
    b: Math.max(0, Math.min(1, vertex.color.b)),
  };
}
```

### 3. **Advanced Interpolation (XYscope-style)**

XYscope has sophisticated interpolation. Let's enhance Reactoscope's:

```typescript
// Bezier interpolation for smooth curves
_bezierInterpolation(v1: VertexInfo, v2: VertexInfo, v3: VertexInfo, v4: VertexInfo, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;

  // Cubic Bezier formula
  const w1 = (1 - t3);
  const w2 = 3 * t * (1 - t2);
  const w3 = 3 * t2 * (1 - t);
  const w4 = t3;

  return {
    x: v1.screen.x * w1 + v2.screen.x * w2 + v3.screen.x * w3 + v4.screen.x * w4,
    y: v1.screen.y * w1 + v2.screen.y * w2 + v3.screen.y * w3 + v4.screen.y * w4,
    r: v1.color.r * w1 + v2.color.r * w2 + v3.color.r * w3 + v4.color.r * w4,
    g: v1.color.g * w1 + v2.color.g * w2 + v3.color.g * w3 + v4.color.g * w4,
    b: v1.color.b * w1 + v2.color.b * w2 + v3.color.b * w3 + v4.color.b * w4,
  };
}
```

### 4. **Gap Insertion (XYscope Pattern)**

XYscope inserts gaps between shapes for better visualization:

```typescript
// Add gap insertion between disconnected vertices
_insertGaps(vertices: VertexInfo[], gapSize: number = 1): VertexInfo[] {
  const result: VertexInfo[] = [];

  for (let i = 0; i < vertices.length; i++) {
    result.push(vertices[i]);

    // Check if next vertex is disconnected (large distance)
    if (i < vertices.length - 1) {
      const dist = Math.sqrt(
        Math.pow(vertices[i+1].screen.x - vertices[i].screen.x, 2) +
        Math.pow(vertices[i+1].screen.y - vertices[i].screen.y, 2)
      );

      if (dist > 0.1) { // Threshold for gap insertion
        // Insert gap points
        for (let g = 0; g < gapSize; g++) {
          result.push({
            screen: { x: 0, y: 0 }, // Move to center for gap
            color: { r: 0, g: 0, b: 0 }, // Black for gap
          });
        }
      }
    }
  }

  return result;
}
```

## 🎨 Visual Processing Enhancements

### 1. **Three.js Scene Optimization**

Optimize vertex extraction for better performance:

```typescript
// Efficient vertex collection with spatial sorting
function optimizedVertexExtraction(scene: THREE.Scene): VertexInfo[] {
	const vertices: VertexInfo[] = [];

	scene.traverse((object) => {
		if (object instanceof THREE.Mesh && object.geometry) {
			const geometry = object.geometry;
			const position = geometry.attributes.position;
			const color = geometry.attributes.color;

			// Use typed arrays for efficiency
			const positions = position.array as Float32Array;
			const colors = color?.array as Float32Array;

			for (let i = 0; i < positions.length; i += 3) {
				// Transform to screen space
				const worldPos = new THREE.Vector3(
					positions[i],
					positions[i + 1],
					positions[i + 2]
				);
				object.localToWorld(worldPos);

				// Project to screen coordinates
				const screenPos = worldPos.project(camera);

				vertices.push({
					screen: {
						x: (screenPos.x + 1) * 0.5, // [-1,1] to [0,1]
						y: (screenPos.y + 1) * 0.5,
					},
					color: {
						r: colors ? colors[i] : 1,
						g: colors ? colors[i + 1] : 1,
						b: colors ? colors[i + 2] : 1,
					},
				});
			}
		}
	});

	return vertices;
}
```

### 2. **Frequency-Based Channel Separation**

Like XYscope's independent X/Y frequencies, add per-channel frequency control:

```typescript
// In worklet processor
process(inputs, outputs, parameters) {
  const frameCount = outputs[0][0].length;

  // Independent frequency control per channel (XYscope style)
  const freqX = this._frequency.x || this._frequency;
  const freqY = this._frequency.y || this._frequency;
  const freqR = this._frequency.r || this._frequency;
  const freqG = this._frequency.g || this._frequency;
  const freqB = this._frequency.b || this._frequency;

  // Independent index increments
  const incX = freqX / sampleRate;
  const incY = freqY / sampleRate;
  const incR = freqR / sampleRate;
  const incG = freqG / sampleRate;
  const incB = freqB / sampleRate;

  for (let i = 0; i < frameCount; i++) {
    // Sample different vertices for each channel
    const vertexX = this._vertices[Math.floor(this._indexX * this._vertices.length) % this._vertices.length];
    const vertexY = this._vertices[Math.floor(this._indexY * this._vertices.length) % this._vertices.length];
    // ... etc for R, G, B

    // Update indices independently
    this._indexX = (this._indexX + incX) % 1;
    this._indexY = (this._indexY + incY) % 1;
    // ... etc
  }
}
```

## 🔊 Audio Processing Enhancements

### 1. **Dynamic Range Compression**

XYscope has built-in dynamics control:

```typescript
// Add compressor to audio chain
class AudioCompressor {
	private _threshold: number = -12; // dB
	private _ratio: number = 4;
	private _attack: number = 0.003; // seconds
	private _release: number = 0.1; // seconds

	process(input: number, sampleRate: number): number {
		// Simple compressor algorithm
		const inputLevel = 20 * Math.log10(Math.abs(input));

		if (inputLevel > this._threshold) {
			const excess = inputLevel - this._threshold;
			const compressedExcess = excess / this._ratio;
			const targetLevel = this._threshold + compressedExcess;
			const gainReduction = targetLevel - inputLevel;

			return input * Math.pow(10, gainReduction / 20);
		}

		return input;
	}
}
```

### 2. **Anti-Aliasing Filter**

Prevent aliasing in high-frequency content:

```typescript
// Add anti-aliasing filter before output
_antiAliasFilter(value: number, channel: string): number {
  const nyquist = sampleRate / 2;
  const cutoff = nyquist * 0.45; // Anti-aliasing at 45% of Nyquist

  // Simple butterworth low-pass
  const rc = 1.0 / (2.0 * Math.PI * cutoff);
  const dt = 1.0 / sampleRate;
  const alpha = dt / (rc + dt);

  this._antiAliasState[channel] += alpha * (value - this._antiAliasState[channel]);
  return this._antiAliasState[channel];
}
```

## 🎯 Implementation Priority

### Phase 1: Core Optimizations ✅ DONE

- [x] Audio filtering implementation
- [x] Amplitude control
- [x] Enhanced worklet processing
- [x] UI controls for filters

### Phase 2: Buffer & Performance 🔄 NEXT

1. Implement efficient vertex buffer management
2. Add coordinate normalization
3. Optimize Three.js vertex extraction

### Phase 3: Advanced Features 🔮 FUTURE

1. Multi-frequency channel control
2. Gap insertion for better visualization
3. Advanced interpolation methods
4. Audio dynamics processing

## 🚀 Immediate Next Steps

1. **Test Current Optimizations**: Verify the filtering and amplitude controls work
2. **Buffer Optimization**: Implement efficient vertex buffer management
3. **Coordinate Mapping**: Add proper [-1,1] normalization
4. **Performance Profiling**: Measure worklet performance improvements

---

_This plan transforms Reactoscope into a powerful XYscope-inspired system while maintaining the advantages of Three.js and Tone.js architecture._
