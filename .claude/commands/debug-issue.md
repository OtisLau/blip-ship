---
model: claude-sonnet-4-5-20250929
---

# Debug Issue Configuration

Set up debugging environments, distributed tracing, and diagnostic tools.

## Context
This command helps you set up debugging and tracing capabilities to efficiently diagnose issues, track down bugs, and understand system behavior. It works with any codebase and technology stack.

## Requirements
$ARGUMENTS

## Instructions

### Step 1: Check Current Setup

First, analyze the existing codebase and setup:
- Check if the code/project exists and identify the technology stack
- Look for existing debugging configurations (IDE settings, debugger configs)
- Identify existing logging infrastructure
- Review current monitoring and observability setup (if any)
- If the project doesn't exist, help set it up first

### Step 2: Development Environment Debugging

**IDE Configuration**
- Set up debugger launch configurations
- Configure breakpoint settings
- Enable source maps for compiled languages
- Set up conditional breakpoints
- Configure watch expressions
- Enable step-through debugging

**Debugger Features**
- Breakpoints (line, conditional, logpoints)
- Step over/into/out
- Call stack inspection
- Variable inspection
- Watch expressions
- Debug console/REPL

### 2. Logging Configuration

**Log Levels**
- ERROR: System errors requiring immediate attention
- WARN: Warning messages for potential issues
- INFO: General informational messages
- DEBUG: Detailed debugging information
- TRACE: Very detailed tracing information

**Structured Logging**
- Use JSON format for machine parsing
- Include timestamp, level, message
- Add correlation IDs for request tracking
- Include contextual information
- Use consistent field names
- Avoid logging sensitive data

**Log Aggregation**
- Central log collection system
- Log parsing and indexing
- Search and filter capabilities
- Alert configuration
- Log retention policies

### 3. Distributed Tracing

**Tracing Components**
- Unique trace ID per request
- Span IDs for each operation
- Parent-child span relationships
- Timing information
- Tags and annotations
- Error tracking

**Trace Collection**
- Instrument application entry points
- Add spans for external calls
- Include database operations
- Track async operations
- Propagate trace context
- Sample strategically (not 100%)

### 4. Error Tracking

**Error Monitoring**
- Automatic error capture
- Stack trace collection
- Environment context
- User session data
- Breadcrumb trail
- Error grouping and deduplication

**Error Notifications**
- Real-time alerting
- Threshold-based alerts
- Team assignments
- Escalation policies
- Integration with team chat

### 5. Performance Profiling

**Application Profiling**
- CPU profiling
- Memory profiling
- Heap snapshots
- Allocation tracking
- Event loop monitoring
- Thread/goroutine analysis

**Database Profiling**
- Query execution time
- Query plans
- Slow query logging
- Connection pool monitoring
- Lock contention analysis

### 6. Debugging Strategies

**Problem Isolation**
- Reproduce the issue consistently
- Identify minimal reproduction case
- Isolate failing component
- Check recent changes
- Review error messages and logs
- Verify assumptions

**Investigation Techniques**
- Binary search (commenting out code sections)
- Add logging/print statements
- Use debugger breakpoints
- Check variable values
- Verify control flow
- Examine stack traces

### 7. Production Debugging

**Safe Production Debugging**
- Enable debug endpoints with authentication
- Use feature flags for debug mode
- Implement circuit breakers
- Add health check endpoints
- Monitor resource usage
- Plan rollback strategy

**Production Logs**
- Structured logging
- Correlation IDs
- Request/response logging (sanitized)
- Performance metrics
- Error tracking
- Audit trails

### 8. Debugging Tools

**Command Line Tools**
- Process inspection tools
- Network debugging tools
- System monitoring tools
- Log analysis tools
- Performance profiling tools

**Browser DevTools**
- Network panel for API calls
- Console for errors and logs
- Sources for breakpoints
- Performance profiling
- Memory leak detection

### 9. Common Issues

**Performance Problems**
- Identify slow operations
- Check database queries
- Review network calls
- Analyze CPU/memory usage
- Look for blocking operations
- Check for memory leaks

**Logic Errors**
- Verify input data
- Check conditional logic
- Review loop conditions
- Validate assumptions
- Test edge cases
- Check error handling

**Integration Issues**
- Verify API contracts
- Check authentication
- Review network connectivity
- Validate data formats
- Test timeout scenarios
- Check error responses

### 10. Debug Documentation

**Debugging Guides**
- Common issues and solutions
- Debugging checklist
- Tool usage instructions
- Environment setup
- FAQ section

**Runbooks**
- Incident response procedures
- Debug commands
- Log locations
- Key metrics to check
- Escalation procedures

## Output Format

1. **Debug Configuration**: IDE and tool setup
2. **Logging Setup**: Structured logging implementation
3. **Tracing Configuration**: Distributed tracing setup
4. **Error Monitoring**: Error tracking and alerting
5. **Profiling Tools**: Performance analysis setup
6. **Debug Procedures**: Step-by-step debugging guides
7. **Production Setup**: Safe production debugging
8. **Documentation**: Debugging guides and runbooks

Focus on creating a comprehensive debugging environment that enables quick issue resolution in both development and production environments.
