# Zustand State Management Migration Plan

## Overview

This document outlines a comprehensive plan to migrate your React Flow application from React Context and local state to a centralized Zustand store with optimized performance using `useShallow`.

## Current State Analysis

### Current State Management Patterns:

1. **Theme Management**: Using React Context (`ThemeContext.tsx`)
2. **Flow State**: Using React Flow hooks (`useNodesState`, `useEdgesState`)
3. **Handle Positioning**: Computed on-demand in components
4. **Local Component State**: Various useState hooks

### Performance Issues Identified:

- Multiple re-renders due to React Context updates
- Heavy computations in components (handle positioning)
- Unnecessary re-renders when unrelated state changes
- Complex prop drilling for handle positions

## Proposed Zustand Store Architecture

### 1. Store Structure

```typescript
interface AppStore {
	// Theme State
	theme: {
		current: 'light' | 'dark' | 'system';
		actualTheme: 'light' | 'dark';
	};

	// Flow State
	flow: {
		nodes: AppNode[];
		edges: Edge[];
		nodeHandlePositions: Record<string, Record<string, Position>>;
		viewport: { x: number; y: number; zoom: number };
	};

	// UI State
	ui: {
		isNodeDragging: boolean;
		selectedNodes: string[];
		selectedEdges: string[];
		isConnecting: boolean;
	};

	// Computed/Derived State (using selectors)
	computed: {
		nodeById: (id: string) => AppNode | undefined;
		edgeById: (id: string) => Edge | undefined;
		connectedEdges: (nodeId: string) => Edge[];
		nodePositions: Record<string, { x: number; y: number }>;
	};

	// Actions
	actions: {
		// Theme Actions
		setTheme: (theme: 'light' | 'dark' | 'system') => void;

		// Flow Actions
		addNode: (node: AppNode) => void;
		updateNode: (id: string, updates: Partial<AppNode>) => void;
		removeNode: (id: string) => void;
		moveNode: (id: string, position: { x: number; y: number }) => void;

		addEdge: (edge: Edge) => void;
		updateEdge: (id: string, updates: Partial<Edge>) => void;
		removeEdge: (id: string) => void;

		// Handle Position Actions
		updateHandlePositions: (
			nodeId: string,
			positions: Record<string, Position>
		) => void;
		recalculateAllHandlePositions: () => void;

		// Batch Actions for Performance
		batchUpdateNodes: (
			updates: Array<{ id: string; updates: Partial<AppNode> }>
		) => void;
		batchUpdateEdges: (
			updates: Array<{ id: string; updates: Partial<Edge> }>
		) => void;

		// Viewport Actions
		setViewport: (viewport: { x: number; y: number; zoom: number }) => void;

		// UI Actions
		setSelectedNodes: (nodeIds: string[]) => void;
		setSelectedEdges: (edgeIds: string[]) => void;
		setIsNodeDragging: (isDragging: boolean) => void;
	};
}
```

### 2. Store Slices (Modular Architecture)

#### Theme Slice

```typescript
interface ThemeSlice {
	theme: {
		current: 'light' | 'dark' | 'system';
		actualTheme: 'light' | 'dark';
	};
	setTheme: (theme: 'light' | 'dark' | 'system') => void;
	initializeTheme: () => void;
}
```

#### Flow Slice

```typescript
interface FlowSlice {
	nodes: AppNode[];
	edges: Edge[];
	nodeHandlePositions: Record<string, Record<string, Position>>;
	addNode: (node: AppNode) => void;
	updateNode: (id: string, updates: Partial<AppNode>) => void;
	// ... other flow actions
}
```

#### UI Slice

```typescript
interface UISlice {
	isNodeDragging: boolean;
	selectedNodes: string[];
	selectedEdges: string[];
	setIsNodeDragging: (isDragging: boolean) => void;
	// ... other UI actions
}
```

## Implementation Phases

### Phase 1: Store Setup and Basic Structure ✅ COMPLETED

**Estimated Time: 2-3 hours**

1. **Create base store structure** ✅

   - `src/stores/index.ts` - Main store export
   - `src/stores/appStore.ts` - Main store configuration ✅
   - `src/stores/types.ts` - Store type definitions ✅

