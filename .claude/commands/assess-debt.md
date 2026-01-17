---
model: claude-sonnet-4-5-20250929
---

# Technical Debt Analysis and Remediation

Identify, quantify, and prioritize technical debt in your project.

## Context
This command helps you analyze technical debt to understand what's slowing down development, increasing bugs, and creating maintenance challenges. It works with any codebase.

## Requirements
$ARGUMENTS

## Instructions

### Step 1: Check Codebase

First, verify the codebase exists and identify what to analyze:
- Confirm the project/codebase exists
- Identify the technology stack and project structure
- Check for specific areas mentioned in $ARGUMENTS (or analyze the entire codebase)
- Look for existing code quality reports, linting configs, test coverage metrics
- If no codebase exists or the location is unclear, ask the user for clarification

### Step 2: Technical Debt Inventory

Conduct a thorough scan for all types of technical debt:

**Code Debt**
- Duplicated code (exact and similar patterns)
- Complex code (high complexity, deep nesting, long methods/functions)
- Poor structure (circular dependencies, tight coupling, feature envy)
- Dead code and unused variables
- Magic numbers and hardcoded values
- Poor naming conventions

**Architecture Debt**
- Missing abstractions and leaky abstractions
- Violated architectural boundaries
- Monolithic components
- Design pattern misuse
- Over-engineering or under-engineering

**Technology Debt**
- Outdated frameworks and libraries
- Deprecated API usage
- Legacy patterns (outdated approaches)
- Unsupported dependencies
- Security vulnerabilities

**Testing Debt**
- Untested code paths and missing edge cases
- No integration or end-to-end tests
- Brittle tests (environment-dependent)
- Slow or flaky tests
- Missing test documentation

**Documentation Debt**
- Missing API documentation
- Undocumented complex logic
- Missing architecture diagrams
- No onboarding guides
- Outdated documentation

**Infrastructure Debt**
- Manual deployment steps
- No rollback procedures
- Missing monitoring and alerting
- No performance baselines
- Inadequate logging

### 2. Impact Assessment

Calculate the real cost of each debt item:

**Development Velocity Impact**
- Time wasted on repetitive fixes
- Delay in implementing new features
- Increased onboarding time
- Context-switching overhead

**Quality Impact**
- Bug frequency and severity
- Time spent debugging
- Testing difficulties
- Deployment failures

**Business Impact**
- Lost revenue opportunities
- Customer satisfaction impact
- Team morale effects
- Technical limitations

**Risk Assessment**
- Critical: Security vulnerabilities, data loss risk
- High: Performance degradation, frequent outages
- Medium: Developer frustration, slow feature delivery
- Low: Code style issues, minor inefficiencies

### 3. Debt Metrics Dashboard

Create measurable KPIs:

**Code Quality Metrics**
- Cyclomatic complexity scores
- Code duplication percentage
- Test coverage (unit, integration, e2e)
- Dependency health (outdated, vulnerable)
- Lines of code per module
- Technical debt ratio

**Trend Analysis**
- Quarterly debt score progression
- Growth rate of debt
- Debt accumulation velocity
- Remediation progress tracking

### 4. Prioritized Remediation Plan

Create an actionable roadmap based on ROI:

**Quick Wins (High Value, Low Effort)**
- Extract duplicate logic to shared modules
- Add monitoring to critical services
- Automate manual processes
- Fix critical security issues
- Update vulnerable dependencies

**Medium-Term Improvements (1-3 months)**
- Refactor god classes/functions
- Add comprehensive test coverage
- Upgrade outdated frameworks
- Improve documentation
- Implement logging and monitoring

**Long-Term Initiatives (3-12 months)**
- Architectural improvements
- Technology modernization
- Complete test suite implementation
- Performance optimization
- Security hardening

### 5. Implementation Strategy

**Incremental Refactoring**
- Add facade over legacy code
- Implement new alongside old
- Gradual migration with feature flags
- Maintain backward compatibility
- Measure and validate improvements

**Team Allocation**
- Dedicate percentage of sprint capacity
- Assign roles and responsibilities
- Set clear sprint goals
- Track velocity impact
- Celebrate milestones

### 6. Prevention Strategy

Implement gates to prevent new debt:

**Automated Quality Gates**
- Complexity checks (max thresholds)
- Duplication detection
- Test coverage requirements
- Dependency vulnerability scanning
- Performance regression tests
- Architecture compliance checks

**Development Standards**
- Code review requirements
- Documentation requirements
- Testing standards
- Complexity limits
- Style guide enforcement

**Debt Budget**
- Maximum allowed increase per sprint
- Mandatory quarterly reduction targets
- Tracking mechanisms
- Reporting cadence

### 7. Communication Plan

**Stakeholder Reports**
- Current debt score and trajectory
- Impact on velocity and quality
- Investment required
- Expected ROI
- Risk assessment
- Proposed timeline

**Developer Documentation**
- Refactoring guidelines
- Code standards
- Testing requirements
- Documentation templates
- Architecture decision records

### 8. Success Metrics

**Monthly Tracking**
- Debt score reduction
- Bug rate changes
- Deployment frequency
- Lead time improvements
- Test coverage gains
- Developer satisfaction

**Quarterly Reviews**
- Architecture health assessment
- Performance benchmarks
- Security audit results
- Cost savings achieved
- Velocity improvements

## Output Format

1. **Debt Inventory**: Comprehensive categorized list with metrics
2. **Impact Analysis**: Cost calculations and risk assessments
3. **Prioritized Roadmap**: Quarter-by-quarter plan with deliverables
4. **Quick Wins**: Immediate actions for current sprint
5. **Implementation Guide**: Step-by-step refactoring strategies
6. **Prevention Plan**: Processes to avoid accumulating new debt
7. **ROI Projections**: Expected returns on debt reduction investment
8. **Success Metrics**: KPIs and tracking mechanisms

Focus on delivering measurable improvements that directly impact development velocity, system reliability, and team morale.
