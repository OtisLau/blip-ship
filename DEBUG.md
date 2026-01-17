# Debugging Guide for Blip Ship

## Table of Contents
1. [Development Environment Setup](#development-environment-setup)
2. [VS Code Debugging](#vs-code-debugging)
3. [Common Debugging Scenarios](#common-debugging-scenarios)
4. [Performance Profiling](#performance-profiling)
5. [Logging Best Practices](#logging-best-practices)
6. [Troubleshooting](#troubleshooting)

---

## Development Environment Setup

### Prerequisites
- Node.js >= 18.17.0
- pnpm >= 8.0.0
- VS Code (recommended)

### Initial Setup
```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Run with Turbopack (faster)
pnpm dev:turbo

# Type checking
pnpm type-check

# Linting
pnpm lint

# Format code
pnpm format
```

---

## VS Code Debugging

### Available Debug Configurations

#### 1. Debug Server-Side Code
- **Configuration**: "Next.js: debug server-side"
- **Use Case**: Debug API routes, server components, middleware
- **How to Use**:
  1. Set breakpoints in server-side code
  2. Press F5 or select "Next.js: debug server-side" from debug panel
  3. Server will start with debugger attached

#### 2. Debug Client-Side Code
- **Configuration**: "Next.js: debug client-side"
- **Use Case**: Debug React components, client interactions
- **How to Use**:
  1. Start dev server: `pnpm dev`
  2. Set breakpoints in client components
  3. Select "Next.js: debug client-side"
  4. Browser will launch with debugger attached

#### 3. Debug Full Stack
- **Configuration**: "Next.js: debug full stack"
- **Use Case**: Debug both client and server simultaneously
- **How to Use**:
  1. Set breakpoints in both client and server code
  2. Press F5 or select "Next.js: debug full stack"
  3. Debug both sides seamlessly

#### 4. Attach to Running Server
- **Configuration**: "Next.js: attach to running server"
- **Use Case**: Attach debugger to already running development server
- **How to Use**:
  1. Start server with inspect flag: `NODE_OPTIONS='--inspect' pnpm dev`
  2. Select "Next.js: attach to running server"
  3. Debugger will attach to port 9229

### Setting Breakpoints

#### Line Breakpoints
- Click in the gutter next to line numbers
- Or press F9 on the desired line

#### Conditional Breakpoints
- Right-click breakpoint → "Edit Breakpoint"
- Add condition (e.g., `userId === '123'`)

#### Logpoints
- Right-click in gutter → "Add Logpoint"
- Enter message with variables: `User {userId} logged in`
- No need to modify code

---

## Common Debugging Scenarios

### 1. Component Not Rendering

**Symptoms**: Component doesn't appear or shows unexpected behavior

**Debug Steps**:
```typescript
// Add console logs to track rendering
export default function MyComponent({ data }) {
  console.log('MyComponent rendered with data:', data)

  // Check if data exists
  if (!data) {
    console.warn('MyComponent: data is missing')
    return null
  }

  return <div>{data.name}</div>
}
```

**VS Code Debug**:
- Set breakpoint in component function
- Inspect props and state
- Check React DevTools

### 2. API Route Issues

**Symptoms**: API calls failing, unexpected responses

**Debug Steps**:
```typescript
// app/api/example/route.ts
export async function GET(request: Request) {
  console.log('API route called:', request.url)

  try {
    const result = await someOperation()
    console.log('Operation result:', result)
    return Response.json(result)
  } catch (error) {
    console.error('API error:', error)
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}
```

**VS Code Debug**:
- Set breakpoint in route handler
- Inspect request object
- Step through async operations

### 3. State Management Issues

**Symptoms**: State not updating, stale data

**Debug Steps**:
```typescript
import { useState, useEffect } from 'react'

export default function Example() {
  const [data, setData] = useState([])

  useEffect(() => {
    console.log('Effect running, current data:', data)
    fetchData().then(newData => {
      console.log('Fetched data:', newData)
      setData(newData)
    })
  }, []) // Check dependencies

  console.log('Render with data:', data)

  return <div>{data.length} items</div>
}
```

**VS Code Debug**:
- Set breakpoints in useState callback
- Inspect closure variables
- Check effect dependencies

### 4. Performance Issues

**Symptoms**: Slow rendering, laggy interactions

**Debug Steps**:
```typescript
// Use React Profiler
import { Profiler } from 'react'

function onRenderCallback(
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) {
  console.log(`${id} took ${actualDuration}ms to render`)
}

export default function App() {
  return (
    <Profiler id="App" onRender={onRenderCallback}>
      <YourComponent />
    </Profiler>
  )
}
```

---

## Performance Profiling

### Browser DevTools

#### Performance Tab
1. Open DevTools (F12)
2. Go to Performance tab
3. Click Record
4. Interact with app
5. Stop recording
6. Analyze timeline

#### Memory Tab
1. Take heap snapshot
2. Perform actions
3. Take another snapshot
4. Compare snapshots
5. Identify memory leaks

### Next.js Build Analysis

```bash
# Analyze bundle size
pnpm analyze

# This will:
# 1. Build the production bundle
# 2. Generate bundle size report
# 3. Open interactive visualization
```

### React DevTools Profiler

1. Install React DevTools extension
2. Open DevTools → Profiler tab
3. Click Record
4. Interact with component
5. Stop recording
6. Review flame graph

---

## Logging Best Practices

### Development Logging

```typescript
// Use console methods appropriately
console.log('General info')      // General information
console.info('Info message')     // Informational messages
console.warn('Warning')          // Potential issues
console.error('Error')           // Errors that need attention
console.debug('Debug info')      // Detailed debug info

// Group related logs
console.group('User Login')
console.log('Email:', email)
console.log('Timestamp:', new Date())
console.groupEnd()

// Time operations
console.time('Database Query')
await db.query()
console.timeEnd('Database Query')
```

### Production Logging

```typescript
// Create logger utility
// lib/logger.ts
export const logger = {
  info: (message: string, meta?: object) => {
    if (process.env.NODE_ENV === 'production') {
      // Send to logging service
      // e.g., Sentry, LogRocket, etc.
    } else {
      console.log(message, meta)
    }
  },

  error: (message: string, error: Error, meta?: object) => {
    if (process.env.NODE_ENV === 'production') {
      // Send to error tracking service
    } else {
      console.error(message, error, meta)
    }
  }
}

// Usage
import { logger } from '@/lib/logger'

logger.info('User action', { userId, action: 'login' })
logger.error('Failed to fetch', error, { endpoint: '/api/data' })
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: "Module not found" errors

**Solution**:
```bash
# Clear Next.js cache
pnpm clean

# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Restart dev server
pnpm dev
```

#### Issue: TypeScript errors not showing

**Solution**:
```bash
# Run type check manually
pnpm type-check

# Check VS Code TypeScript version
# CMD+Shift+P → "TypeScript: Select TypeScript Version"
# Choose "Use Workspace Version"
```

#### Issue: Hot reload not working

**Solution**:
```bash
# 1. Check if too many files are being watched
# Increase file watcher limit (macOS/Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# 2. Restart dev server
pnpm dev

# 3. Try turbo mode
pnpm dev:turbo
```

#### Issue: Build succeeds but runtime errors

**Solution**:
1. Check browser console for errors
2. Verify environment variables are set
3. Check network tab for failed requests
4. Enable source maps in production (temporarily):
   ```js
   // next.config.js
   module.exports = {
     productionBrowserSourceMaps: true,
   }
   ```

#### Issue: Memory leaks

**Solution**:
```typescript
// Ensure cleanup in useEffect
useEffect(() => {
  const subscription = observable.subscribe()

  // Cleanup function
  return () => {
    subscription.unsubscribe()
  }
}, [])

// Cancel pending requests
useEffect(() => {
  const abortController = new AbortController()

  fetch('/api/data', { signal: abortController.signal })
    .then(handleData)

  return () => {
    abortController.abort()
  }
}, [])
```

---

## Additional Resources

### Next.js Debugging
- [Next.js Debugging Docs](https://nextjs.org/docs/app/building-your-application/configuring/debugging)
- [React DevTools](https://react.dev/learn/react-developer-tools)

### VS Code Extensions
- ESLint: Real-time linting
- Prettier: Code formatting
- Tailwind CSS IntelliSense: Tailwind autocomplete
- Error Lens: Inline error display
- GitLens: Git integration

### Performance Tools
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [@next/bundle-analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)

---

## Quick Reference Commands

```bash
# Development
pnpm dev                 # Start dev server
pnpm dev:turbo          # Start with Turbopack
pnpm build              # Build for production
pnpm start              # Start production server

# Code Quality
pnpm lint               # Run ESLint
pnpm lint:fix           # Fix ESLint issues
pnpm type-check         # Run TypeScript compiler
pnpm format             # Format code with Prettier
pnpm format:check       # Check formatting

# Debugging
pnpm analyze            # Analyze bundle size
pnpm clean              # Clean cache and build files

# Node debugging
NODE_OPTIONS='--inspect' pnpm dev    # Start with inspector
NODE_OPTIONS='--inspect-brk' pnpm dev # Start with breakpoint
```