2. **Create store slices** ✅

   - `src/stores/slices/themeSlice.ts` ✅
   - `src/stores/slices/flowSlice.ts` ✅
   - `src/stores/slices/uiSlice.ts` ✅

3. **Create selectors** ✅

   - Performance-optimized hooks with useShallow in `src/hooks/useAppStore.ts` ✅

4. **Add debugging and verification** ✅
   - Store debug panel component ✅
   - Console logging for store actions ✅
   - Real-time verification of store state ✅

### Phase 2: Theme Migration ✅ COMPLETED

**Estimated Time: 1-2 hours**

1. **Replace ThemeContext with Zustand** ✅

   - Migrated theme state to store ✅
   - Updated FlowControls component ✅
   - Created ZustandThemeProvider replacement ✅
   - Updated App.tsx to use new theme provider ✅

2. **Add theme persistence** ✅

   - Implemented localStorage middleware ✅
   - Added system theme detection ✅

3. **Add debugging and verification** ✅
   - Theme debugging in StoreDebugPanel ✅
   - Console logging for theme changes ✅
   - Theme cycling test functionality ✅

### Phase 3: Flow State Migration

**Estimated Time: 3-4 hours**

1. **✅ Replace React Flow state hooks** _(COMPLETED)_

   - ✅ Migrate from `useNodesState`/`useEdgesState` to Zustand store
   - ✅ Implement custom hooks with useShallow (`useFlowNodes`, `useFlowEdges`, `useFlowViewport`, `useFlowActions`)
   - ✅ Update App.tsx with store integration
   - ✅ Fix infinite loop issues with proper initialization using useRef
   - ✅ Add React Flow change handlers (`applyNodesChange`/`applyEdgesChange`)

2. **Handle position optimization**
   - Move handle position calculations to store
   - Implement memoized selectors
   - Add batch update capabilities

### Phase 4: Performance Optimization

**Estimated Time: 2-3 hours**

1. **Implement useShallow optimizations**

   - Create optimized hooks for components
   - Add proper selectors to prevent unnecessary re-renders
   - Implement memoization where needed

2. **Add computed/derived state**
   - Node lookup maps
   - Edge relationship calculations
   - Position-based optimizations

### Phase 5: Advanced Features

**Estimated Time: 2-3 hours**

1. **Add undo/redo functionality**
2. **Implement batch operations**
3. **Add store devtools integration**
4. **Performance monitoring**

## Performance Optimization Strategy

### 1. useShallow Hook Usage

```typescript
// Instead of this (causes re-renders on any state change):
const state = useAppStore();

// Use this (only re-renders when specific values change):
const { nodes, edges } = useAppStore(
	useShallow((state) => ({
		nodes: state.flow.nodes,
		edges: state.flow.edges,
	}))
);
```

### 2. Granular Selectors

```typescript
// Specific selectors for common use cases
const useNode = (nodeId: string) =>
	useAppStore(
		useShallow((state) => state.flow.nodes.find((node) => node.id === nodeId))
	);

const useNodePosition = (nodeId: string) =>
	useAppStore(
		useShallow((state) => {
			const node = state.flow.nodes.find((n) => n.id === nodeId);
			return node ? { x: node.position.x, y: node.position.y } : null;
		})
	);
```

### 3. Memoized Computed Values

```typescript
// Use computed selectors for expensive operations
const useConnectedEdges = (nodeId: string) =>
	useAppStore(
		useShallow((state) =>
			state.flow.edges.filter(
				(edge) => edge.source === nodeId || edge.target === nodeId
			)
		)
	);
```

## Custom Hooks for Components

### 1. Flow Hooks

```typescript
// src/hooks/useFlow.ts
export const useFlowNodes = () =>
	useAppStore(useShallow((state) => state.flow.nodes));

export const useFlowEdges = () =>
	useAppStore(useShallow((state) => state.flow.edges));

export const useFlowActions = () =>
	useAppStore(useShallow((state) => state.actions));
```

### 2. Theme Hooks

