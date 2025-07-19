# Reactoscope Development Guidelines

This document provides comprehensive guidelines for developing and maintaining the Reactoscope audio-visual node editor. Follow these principles for consistent, maintainable, and scalable code.

## 🏗️ Architecture Overview

### Core Technologies

- **React 19** with TypeScript for component architecture
- **React Flow** for node-based visual programming interface
- **Tone.js** for Web Audio API abstraction and audio processing
- **Zustand** for predictable state management
- **Tailwind CSS v4** for utility-first styling
- **Vite** for build tooling and development server

### Design Patterns

#### Component Architecture

- **Composition over Inheritance**: Use composition patterns for component flexibility
- **Single Responsibility Principle**: Each component should have one clear purpose
- **Props-down, Events-up**: Data flows down via props, events bubble up via callbacks
- **Container/Presenter Pattern**: Separate logic containers from presentation components

#### State Management

- **Sliced Store Architecture**: Domain-specific store slices (theme, UI)
- **Immutable Updates**: All state changes must be immutable
- **Derived State**: Compute derived values in selectors, not components
- **Action-Based Updates**: State changes through well-defined actions

#### Grid-Based Layout System

- **Grid Units**: All spatial calculations use `GRID_UNIT` (64px) for consistency
- **Snap-to-Grid**: Components align to grid boundaries for visual harmony
- **Responsive Grid**: Grid system adapts to different screen sizes and zoom levels

## 🎨 Styling Guidelines

### Tailwind CSS v4 Requirements

- **No Configuration File**: Tailwind v4 uses CSS-based configuration
- **Dark Mode Strategy**: Use `dark:` prefixes with class-based strategy
- **Utility-First**: Prefer utility classes over custom CSS
- **Component Variants**: Use consistent variant naming (primary, secondary, audio, debug)
- **Responsive Design**: Use responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`)

### Color System

```css
/* Use semantic color tokens, not hardcoded values */
✅ bg-primary text-primary-foreground
❌ bg-blue-500 text-white

/* Support dark mode with utility classes */
✅ bg-white dark:bg-gray-900
❌ style={{ backgroundColor: 'white' }}
```

### Component Styling Patterns

- **Consistent Spacing**: Use Tailwind spacing scale (p-2, m-4, gap-3)
- **Semantic Variants**: Define clear variant systems for components
- **State-Based Styling**: Visual feedback for interactive states (hover, focus, active)
- **Accessibility**: Ensure sufficient color contrast and focus indicators

## 🔧 Software Engineering Principles

### General Best Practices

- **DRY (Don't Repeat Yourself):** Avoid duplicating code. Abstract common functionality into reusable functions, classes, or modules.
- **KISS (Keep It Simple, Stupid):** Favor simplicity in design and implementation. Avoid unnecessary complexity.
- **YAGNI (You Ain't Gonna Need It):** Only implement features and functionalities that are currently required.
- **SOLID Principles:**
  - **S**ingle Responsibility Principle (SRP)
  - **O**pen/Closed Principle (OCP)
  - **L**iskov Substitution Principle (LSP)
  - **I**nterface Segregation Principle (ISP)
  - **D**ependency Inversion Principle (DIP)
- **Composition over Inheritance:** Favor composing objects over class inheritance to achieve code reuse and flexibility.
- **Law of Demeter (Principle of Least Knowledge):** A module should not know about the internal details of the objects it manipulates.
- **Separation of Concerns (SoC):** Different areas of functionality should be managed by distinct and minimally overlapping modules.
- **Convention over Configuration:** Leverage sensible defaults and conventions to reduce explicit configuration.
- **Progressive Disclosure:** Reveal complexity gradually, showing only essential features initially.
- **Defensive Programming:** Anticipate potential problems and include checks/error handling to ensure robust behavior.

### Code Quality Standards

#### TypeScript Best Practices

- **Strict Mode**: Enable all strict TypeScript compiler options
- **Explicit Types**: Prefer explicit typing over `any` or excessive inference
- **Interface Composition**: Use intersection types and interface extension
- **Discriminated Unions**: Use union types for component variants and states
- **Generic Constraints**: Use proper generic constraints for reusable components

```typescript
// ✅ Good: Explicit prop typing
interface ButtonProps {
	variant: 'primary' | 'secondary' | 'danger';
	size: 'sm' | 'md' | 'lg';
	children: React.ReactNode;
	onClick?: () => void;
}

// ❌ Avoid: Deprecated React.FC
const Button: React.FC<ButtonProps> = ({ children, ...props }) => {};

