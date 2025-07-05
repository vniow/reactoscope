# Reactoscope ↔ XYscope Adaptation Plan

## 🎯 Executive Summary

This plan outlines how to adapt XYscope.js patterns to Reactoscope while preserving the working Three.js/Tone.js architecture. The goal is to enhance performance and add XYscope-inspired features without breaking the existing triangle visualization.

## 🔍 Current State Analysis

### ✅ What's Working in Reactoscope

- **Three.js Scene**: RGB triangle with vertex color data
- **Scene Traversal**: Extracts vertex data from 3D geometry
- **Basic Audio Generation**: 5-channel output (X, Y, R, G, B)
- **XYRGBScope3D**: Real-time visualization of audio signals
- **Tone.js Integration**: Audio node management and routing

### ❌ What Got Broken by Recent Optimizations

- **Multiple Artifacts**: Complex buffer management causing rendering issues
- **Wrong Positioning**: Coordinate normalization conflicts
- **Distorted Shape**: Independent channel sampling breaking synchronization
- **Performance Issues**: Over-engineered worklet processing

### 🎯 Target XYscope Patterns to Adapt

- **Efficient Array Traversal**: Simple frequency-based indexing
- **Audio Filtering**: RC low-pass and high-pass filters
- **Amplitude Control**: Per-channel signal scaling
- **Coordinate Mapping**: Proper [-1,1] audio range
- **Gap Insertion**: Visual separation between shapes
- **Performance Optimization**: Minimal worklet overhead

## 📋 Implementation Phases

### Phase 1: 🚨 **IMMEDIATE - Restore Working State**

**Priority**: Fix current rendering issues

#### 1.1 Revert Worklet to Simple Implementation

```typescript
// Target: Simple, working XYscope-style processing
class XYRGBInterpolatorProcessor extends AudioWorkletProcessor {
	constructor(options) {
		super(options);
		this._isActive = false;
		this._vertices = [];
		this._index = 0;
		this._frequency = 30;
		this._smoothing = 0.1;
		// Remove complex buffer management, channel separation, etc.
	}

	process(inputs, outputs, parameters) {
		if (!this._isActive || this._vertices.length === 0) return true;

		const [xChannel, yChannel, rChannel, gChannel, bChannel] = outputs[0];
		const frameCount = xChannel.length;
		const indexIncrement = this._frequency / sampleRate;

		for (let i = 0; i < frameCount; i++) {
			// Simple vertex sampling - all channels from SAME vertex
			const vertexIndex =
				Math.floor(this._index * this._vertices.length) % this._vertices.length;
			const vertex = this._vertices[vertexIndex];

			// Direct output without complex filtering/buffering
			xChannel[i] = vertex.screen.x;
			yChannel[i] = vertex.screen.y;
			rChannel[i] = vertex.color.r;
			gChannel[i] = vertex.color.g;
			bChannel[i] = vertex.color.b;

			this._index = (this._index + indexIncrement) % 1;
		}
		return true;
	}
}
```

#### 1.2 Remove Complex Features Temporarily

- ❌ Independent channel frequencies
- ❌ Complex buffer management
- ❌ Gap insertion
- ❌ Advanced filtering
- ❌ Coordinate normalization [-1,1]

#### 1.3 Validate Triangle Rendering

- Ensure triangle appears correctly in scope
- Verify colors are properly mapped
- Check that shape is stable and positioned correctly

### Phase 2: 🎨 **XYscope Pattern Integration**

**Priority**: Add XYscope features incrementally

#### 2.1 Coordinate Mapping (XYscope Pattern)

```typescript
// XYscope uses [-1, 1] audio range for better oscilloscope visualization
_mapCoordinates(vertex) {
  return {
    x: vertex.screen.x * 2 - 1,  // [0,1] → [-1,1]
    y: vertex.screen.y * 2 - 1,  // [0,1] → [-1,1]
    r: vertex.color.r,           // Keep [0,1] for colors
    g: vertex.color.g,
    b: vertex.color.b,
  };
}
```

#### 2.2 Audio Filtering (XYscope RC Filters)

