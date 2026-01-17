---
model: claude-sonnet-4-5-20250929
---

# Monitoring and Observability Setup

Set up production-ready monitoring, logging, and tracing infrastructure.

## Context
This command helps you implement monitoring and observability for your application including metrics collection, logging, distributed tracing, and alerting. It works with any application stack.

## Requirements
$ARGUMENTS

## Instructions

### Step 1: Check Application Context

First, understand what you're monitoring:
- Verify the application code and infrastructure exist
- Identify the technology stack (language, framework, deployment platform)
- Check for existing monitoring/logging setup to build upon
- Determine if this is a web app, API, microservices, or other architecture
- If no application code exists, ask the user if they want to build it first

### Step 2: Monitoring Strategy

**Three Pillars of Observability**
- **Metrics**: Numerical measurements over time
- **Logs**: Discrete events with context
- **Traces**: Request flow through distributed systems

**Coverage Areas**
- Application performance
- Infrastructure health
- Business metrics
- User experience
- Security events
- Cost tracking

### 2. Metrics Collection

**Application Metrics**
- Request rate (requests per second)
- Error rate (errors per second, percentage)
- Response time (p50, p95, p99, max)
- Throughput (transactions per second)
- Active connections/sessions
- Queue depth and processing time
- Cache hit/miss rates

**Infrastructure Metrics**
- CPU utilization (per host, per container)
- Memory usage (used, available, swap)
- Disk I/O (reads/writes, IOPS)
- Network I/O (bytes in/out, packets)
- Disk usage (capacity, inodes)
- Load average
- Process count

**Database Metrics**
- Query execution time
- Connection pool utilization
- Slow queries
- Lock contention
- Replication lag
- Cache hit ratio
- Deadlocks

**External Service Metrics**
- API response times
- API error rates
- Rate limit consumption
- Quota usage
- Dependency availability

### 3. Logging Infrastructure

**Log Levels**
- ERROR: System errors requiring immediate attention
- WARN: Warning conditions
- INFO: Informational messages
- DEBUG: Detailed debugging information
- TRACE: Very detailed tracing

**Structured Logging**
- JSON format for machine parsing
- Consistent field names
- Include timestamp, level, message
- Add correlation IDs
- Include contextual information
- Service name and version
- Environment identifier

**Log Aggregation**
- Central log collection
- Log parsing and indexing
- Search and filter capabilities
- Log retention policies
- Cost optimization
- Access control

**Log Content**
- Request/response logs (sanitized)
- Error messages and stack traces
- Performance metrics
- Security events
- Audit trail
- State changes
- Integration calls

### 4. Distributed Tracing

**Trace Implementation**
- Unique trace ID per request
- Span IDs for each operation
- Parent-child relationships
- Service dependencies mapping
- Latency breakdown
- Error propagation tracking

**Instrumentation**
- HTTP requests (inbound/outbound)
- Database queries
- Cache operations
- Message queue operations
- External API calls
- Background jobs

**Trace Sampling**
- Sample strategically (not 100%)
- Always trace errors
- Trace slow requests
- Adaptive sampling
- Important transactions traced

### 5. Health Checks

**Liveness Probes**
- Application is running
- Process is responsive
- Not deadlocked
- Can handle basic requests

**Readiness Probes**
- Application ready for traffic
- Dependencies available
- Database connectivity
- Cache connectivity
- External services reachable

**Health Check Endpoints**
- /health/live - Liveness check
- /health/ready - Readiness check
- /health/deps - Dependency status
- Include response times
- Include version information

### 6. Alerting Configuration

**Alert Criteria**
- Error rate threshold (e.g., >5%)
- Response time threshold (e.g., p95 >500ms)
- Resource utilization (e.g., CPU >80%)
- Service availability (e.g., uptime <99.9%)
- Business metrics (e.g., conversion rate drop)
- Security events (e.g., failed logins spike)

**Alert Routing**
- Severity-based routing (critical, high, medium, low)
- On-call rotation
- Escalation policies
- Team-based routing
- Time-based routing (business hours vs after-hours)

**Alert Quality**
- Actionable alerts only
- Clear problem description
- Relevant context included
- Suggested remediation
- Runbook links
- Avoid alert fatigue

### 7. Dashboards

**Infrastructure Dashboard**
- System health overview
- Resource utilization trends
- Service status
- Deployment timeline
- Error rates

**Application Dashboard**
- Request rates
- Response times
- Error rates
- Active users/sessions
- Transaction success rates
- API usage

**Business Dashboard**
- Key business metrics
- User activity
- Conversion funnel
- Revenue metrics
- Feature adoption
- Customer satisfaction

**Custom Dashboards**
- Service-specific views
- Team-specific views
- Investigation dashboards
- Real-time monitoring
- Historical analysis

### 8. Performance Monitoring

**Real User Monitoring (RUM)**
- Page load times
- Time to interactive
- First contentful paint
- Cumulative layout shift
- User geography
- Device types
- Browser types

**Synthetic Monitoring**
- Automated health checks
- Critical path testing
- Multi-location probes
- Uptime monitoring
- SSL certificate expiration
- DNS resolution

**Application Performance Monitoring (APM)**
- Transaction traces
- Slow transaction detection
- Database query performance
- External call performance
- Memory profiling
- Thread/goroutine analysis

### 9. Incident Management

**Incident Detection**
- Automated alert triggers
- Anomaly detection
- Threshold-based alerts
- Pattern recognition
- Composite conditions

**Incident Response**
- Alert notification
- Incident creation
- Team mobilization
- Status page updates
- Communication protocols
- Escalation procedures

**Post-Incident**
- Incident timeline
- Root cause analysis
- Remediation actions
- Process improvements
- Post-mortem documentation

### 10. Security Monitoring

**Security Events**
- Failed authentication attempts
- Authorization failures
- Unusual access patterns
- Data export activities
- Configuration changes
- Privilege escalation attempts

**Security Dashboards**
- Authentication activity
- API abuse patterns
- Vulnerability scan results
- Compliance status
- Security incident timeline

### 11. Cost Monitoring

**Resource Costs**
- Compute costs
- Storage costs
- Network transfer costs
- Database costs
- Third-party service costs

**Cost Optimization**
- Resource utilization efficiency
- Idle resource detection
- Right-sizing recommendations
- Reserved capacity planning
- Cost anomaly detection

### 12. Observability Best Practices

**Instrumentation**
- Instrument early in development
- Use standard metrics formats
- Add correlation IDs to all requests
- Log at appropriate levels
- Don't log sensitive data
- Make instrumentation configurable

**Data Management**
- Set appropriate retention periods
- Archive historical data
- Sample high-volume metrics
- Aggregate old metrics
- Control storage costs

**Team Practices**
- Define SLOs/SLIs
- Review dashboards regularly
- Refine alerts continuously
- Share runbooks
- Conduct incident reviews
- Update documentation

## Output Format

1. **Monitoring Architecture**: Overall monitoring strategy and components
2. **Metrics Configuration**: Application and infrastructure metrics setup
3. **Logging Setup**: Structured logging and aggregation configuration
4. **Tracing Implementation**: Distributed tracing instrumentation
5. **Health Checks**: Liveness and readiness probe configuration
6. **Alerting Rules**: Alert definitions with thresholds and routing
7. **Dashboard Definitions**: Key dashboards for different audiences
8. **Runbooks**: Operational procedures for common scenarios
9. **Documentation**: Monitoring setup and usage guide

Focus on creating comprehensive observability that enables rapid problem detection, efficient debugging, and data-driven decision making.