```typescript
// src/hooks/useTheme.ts
export const useTheme = () =>
	useAppStore(
		useShallow((state) => ({
			theme: state.theme.current,
			actualTheme: state.theme.actualTheme,
			setTheme: state.actions.setTheme,
		}))
	);
```

### 3. Node-Specific Hooks

```typescript
// src/hooks/useNode.ts
export const useNode = (nodeId: string) =>
	useAppStore(
		useShallow((state) => state.flow.nodes.find((node) => node.id === nodeId))
	);

export const useNodeHandlePositions = (nodeId: string) =>
	useAppStore(
		useShallow((state) => state.flow.nodeHandlePositions[nodeId] || {})
	);
```

## Migration Checklist

### Pre-Migration

- [ ] Backup current implementation
- [ ] Set up Zustand and related dependencies
- [ ] Create store structure and types

### Theme Migration

- [ ] Create theme slice
- [ ] Update FlowControls component
- [ ] Remove ThemeContext
- [ ] Test theme switching functionality

### Flow State Migration

- [ ] Create flow slice with nodes/edges
- [ ] Replace useNodesState/useEdgesState in App.tsx
- [ ] Update handle positioning logic
- [ ] Test node/edge operations

### Component Updates

- [ ] Update PositionLoggerNode
- [ ] Update ThemeDebugNode
- [ ] Update BaseNode if needed
- [ ] Update all edge components

### Performance Optimization

- [ ] Add useShallow to all store usage
- [ ] Create optimized selectors
- [ ] Add memoization where needed
- [ ] Performance testing

### Testing

- [ ] Unit tests for store actions
- [ ] Integration tests for component updates
- [ ] Performance benchmarking
- [ ] E2E testing of user interactions

## File Structure Changes

```
src/
├── stores/
│   ├── index.ts              # Main store export
│   ├── appStore.ts           # Store configuration
│   ├── types.ts              # Store type definitions
│   ├── slices/
│   │   ├── themeSlice.ts     # Theme state management
│   │   ├── flowSlice.ts      # Flow state management
│   │   └── uiSlice.ts        # UI state management
│   ├── selectors/
│   │   ├── flowSelectors.ts  # Flow-specific selectors
│   │   └── themeSelectors.ts # Theme-specific selectors
│   └── middleware/
│       ├── persistence.ts    # localStorage middleware
│       └── devtools.ts       # Development tools
├── hooks/
│   ├── useFlow.ts           # Flow-related hooks
│   ├── useTheme.ts          # Theme-related hooks
│   ├── useNode.ts           # Node-specific hooks
│   └── usePerformance.ts    # Performance monitoring hooks
└── components/
    └── ... (updated to use store)
```

## Expected Performance Improvements

1. **Reduced Re-renders**: Using useShallow prevents unnecessary component updates
2. **Centralized State**: Eliminates prop drilling and context re-render issues
3. **Optimized Calculations**: Handle positioning computed once in store
4. **Better Memory Usage**: Proper cleanup and memoization
5. **Developer Experience**: Better debugging with Zustand devtools

## Risks and Mitigation

### Risks:

1. **Breaking Changes**: Large refactoring might introduce bugs
2. **Performance Regression**: Incorrect useShallow usage could worsen performance
3. **Complexity**: Store might become too complex

### Mitigation:

1. **Incremental Migration**: Migrate one slice at a time
2. **Comprehensive Testing**: Unit and integration tests for each phase
3. **Performance Monitoring**: Benchmark before and after migration
4. **Code Reviews**: Peer review for store design and implementation

## Success Metrics

1. **Performance**:

   - Reduced React DevTools re-render count by 60%+
   - Faster handle position updates (< 16ms)
   - Improved React Flow interactions responsiveness

2. **Code Quality**:

   - Reduced component complexity
   - Eliminated prop drilling
   - Better separation of concerns

3. **Developer Experience**:
   - Easier state debugging
   - More predictable state updates
   - Better TypeScript integration

This migration plan provides a structured approach to implementing Zustand while maintaining application functionality and improving performance through strategic use of useShallow and optimized selectors.