```typescript
// Add simple RC low-pass filter
_applyLowPass(input, cutoff, sampleRate) {
  const rc = 1.0 / (2.0 * Math.PI * cutoff);
  const dt = 1.0 / sampleRate;
  const alpha = dt / (rc + dt);

  this._filterState += alpha * (input - this._filterState);
  return this._filterState;
}
```

#### 2.3 Amplitude Control (XYscope Pattern)

```typescript
// Per-channel amplitude scaling
const amplitude = { x: 1.0, y: 1.0, r: 1.0, g: 1.0, b: 1.0 };

// In process loop:
xChannel[i] = vertex.screen.x * amplitude.x;
yChannel[i] = vertex.screen.y * amplitude.y;
// etc.
```

### Phase 3: 🚀 **Performance Optimization**

**Priority**: XYscope-inspired performance patterns

#### 3.1 Efficient Vertex Buffer (XYscope Pattern)

```typescript
// Pre-allocated Float32Array for efficiency
class VertexBuffer {
	constructor() {
		this._buffer = new Float32Array(0);
		this._length = 0;
	}

	update(vertices) {
		// Resize only when needed
		const requiredSize = vertices.length * 5; // x,y,r,g,b
		if (this._buffer.length < requiredSize) {
			this._buffer = new Float32Array(requiredSize);
		}

		// Flat copy for cache efficiency
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

#### 3.2 Three.js Scene Optimization

```typescript
// Efficient vertex extraction (inspired by XYscope's coordinate collection)
function extractVerticesOptimized(scene: THREE.Scene): VertexInfo[] {
	const vertices: VertexInfo[] = [];
	const tempVector = new THREE.Vector3();

	scene.traverse((object) => {
		if (object instanceof THREE.Mesh && object.visible) {
			const geometry = object.geometry;
			const position = geometry.attributes.position;
			const color = geometry.attributes.color;

			// Direct typed array access for performance
			const positions = position.array as Float32Array;
			const colors = color?.array as Float32Array;

			for (let i = 0; i < positions.length; i += 3) {
				// Efficient world transform
				tempVector.set(positions[i], positions[i + 1], positions[i + 2]);
				object.localToWorld(tempVector);

				// Project to screen space
				const screenPos = tempVector.project(camera);

				vertices.push({
					screen: {
						x: (screenPos.x + 1) * 0.5, // [-1,1] → [0,1]
						y: (screenPos.y + 1) * 0.5,
					},
					color: {
						r: colors ? colors[i] : 1.0,
						g: colors ? colors[i + 1] : 1.0,
						b: colors ? colors[i + 2] : 1.0,
					},
				});
			}
		}
	});

	return vertices;
}
```

### Phase 4: 🎵 **Advanced XYscope Features**

**Priority**: Optional enhancements

#### 4.1 Gap Insertion (XYscope Pattern)

```typescript
// Insert gaps between disconnected geometry
_insertGaps(vertices: VertexInfo[], threshold: number = 0.1): VertexInfo[] {
  const result: VertexInfo[] = [];

  for (let i = 0; i < vertices.length; i++) {
    result.push(vertices[i]);

    if (i < vertices.length - 1) {
      const current = vertices[i];
      const next = vertices[i + 1];

      // Calculate distance
      const dx = next.screen.x - current.screen.x;
      const dy = next.screen.y - current.screen.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > threshold) {
        // Insert blank/center point for gap
        result.push({
          screen: { x: 0.5, y: 0.5 }, // Center
          color: { r: 0, g: 0, b: 0 }, // Black
        });
      }
    }
  }

  return result;
}
```

#### 4.2 Independent Channel Frequencies (Advanced)

```typescript
// ONLY after basic functionality is stable
// Allow different scan rates per channel for creative effects
const channelFrequencies = {
	x: baseFreq,
	y: baseFreq,
	r: baseFreq * 1.1, // Slightly different for color shimmer
	g: baseFreq * 0.9,
	b: baseFreq * 1.05,
};
```

#### 4.3 Advanced Interpolation

```typescript
// Smooth interpolation between vertices (XYscope style)
_interpolateVertices(v1, v2, t) {
  switch (this._interpolationMode) {
    case 'cubic':
      t = t * t * (3 - 2 * t); // Smoothstep
      break;
    case 'circular':
      t = Math.sin(t * Math.PI * 0.5); // Sine ease
      break;
    default: // linear
      break;
  }

  return {
    x: v1.screen.x + (v2.screen.x - v1.screen.x) * t,
    y: v1.screen.y + (v2.screen.y - v1.screen.y) * t,
    r: v1.color.r + (v2.color.r - v1.color.r) * t,
    g: v1.color.g + (v2.color.g - v1.color.g) * t,
    b: v1.color.b + (v2.color.b - v1.color.b) * t,
  };
}
```

## 🔄 Key Differences: XYscope vs Reactoscope

| Aspect          | XYscope.js       | Reactoscope       | Adaptation Strategy               |
| --------------- | ---------------- | ----------------- | --------------------------------- |
| **Graphics**    | p5.js Canvas     | Three.js Scene    | Extract vertices from 3D geometry |
| **Channels**    | 2 (X, Y)         | 5 (X, Y, R, G, B) | Extend patterns to 5 channels     |
| **Audio API**   | Raw Web Audio    | Tone.js           | Use Tone.js node architecture     |
| **Coordinates** | [-1, 1]          | [0, 1]            | Add coordinate mapping option     |
| **Data Flow**   | Shape → Arrays   | Scene → Vertices  | Maintain vertex structure         |
| **Rendering**   | XXY Oscilloscope | 3D Point Cloud    | Keep existing visualization       |

## ⚡ Performance Considerations

### Memory Efficiency

- **Pre-allocated buffers**: Avoid garbage collection in audio thread
- **Typed arrays**: Use Float32Array for vertex data
- **Object pooling**: Reuse vertex objects where possible

### Audio Thread Optimization

- **Minimal allocation**: No `new` objects in `process()`
- **Simple math**: Avoid complex calculations
- **Cache-friendly**: Sequential memory access patterns

### Visual Processing

- **Frustum culling**: Only process visible geometry
- **LOD system**: Reduce vertex count for distant objects
- **Batch updates**: Update vertex data in chunks

## 🧪 Testing Strategy

### Phase 1 Validation

- [ ] Triangle renders correctly
- [ ] Colors are accurate
- [ ] Shape is stable
- [ ] No visual artifacts

### Phase 2 Validation

- [ ] Coordinate mapping works
- [ ] Filters improve audio quality
- [ ] Amplitude control affects visualization
- [ ] Performance is acceptable

### Phase 3 Validation

- [ ] Buffer optimization reduces CPU usage
- [ ] Scene extraction is efficient
- [ ] Memory usage is stable
- [ ] Large scenes render smoothly

### Phase 4 Validation

- [ ] Gap insertion improves visualization
- [ ] Independent frequencies create interesting effects
- [ ] Advanced interpolation is smooth
- [ ] All features work together

## 🎯 Success Metrics

- **Visual Quality**: Clean triangle rendering without artifacts
- **Performance**: <5% CPU usage for audio processing
- **Memory**: Stable memory usage, no leaks
- **Compatibility**: Works with existing Reactoscope architecture
- **Extensibility**: Easy to add new XYscope features

## 🚧 Implementation Notes

### Critical Success Factors

1. **Incremental Changes**: Add one feature at a time
2. **Preserve Working State**: Always have a fallback
3. **Test Early**: Validate each phase before proceeding
4. **Respect Architecture**: Work with Tone.js, not against it

### Common Pitfalls to Avoid

- **Over-optimization**: Don't add complexity without benefit
- **Breaking Changes**: Maintain API compatibility
- **Audio Thread Issues**: Keep worklet processing simple
- **Coordinate Confusion**: Be explicit about coordinate systems

---

## 🚀 Next Action Items

1. **IMMEDIATE**: Revert worklet to simple, working implementation
2. **Phase 1**: Validate triangle rendering is restored
3. **Phase 2**: Add coordinate mapping with [-1,1] option
4. **Phase 3**: Implement basic audio filtering
5. **Phase 4**: Add performance optimizations incrementally

This plan ensures we build a robust XYscope-inspired system while maintaining Reactoscope's unique advantages in 3D visualization and color mapping.
