# Floating Handles Implementation Plan for Reactoscope

## Overview

This document outlines the comprehensive implementation plan for integrating the floating handles system from rf-basics into the reactoscope project. The floating handles system will provide dynamic handle positioning based on node connections and spatial relationships.

## Current State Analysis

### Existing Reactoscope Components

- ✅ **BaseNode**: Grid-based node container system
- ✅ **GridNodeHandle**: Grid-aligned handle positioning system (64px units)
- ✅ **DebugNode**: Simplified position logger with static handles
- ✅ **useHandlePositions**: Basic floating edge calculation utilities
- ✅ **Grid System**: 64px grid unit system for precise positioning

### Existing Floating Logic

- ✅ `calculateFloatingConnectionPoints()` - Basic edge connection calculation
- ✅ `useFloatingEdgePathData()` - Hook for edge path data
- ⚠️ **Gap**: No dynamic handle positioning based on connections

## Implementation Goals

### Core Objectives

1. **Dynamic Handle Positioning**: Handles automatically move to optimal positions based on connected nodes
2. **Grid System Integration**: Seamlessly integrate with reactoscope's existing 64px grid system
3. **Backward Compatibility**: Maintain compatibility with existing static handles
4. **Debug Visualization**: Comprehensive debug information for development
5. **Performance Optimization**: Memoized calculations and efficient re-renders

### Design Principles

- **Hybrid Support**: Static and floating handles work together
- **Grid-Aligned**: All positions snap to the 64px grid system
- **Type Safety**: Full TypeScript support with clear interfaces
- **Composable**: Small, focused hooks that can be combined
- **Visual Feedback**: Clear debug information and visual indicators

## Implementation Phases

## Phase 1: Core Utilities and Hooks ⏳

### 1.1 Create Core Utility Functions

**File**: `/src/hooks/useFloatingHandles.ts`

```typescript
// Pure utility functions
├── getNodeCenter(node) -> {x, y}
├── getNodeBounds(node) -> {x, y, width, height}
├── getDirection(from, to) -> Position
├── getOptimalPosition(node, connected, type, minDistance) -> Position
├── getConnectedNodes(nodeId, nodes, edges, type) -> Node[]
├── calculateDistance(point1, point2) -> number
└── getDefaultGridCoordinatesForPosition(position, gridWidth, gridHeight) -> {gridX, gridY}
```

**Key Features**:

- [ ] Position calculation based on connected node averages
- [ ] Direction determination (top/right/bottom/left)
- [ ] Distance threshold validation to prevent jitter
- [ ] Grid coordinate conversion for reactoscope's system
- [ ] Type-safe interfaces for all functions

### 1.2 Create useFloatingHandles Hook

**Purpose**: Calculate optimal handle positions for a specific node

```typescript
interface FloatingHandleOptions {
	nodeId?: string;
	minDistanceThreshold?: number;
}

interface HandlePositions {
	source: Position;
	target: Position;
}

function useFloatingHandles(options): HandlePositions;
```

**Features**:

- [ ] Memoized position calculations
- [ ] Configurable distance thresholds
- [ ] Default fallback positions
- [ ] React Flow integration via useNodes/useEdges

### 1.3 Grid System Integration

**Challenge**: Adapt floating logic to work with reactoscope's 64px grid system

**Solution**:

- [ ] Convert calculated Position to grid coordinates
- [ ] Ensure handles snap to grid boundaries
- [ ] Maintain visual consistency with existing nodes

## Phase 2: FloatingHandle Component 🔄

### 2.1 Create FloatingHandle Component

**File**: `/src/components/FloatingHandle.tsx`

```typescript
interface FloatingHandleProps {
	id: string;
	type: 'source' | 'target';
	nodeId: string;
	gridWidth: number;
	gridHeight: number;
	minDistanceThreshold?: number;
	showDebugInfo?: boolean;
	// GridNodeHandle pass-through props
	size?: 'sm' | 'md' | 'lg';
	color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}
```

**Features**:

- [ ] Automatic position calculation using useFloatingHandles
- [ ] Integration with existing GridNodeHandle component
- [ ] Debug overlay showing current position
- [ ] Smooth position transitions
- [ ] All standard GridNodeHandle styling options

### 2.2 Debug Information Display

**Visual Elements**:

- [ ] Position overlay (e.g., "FLOAT source: right")
- [ ] Distance threshold indicators
- [ ] Connection count display
- [ ] Grid coordinate display

## Phase 3: DebugNode Enhancement 🎯

### 3.1 Update DebugNode Implementation

**File**: `/src/nodes/DebugNode.tsx`

**Changes**:

- [ ] Replace GridNodeHandle with FloatingHandle components
- [ ] Add floating handle position display to UI
- [ ] Include debug information panel
- [ ] Show connection analysis data

**New Features**:

- [ ] Real-time handle position display
- [ ] Connection count and direction indicators
- [ ] Distance threshold controls
- [ ] Visual feedback for position changes

### 3.2 Enhanced Position Display

**UI Elements**:

```
┌─────────────────────┐
│   Position Logger   │
│                     │
│ X: 245px  Y: 128px │
│ Source: right       │
│ Target: left        │
│ Connections: 2      │
│ Threshold: 50px     │
└─────────────────────┘
```

## Phase 4: Advanced Features 🚀

### 4.1 FloatingEdge Component (Optional)

**File**: `/src/components/FloatingEdge.tsx`

**Purpose**: Custom edge component that adapts to both floating and static handles

**Features**:

- [ ] Hybrid positioning (floating + static handles)
- [ ] Debug visualization dots at connection points
- [ ] Smooth step path generation
- [ ] Configurable through edge data

### 4.2 Edge Type Registration

