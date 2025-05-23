# Debugging Setup

This project is configured for easy debugging with VS Code. Here's how to use the debugging features:

## Quick Start

1. **Press F5** or go to `Run and Debug` view in VS Code
2. Select "Debug: Chrome + Vite Dev Server"
3. The debugger will:
   - Start the Vite dev server (`pnpm run dev`)
   - Wait for the server to be ready
   - Launch Chrome with the development URL
   - Enable debugging capabilities

## Available Debug Configurations

### Debug: Chrome + Vite Dev Server

- **Purpose**: Full development debugging
- **What it does**:
  - Runs `pnpm run dev` in the background
  - Launches Chrome with debugging enabled
  - Maps source files for breakpoint debugging
  - Enables React DevTools integration

### Attach to Chrome

- **Purpose**: Attach to an already running Chrome instance
- **Usage**: For when you want to debug an existing browser session
- **Requirement**: Chrome must be started with `--remote-debugging-port=9222`

## Features

- ✅ **Source Maps**: Full TypeScript debugging support
- ✅ **React DevTools**: Component inspection and profiling
- ✅ **Hot Reload**: Changes reflect immediately without losing state
- ✅ **Breakpoints**: Set breakpoints in your TypeScript/React code
- ✅ **Console Access**: Full access to browser console and network tabs
- ✅ **Auto Server Management**: Automatically starts/stops dev server

## Troubleshooting

### Port Already in Use

If port 5173 is already in use, the debug session will fail. Run:

```bash
pkill -f 'vite'
```

Or use the "Kill Dev Server" task from the Command Palette.

### Chrome Profile Issues

If Chrome has issues, delete the debug profile:

```bash
rm -rf .vscode/chrome-debug-profile
```

### Server Not Starting

Check that all dependencies are installed:

```bash
pnpm install
```

## Manual Commands

If you prefer manual control:

```bash
# Start dev server manually
pnpm run dev

# Kill dev server
pkill -f 'vite'

# Build for production
pnpm run build

# Preview production build
pnpm run preview
```
