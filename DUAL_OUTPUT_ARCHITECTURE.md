# ThreeWorkletNode - Dual Mono Output Architecture

## Overview
The ThreeWorkletNode has been refactored to support two separate mono outputs (X and Y) instead of a single stereo output. This allows users to independently route the X and Y coordinate audio streams to different destination nodes.

## Architecture Diagram

```
┌─────────────────────────────────┐
│        ThreeWorkletNode         │
│                                 │
│  ┌─────────────────────────┐    │
│  │   AudioWorklet          │    │
│  │   (ThreeProcessor)      │    │
│  │                         │    │
│  │   Channel 0: X coords   │    │
│  │   Channel 1: Y coords   │    │
│  └─────────────┬───────────┘    │
│                │                │
│    ┌───────────▼───────────┐    │
│    │    Tone.Split         │    │
│    │  (Channel Splitter)   │    │
│    └───┬───────────────┬───┘    │
│        │               │        │
│  ┌─────▼─────┐   ┌─────▼─────┐  │
│  │ outputX   │   │ outputY   │  │
│  │(Tone.Gain)│   │(Tone.Gain)│  │
│  └─────┬─────┘   └─────┬─────┘  │
└────────┼─────────────────┼──────┘
         │                 │
    ┌────▼────┐       ┌────▼────┐
    │ X Handle│       │ Y Handle│
    │   (UI)  │       │   (UI)  │
    └─────────┘       └─────────┘
```

## Component Changes

### 1. ThreeWorkletNode.ts (Audio Worklet Node)
- **Added**: `outputX: Tone.Gain` - Output for X coordinate audio
- **Added**: `outputY: Tone.Gain` - Output for Y coordinate audio
- **Added**: `_channelSplitter: Tone.Split` - Separates stereo into two mono channels
- **Maintained**: `output: Tone.Gain` - Backward compatibility (stereo output)

### 2. ThreeWorkletNode.tsx (React Component)
- **Changed**: Single output handle → Two output handles
  - `outputX` handle at position (0, 0.5) - labeled "X"
  - `outputY` handle at position (0, 1.5) - labeled "Y"

### 3. useToneConnections.ts (Connection Management)
- **Enhanced**: Source handle support for multiple outputs
- **Added**: Helper function `getSourceInstance()` to resolve output based on handle
- **Supports**: `outputX`, `outputY`, and `output` handles

### 4. ThreeProcessor.worklet.ts (Audio Processor)
- **No Changes**: Continues to generate stereo audio (X→left, Y→right)
- **Separation**: Handled at the node level, not processor level

## Usage Examples

### Basic Connection
```typescript
// Connect X output to a gain node
connect(threeWorkletNode.outputX, gainNode);

// Connect Y output to a different gain node
connect(threeWorkletNode.outputY, anotherGainNode);
```

### React Flow Connections
- **X Output**: Connect from `outputX` handle to any audio input
- **Y Output**: Connect from `outputY` handle to any audio input
- **Independent Routing**: Each coordinate stream can go to different processors

## Benefits

1. **Independent Processing**: X and Y coordinates can be processed separately
2. **Flexible Routing**: Route coordinate streams to different effects chains
3. **Backward Compatibility**: Original `output` still available for stereo use
4. **UI Clarity**: Visual indication of separate coordinate streams
5. **Performance**: No additional processing overhead - splitting happens at node level

## Migration Guide

### For Existing Connections
- Old connections to `output` handle continue to work (stereo)
- New connections can use `outputX` or `outputY` for mono streams

### For New Implementations
- Use `outputX` for X-coordinate-based audio processing
- Use `outputY` for Y-coordinate-based audio processing
- Connect each output to appropriate processing chains

## Implementation Details

### Audio Signal Flow
1. **Coordinate Input**: Rotating cube generates X/Y coordinate pairs
2. **Worklet Processing**: Coordinates converted to stereo audio (X→left, Y→right)
3. **Channel Splitting**: `Tone.Split` separates stereo into two mono channels
4. **Output Routing**: Each mono channel available via separate output handles

### Connection Handling
- `useToneConnections` detects source handle (`outputX`, `outputY`)
- Resolves correct output node based on handle
- Maintains type safety with helper functions
- Supports cleanup and reconnection
