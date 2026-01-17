---
model: claude-sonnet-4-5-20250929
---

# Docker Container Optimization

Optimize Docker images and containers for size, security, and performance.

## Context
This command helps you optimize Docker containers for production use by reducing image size, improving build times, enhancing security, and following best practices. It works with any Dockerized application.

## Requirements
$ARGUMENTS

## Instructions

### Step 1: Check for Docker Files

First, verify what Docker-related files exist:
- Look for Dockerfile(s) in the project
- Check for docker-compose.yml or docker-compose.yaml
- Check for .dockerignore file
- Identify the application stack and dependencies from the Dockerfile
- If no Dockerfile is found, ask the user if they want to create one first, or clarify the location

### Step 2: Image Size Optimization

**Multi-Stage Builds**
- Separate build and runtime stages
- Copy only necessary artifacts to final image
- Use minimal base images for runtime
- Discard build dependencies
- Reduce layer count

**Base Image Selection**
- Use slim or alpine variants when possible
- Consider distroless images for security
- Match base image to application needs
- Keep base images updated
- Use specific version tags (not `:latest`)

**Layer Optimization**
- Combine related commands in single RUN
- Order layers by change frequency (least to most)
- Use .dockerignore to exclude unnecessary files
- Clean package manager cache in same layer
- Remove temporary files before layer finishes

### 2. Build Performance

**Caching Strategy**
- Order instructions to maximize cache hits
- Copy dependency files before source code
- Install dependencies before copying code
- Use BuildKit for better caching
- Leverage --mount=type=cache

**Build Context**
- Use .dockerignore file
- Exclude node_modules, build artifacts, .git
- Keep context small
- Use build arguments for configuration
- Mount secrets don't leak to layers

### 3. Security Hardening

**User Configuration**
- Don't run as root
- Create non-privileged user
- Set USER instruction
- Use read-only filesystem where possible
- Drop unnecessary capabilities

**Vulnerability Reduction**
- Scan images for vulnerabilities
- Update base images regularly
- Remove unnecessary packages
- Use minimal base images
- Sign and verify images

**Secrets Management**
- Never hardcode secrets
- Use BuildKit secrets
- Use Docker secrets or environment variables
- Don't copy secrets into image layers
- Scan for accidentally committed secrets

### 4. Runtime Optimization

**Resource Limits**
- Set memory limits
- Set CPU limits
- Configure restart policies
- Set ulimits appropriately
- Monitor resource usage

**Health Checks**
- Implement HEALTHCHECK instruction
- Check application readiness
- Set appropriate intervals
- Handle startup time
- Log health check failures

**Logging**
- Use JSON logging driver
- Configure log rotation
- Aggregate logs centrally
- Don't log sensitive data
- Use structured logging

### 5. Networking

**Port Configuration**
- Expose only necessary ports
- Use port mapping appropriately
- Document exposed ports
- Use internal networks for service communication
- Implement proper firewall rules

**DNS Configuration**
- Configure DNS servers if needed
- Use service discovery
- Set hostname appropriately
- Configure network aliases

### 6. Storage Optimization

**Volume Strategy**
- Use volumes for persistent data
- Use bind mounts for development
- Use tmpfs for temporary data
- Don't store data in container layer
- Configure volume drivers appropriately

**Data Management**
- Implement backup strategies
- Use volume plugins for advanced features
- Configure volume permissions
- Plan data migration strategies
- Monitor volume usage

### 7. Development vs Production

**Development Configuration**
- Hot reloading support
- Mount source code
- Expose debug ports
- Verbose logging
- Disable security constraints for debugging

**Production Configuration**
- Optimized build
- Minimal image size
- Enhanced security
- Health checks enabled
- Resource limits set
- Read-only root filesystem

### 8. Container Orchestration Readiness

**Kubernetes Compatibility**
- Graceful shutdown handling
- Signal handling (SIGTERM)
- Liveness and readiness probes
- Resource requests and limits
- ConfigMaps and Secrets support

**Docker Compose**
- Service dependencies
- Volume configurations
- Network definitions
- Environment variables
- Resource constraints

### 9. Monitoring and Observability

**Metrics Exposure**
- Expose metrics endpoints
- Log to stdout/stderr
- Structured logging format
- Tracing support
- Performance instrumentation

**Debugging Support**
- Include debugging tools in debug builds
- Support remote debugging
- Enable verbose logging via environment
- Expose admin endpoints securely

### 10. CI/CD Integration

**Build Automation**
- Automated image builds
- Tag strategy (semantic versioning)
- Multi-architecture builds
- Image scanning in pipeline
- Automated testing

**Registry Management**
- Push to private registry
- Image signing
- Vulnerability scanning
- Retention policies
- Access control

### 11. Best Practices

**Dockerfile Structure**
- Use official base images
- Pin specific versions
- Group related instructions
- Clear, commented Dockerfile
- Follow principle of least privilege
- One process per container

**Image Management**
- Tag images meaningfully
- Use semantic versioning
- Clean up old images
- Scan for vulnerabilities regularly
- Document image contents

**Documentation**
- Document exposed ports
- Document volumes
- Document environment variables
- Provide usage examples
- Include troubleshooting guide

### 12. Common Optimizations

**Package Manager Optimization**
- Clean cache in same layer
- Use --no-install-recommends
- Remove package lists
- Combine install commands
- Pin package versions

**File System Optimization**
- Remove build artifacts
- Compress where appropriate
- Use hardlinks for duplicates
- Clean temporary files
- Optimize file permissions

## Output Format

1. **Current State Analysis**: Image size, layers, vulnerabilities
2. **Optimized Dockerfile**: Complete, production-ready Dockerfile
3. **Multi-Stage Build**: Separate build and runtime stages
4. **Security Configuration**: User, permissions, vulnerability fixes
5. **Performance Tuning**: Caching, resource limits, health checks
6. **Comparison**: Before/after metrics
7. **Docker Compose**: Production-ready compose configuration
8. **CI/CD Integration**: Build and deployment pipeline
9. **Documentation**: Usage instructions and best practices

Focus on practical optimizations that significantly reduce image size, improve security, and maintain or enhance performance.
