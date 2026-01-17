---
model: claude-sonnet-4-5-20250929
---

# Error Trace Analysis

Analyze error traces, identify patterns, and recommend solutions.

## Context
This command helps you analyze production errors, understand error patterns, and implement fixes for issues occurring in live systems. It works with any codebase.

## Requirements
$ARGUMENTS

## Instructions

### Step 1: Gather Error Information

First, collect the error details:
- Check if the user has provided error traces, stack traces, or logs in $ARGUMENTS
- If error details are incomplete, ask the user for:
  - Complete error message and stack trace
  - Error timestamp and frequency
  - Request context (URL, parameters, user session info)
  - Server/environment details
  - Recent deployments or changes
- Search the codebase for files mentioned in the error trace
- If relevant code can't be found, ask for clarification on the codebase location

### Step 2: Error Collection Analysis

**Gather Error Information**
- Complete error message
- Full stack trace
- Error timestamp
- Request context (URL, method, parameters)
- User session information
- Server/instance identifier
- Application version
- Environment details

**Associated Data**
- Application logs around error time
- Database queries executed
- External API calls made
- Resource utilization metrics
- Recent deployments or changes

### 2. Stack Trace Analysis

**Read the Stack Trace**
- Identify the error type/exception
- Find the original error source (innermost relevant frame)
- Trace execution path through the stack
- Identify which code is yours vs libraries
- Look for patterns in call sequence

**Key Information**
- Error message and type
- File and line number where error occurred
- Function/method call chain
- Variable values (if available)
- Related errors or nested exceptions

### 3. Error Classification

**By Frequency**
- **Frequent**: Occurring constantly, affecting many users
- **Intermittent**: Occasional, hard to reproduce
- **Rare**: One-off or very uncommon
- **Spike**: Sudden increase in occurrence

**By Impact**
- **User-Facing**: Visible to users, affects experience
- **Background**: In async jobs or scheduled tasks
- **System**: Infrastructure or platform issues
- **Data**: Data integrity problems

**By Category**
- **Application Errors**: Bugs in code logic
- **Configuration Errors**: Misconfiguration
- **Resource Errors**: Out of memory, disk full, etc.
- **Network Errors**: Connectivity, timeouts, DNS
- **Integration Errors**: Third-party service failures
- **Security Errors**: Auth, permissions, validation

### 4. Pattern Recognition

**Error Patterns**
- Same error on different inputs
- Errors clustered by time
- Errors on specific user segments
- Errors from particular clients/versions
- Errors following deployments
- Errors correlated with load

**Trend Analysis**
- Error rate over time
- New error types introduced
- Resolved vs ongoing errors
- Error distribution across services
- Correlation with deployments

### 5. Root Cause Investigation

**Follow the Trail**
- What triggered the error?
- What state was the system in?
- What data was being processed?
- Were there any cascading failures?
- Are there related errors?

**Check Common Causes**
- Null/undefined/nil references
- Array index out of bounds
- Type mismatches
- Network timeouts
- Resource exhaustion
- Race conditions
- Deadlocks
- Missing error handling

### 6. Context Reconstruction

**Request Context**
- Reproduce with same inputs
- Understand user's action
- Check session state
- Review request parameters
- Examine headers and cookies

**System Context**
- Check system load
- Review resource availability
- Examine dependency health
- Check configuration values
- Review recent changes

### 7. Impact Assessment

**Immediate Impact**
- Number of affected users
- Frequency of occurrence
- Business operations affected
- Data consistency issues
- Security implications

**Ongoing Risk**
- Potential for escalation
- Likelihood of recurrence
- Blast radius if worsens
- Reputation impact
- Compliance concerns

### 8. Remediation Strategy

**Immediate Actions**
- Deploy hotfix if critical
- Rollback recent changes if causative
- Scale resources if exhaustion
- Toggle feature flag if isolated
- Add circuit breaker if cascading

**Short-term Fix**
- Implement proper error handling
- Add input validation
- Improve resource management
- Fix logic errors
- Update configuration

**Long-term Prevention**
- Refactor problematic code
- Add comprehensive tests
- Improve monitoring
- Update architecture
- Enhance documentation

### 9. Monitoring and Alerting

**Set Up Alerts**
- Error rate thresholds
- Specific error type occurrence
- Resource exhaustion warnings
- Integration failure notifications
- Performance degradation alerts

**Enhanced Logging**
- Add contextual information
- Log critical decision points
- Track request lifecycle
- Monitor resource usage
- Capture state changes

### 10. Documentation

**Error Documentation**
- Error description
- Root cause analysis
- Reproduction steps
- Fix implemented
- Prevention measures
- Related errors

**Runbook Entry**
- Detection methods
- Investigation steps
- Known fixes
- Escalation procedures
- Related documentation

### 11. Common Production Errors

**Memory Issues**
- Memory leaks
- Object retention
- Large payload processing
- Caching issues

**Concurrency Issues**
- Race conditions
- Deadlocks
- Thread starvation
- Connection pool exhaustion

**Integration Issues**
- API timeouts
- Rate limiting
- Authentication failures
- Data format mismatches

**Data Issues**
- Null reference errors
- Type conversion failures
- Constraint violations
- Data corruption

## Output Format

1. **Error Summary**: Type, frequency, and impact
2. **Stack Trace Analysis**: Detailed trace examination
3. **Pattern Analysis**: Error patterns and trends
4. **Root Cause**: Identified cause with evidence
5. **Impact Assessment**: Scope and severity
6. **Remediation Plan**: Immediate and long-term fixes
7. **Monitoring Setup**: Alerts and logging enhancements
8. **Prevention Strategy**: Steps to avoid recurrence
9. **Documentation**: Complete error report and runbook entry

Focus on rapid diagnosis and safe remediation that resolves the immediate issue while preventing future occurrences.