**File**: `/src/config/edgeTypes.ts`

```typescript
export const edgeTypes = {
	floating: FloatingEdge,
	default: undefined, // Standard React Flow edge
};
```

### 4.3 Store Integration

**Enhance existing store to support floating edges**:

- [ ] Edge creation with floating configuration
- [ ] Default floating edge settings
- [ ] Connection event handling

## Phase 5: Testing and Optimization 🔧

### 5.1 Component Testing

**Test Scenarios**:

- [ ] No connections (default positions)
- [ ] Single connection (optimal direction)
- [ ] Multiple connections (average positioning)
- [ ] Rapid position changes (threshold validation)
- [ ] Mixed static/floating nodes

### 5.2 Performance Optimization

**Optimization Strategies**:

- [ ] Memoization of expensive calculations
- [ ] Efficient dependency arrays
- [ ] Debounced position updates
- [ ] Batch React Flow updates

### 5.3 Visual Testing

**User Experience**:

- [ ] Smooth handle transitions
- [ ] Clear debug information
- [ ] Intuitive position changes
- [ ] Grid alignment accuracy

## Technical Specifications

### Position Calculation Algorithm

```typescript
function getOptimalPosition(
	currentNode,
	connectedNodes,
	handleType,
	minDistance
) {
	// 1. Default positions
	const defaultPos = handleType === 'source' ? Position.Right : Position.Left;

	// 2. Early return for no connections
	if (connectedNodes.length === 0) return defaultPos;

	// 3. Calculate average position of connected nodes
	const currentCenter = getNodeCenter(currentNode);
	const avgConnectedPos = calculateAveragePosition(connectedNodes);

	// 4. Distance validation
	const distance = calculateDistance(currentCenter, avgConnectedPos);
	if (distance < minDistance) return defaultPos;

	// 5. Direction determination
	return getDirection(currentCenter, avgConnectedPos);
}
```

### Grid Coordinate Conversion

```typescript
function getDefaultGridCoordinatesForPosition(position, gridWidth, gridHeight) {
	switch (position) {
		case Position.Top:
			return { gridX: gridWidth / 2, gridY: 0 };
		case Position.Right:
			return { gridX: gridWidth, gridY: gridHeight / 2 };
		case Position.Bottom:
			return { gridX: gridWidth / 2, gridY: gridHeight };
		case Position.Left:
			return { gridX: 0, gridY: gridHeight / 2 };
	}
}
```

### Configuration Options

```typescript
// Global defaults
const FLOATING_HANDLE_DEFAULTS = {
	minDistanceThreshold: 50, // pixels
	debugMode: false,
	smoothTransitions: true,
	gridSnapping: true,
};

// Per-handle configuration
interface FloatingHandleConfig {
	minDistanceThreshold?: number;
	showDebugInfo?: boolean;
	transitionDuration?: number;
}
```

## Success Criteria

### Functional Requirements

- [ ] ✅ Handles automatically position based on connections
- [ ] ✅ Grid system integration maintains visual consistency
- [ ] ✅ Debug information provides clear development feedback
- [ ] ✅ Performance remains smooth with multiple nodes
- [ ] ✅ Backward compatibility with existing static handles

### User Experience Requirements

- [ ] ✅ Intuitive handle movement behavior
- [ ] ✅ Visual feedback for position changes
- [ ] ✅ Clear debug information display
- [ ] ✅ Smooth transitions between positions
- [ ] ✅ Consistent with reactoscope's design language

### Technical Requirements

- [ ] ✅ Type-safe implementation
- [ ] ✅ Composable hook architecture
- [ ] ✅ Efficient re-render behavior
- [ ] ✅ Clean separation of concerns
- [ ] ✅ Comprehensive error handling

## Implementation Timeline

### Week 1: Foundation

- [ ] Phase 1: Core utilities and hooks
- [ ] Basic useFloatingHandles implementation
- [ ] Grid system integration

### Week 2: Components

- [ ] Phase 2: FloatingHandle component
- [ ] Phase 3: DebugNode enhancement
- [ ] Basic functionality testing

### Week 3: Advanced Features

- [ ] Phase 4: FloatingEdge component (if needed)
- [ ] Store integration
- [ ] Edge type registration

### Week 4: Polish and Testing

- [ ] Phase 5: Testing and optimization
- [ ] Performance tuning
- [ ] Documentation updates

## Risk Mitigation

### Technical Risks

1. **Performance Issues**: Mitigate with memoization and efficient algorithms
2. **Grid Alignment**: Ensure floating positions properly snap to grid
3. **React Flow Integration**: Test thoroughly with existing flow components

### User Experience Risks

1. **Confusing Behavior**: Provide clear debug information and documentation
2. **Visual Inconsistency**: Maintain reactoscope's design patterns
3. **Learning Curve**: Include comprehensive examples and guides

## Future Enhancements

### Potential Extensions

- [ ] **Animated Transitions**: Smooth handle position animations
- [ ] **Custom Positioning Logic**: User-defined position calculation
- [ ] **Handle Grouping**: Multiple handles with coordinated positioning
- [ ] **Connection Hints**: Visual indicators for optimal connections
- [ ] **Auto-Layout**: Automatic node arrangement based on connections

### Integration Opportunities

- [ ] **Audio Routing**: Handle positions based on audio signal flow
- [ ] **Performance Metrics**: Position optimization based on processing load
- [ ] **User Preferences**: Customizable positioning behaviors
- [ ] **Export/Import**: Save and restore handle configurations

---

**Status**: Ready to begin implementation
**Next Action**: Start Phase 1 - Core Utilities and Hooks
**Owner**: GitHub Copilot
**Last Updated**: June 7, 2025
