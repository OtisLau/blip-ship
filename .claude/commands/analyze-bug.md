---
model: claude-sonnet-4-5-20250929
---

# Smart Bug Analysis

Analyze bugs systematically to identify root causes and recommend solutions.

## Context
This command helps you analyze bugs systematically, find the root cause, and implement fixes. It works with any codebase and bug type.

## Requirements
$ARGUMENTS

## Instructions

### Step 1: Gather Bug Information

First, collect information about the bug:
- Check if the user has provided error messages, stack traces, or logs in $ARGUMENTS
- If bug details are incomplete, ask the user for:
  - Error messages or symptoms
  - Steps to reproduce
  - When it started occurring
  - Environment details (OS, browser, versions, etc.)
- Search the codebase for relevant files mentioned in error traces
- If the codebase or relevant code can't be found, ask for clarification

### Step 2: Bug Information Analysis

**Initial Assessment**
- What is the observed behavior?
- What was the expected behavior?
- When did it start occurring?
- How frequently does it occur?
- Can it be reproduced consistently?
- What changed recently?

**Environment Details**
- Software versions
- Configuration settings
- Operating system
- Browser/client details
- Network conditions
- Data state when error occurs

**Evidence Collection**
- Error messages and stack traces
- Log files
- Screenshots or recordings
- Network requests/responses
- Database queries
- Performance metrics

### 2. Bug Classification

**By Severity**
- **Critical**: System down, data loss, security breach
- **High**: Major functionality broken, workaround difficult
- **Medium**: Feature impaired, workaround available
- **Low**: Minor issue, cosmetic problem

**By Type**
- **Logic Error**: Incorrect algorithm or condition
- **Runtime Error**: Crash or exception
- **Performance**: Slow operation or resource exhaustion
- **UI/UX**: Display or interaction problem
- **Integration**: External system communication failure
- **Data**: Corruption or inconsistency
- **Security**: Vulnerability or exposure

### 3. Root Cause Analysis

**The 5 Whys Technique**
1. Why did the problem occur? → Find immediate cause
2. Why did that happen? → Go deeper
3. Why did that occur? → Keep digging
4. Why? → Continue analysis
5. Why? → Reach root cause

**Hypothesis Formation**
- Form possible explanations
- Prioritize by likelihood
- Test hypotheses systematically
- Eliminate impossible causes
- Verify actual cause

**Common Root Causes**
- Incorrect assumptions
- Missing error handling
- Race conditions
- Resource exhaustion
- Configuration errors
- State management issues
- Dependency version conflicts
- Data validation gaps

### 4. Reproduction Steps

**Isolation**
- Minimal reproduction case
- Remove unnecessary steps
- Identify critical conditions
- Document exact sequence
- Note any timing dependencies

**Consistency Check**
- Reproduce multiple times
- Test on different environments
- Vary input parameters
- Check edge cases
- Test boundary conditions

### 5. Investigation Techniques

**Code Analysis**
- Read relevant code sections
- Check recent changes (git blame/history)
- Review related modules
- Examine error handling
- Verify input validation
- Check state management

**Data Analysis**
- Inspect database state
- Check data transformations
- Verify data flow
- Review data constraints
- Check for data races

**System Analysis**
- Check resource usage
- Review configuration
- Examine network calls
- Analyze timing and performance
- Check dependencies

### 6. Fix Strategies

**Immediate Fix**
- Address the symptom
- Stop the bleeding
- Deploy quickly if critical
- Document technical debt

**Root Cause Fix**
- Address underlying issue
- Prevent recurrence
- Refactor if necessary
- Add tests to prevent regression

**Preventive Measures**
- Add validation
- Improve error handling
- Add monitoring/alerts
- Update documentation
- Add tests for edge cases

### 7. Testing the Fix

**Verification**
- Fix resolves original issue
- No new issues introduced
- Edge cases handled
- Performance not degraded
- All tests pass

**Regression Testing**
- Run full test suite
- Test related functionality
- Check integration points
- Verify in production-like environment

### 8. Documentation

**Bug Report**
- Clear description
- Reproduction steps
- Expected vs actual behavior
- Environment details
- Evidence (logs, screenshots)
- Impact assessment

**Fix Documentation**
- Root cause explanation
- Solution description
- Code changes
- Testing performed
- Prevention measures
- Lessons learned

### 9. Prevention

**Code Improvements**
- Add missing tests
- Improve error handling
- Add validation
- Refactor complex code
- Add assertions
- Improve logging

**Process Improvements**
- Update code review checklist
- Add automated checks
- Improve testing coverage
- Update documentation
- Share lessons learned

### 10. Common Debugging Patterns

**Intermittent Issues**
- Add detailed logging
- Check for race conditions
- Look for timing dependencies
- Review async operations
- Check resource contention

**Performance Issues**
- Profile the application
- Identify bottlenecks
- Check database queries
- Review network calls
- Analyze algorithms

**Integration Issues**
- Verify API contracts
- Check data formats
- Review authentication
- Test error scenarios
- Validate assumptions

## Output Format

1. **Bug Analysis**: Classification and severity assessment
2. **Root Cause**: Detailed cause identification
3. **Reproduction Steps**: Minimal reproduction case
4. **Investigation Findings**: Evidence and analysis
5. **Fix Recommendation**: Proposed solution with rationale
6. **Testing Plan**: Verification and regression testing approach
7. **Prevention Measures**: Steps to prevent recurrence
8. **Documentation**: Complete bug report and fix documentation

Focus on systematic analysis that leads to effective fixes and prevents similar issues in the future.