// ✅ Good: Direct component function
function Button({ children, variant, size, onClick }: ButtonProps) {}
```

#### React Best Practices

- **Functional Components**: Use function declarations, not arrow functions for components
- **Custom Hooks**: Extract complex logic into reusable custom hooks
- **Memoization**: Use `useMemo` and `useCallback` judiciously for performance
- **Error Boundaries**: Implement error boundaries for robust error handling
- **Ref Management**: Use `useRef` for DOM access and `forwardRef` when needed

#### Performance Optimization

- **Bundle Splitting**: Use dynamic imports for code splitting
- **Lazy Loading**: Implement lazy loading for heavy components
- **Virtualization**: Use virtualization for large lists of nodes
- **Debouncing**: Debounce expensive operations (search, API calls)
- **Asset Optimization**: Optimize images, shaders, and 3D models

### Testing Strategy

- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test component interactions and data flow
- **Visual Regression**: Test UI consistency across theme changes
- **Performance Tests**: Monitor rendering performance and memory usage
- **Accessibility Tests**: Ensure keyboard navigation and screen reader support

### Error Handling

- **Graceful Degradation**: Components should handle missing props gracefully
- **Error Boundaries**: Catch and display user-friendly error messages
- **Logging**: Implement structured logging for debugging
- **Type Safety**: Use TypeScript to prevent runtime type errors

## 🎵 Audio Architecture

### Tone.js Integration

- **Audio Context Management**: Use single audio context across the application
- **Node Lifecycle**: Properly create, connect, and dispose audio nodes
- **Parameter Automation**: Use Tone.js scheduling for smooth parameter changes
- **Memory Management**: Dispose audio resources to prevent memory leaks

### Web Audio Best Practices

- **AudioWorklet**: Use AudioWorklet for custom audio processing
- **Real-time Constraints**: Minimize garbage collection in audio callbacks
- **Sample Rate Handling**: Support different sample rates and buffer sizes
- **Audio Routing**: Implement flexible audio routing with visual feedback

## 🎯 Node System Guidelines

### Node Implementation

- **Base Node Pattern**: Extend `BaseNode` for consistent behavior
- **Grid Integration**: Use grid-based positioning and sizing
- **Handle Management**: Implement audio and control handles appropriately
- **State Persistence**: Ensure node state can be serialized/deserialized

### Handle System

- **Type Safety**: Use typed handles for audio and control connections
- **Visual Feedback**: Provide clear visual feedback for connection states
- **Connection Validation**: Validate connections before allowing them
- **Auto-routing**: Implement intelligent connection routing

### Data Flow

- **Immutable Props**: Node props should be treated as immutable
- **Event Emission**: Use callbacks for node state changes
- **Batch Updates**: Batch multiple state changes for performance
- **Undo/Redo**: Support undo/redo for all node operations

## 🌐 Accessibility & Usability

### Keyboard Navigation

- **Tab Order**: Logical tab order through all interactive elements
- **Shortcuts**: Implement keyboard shortcuts for common operations
- **Focus Management**: Clear focus indicators and logical focus flow
- **Screen Reader**: ARIA labels and descriptions for complex interactions

### User Experience

- **Progressive Disclosure**: Show complexity gradually as users need it
- **Contextual Help**: Inline help and documentation
- **Responsive Design**: Support various screen sizes and input methods
- **Performance Feedback**: Loading states and progress indicators

## 📝 Documentation Standards

### Code Documentation

- **JSDoc Comments**: Document all public functions and components
- **Type Annotations**: Use descriptive type names and comments
- **Inline Comments**: Explain complex logic and business rules
- **Architecture Decisions**: Document architectural choices and trade-offs

### Component Documentation

- **Props Interface**: Clear documentation of all props
- **Usage Examples**: Provide usage examples for complex components
- **Variant Documentation**: Document all component variants and states
- **Integration Guide**: How components fit into the larger system

## 🚀 Development Workflow

### Code Organization

- **Feature-Based Structure**: Group related functionality together
- **Consistent Naming**: Use clear, consistent naming conventions
- **Import Organization**: Group and order imports consistently
- **File Structure**: Follow established patterns for file organization

### Git Workflow

- **Atomic Commits**: Make small, focused commits with clear messages
- **Branch Naming**: Use descriptive branch names (feature/, fix/, refactor/)
- **Code Review**: All changes require review before merging
- **Semantic Versioning**: Follow semantic versioning for releases

### Quality Gates

- **Linting**: Code must pass ESLint and Prettier checks
- **Type Checking**: No TypeScript errors allowed
- **Testing**: Maintain test coverage above 80%
- **Performance**: Monitor bundle size and runtime performance

---

**Remember**: These guidelines exist to maintain code quality, consistency, and team productivity. When in doubt, prioritize readability, maintainability, and user experience.
