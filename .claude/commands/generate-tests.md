---
model: claude-sonnet-4-5-20250929
---

# Comprehensive Test Harness Generator

Create comprehensive, maintainable test suites for your application.

## Context
This command helps you create a complete testing strategy and implementation for your application. It works with any codebase and adapts to your technology stack.

## Requirements
$ARGUMENTS

## Instructions

### Step 1: Check Existing Codebase

First, analyze what exists in the codebase:
- Search for the code/modules that need testing
- Check for existing testing infrastructure (test directories, frameworks)
- Identify the technology stack and project structure
- If code doesn't exist yet, suggest implementing it first

### Step 2: Testing Framework Selection

Choose appropriate testing frameworks based on technology stack and project requirements.

**Consider**
- Language/platform native testing tools
- Community support and documentation
- Integration with CI/CD
- Mocking and assertion capabilities
- Async/await support
- Performance testing needs
- Browser automation requirements

### 2. Testing Pyramid

Implement comprehensive testing at all levels:

**Unit Tests (70% of tests)**
- Test individual functions/methods in isolation
- Fast execution (<1s for entire suite)
- No external dependencies
- Mock all dependencies
- High code coverage (80%+)
- Test edge cases and boundaries

**Integration Tests (20% of tests)**
- Test component interactions
- Database integration
- API contract testing
- External service mocking
- Moderate execution time (<30s)
- Test data setup and teardown

**End-to-End Tests (10% of tests)**
- Test complete user flows
- Real browser automation
- Full stack integration
- Slower execution (minutes)
- Critical path coverage
- Production-like environment

### 3. Test Organization

**Directory Structure**
```
tests/
├── unit/
│   ├── services/
│   ├── models/
│   └── utils/
├── integration/
│   ├── api/
│   ├── database/
│   └── external/
├── e2e/
│   ├── scenarios/
│   └── page-objects/
├── performance/
└── fixtures/
```

**Test Naming Conventions**
- Descriptive names that explain what is being tested
- Format: `test_<functionality>_<scenario>_<expected_result>`
- Group related tests together
- Use consistent patterns across codebase

### 4. Unit Testing Implementation

**Test Structure (AAA Pattern)**
- **Arrange**: Set up test data and dependencies
- **Act**: Execute the code being tested
- **Assert**: Verify the expected outcome

**Best Practices**
- One assertion per test (ideally)
- No side effects between tests
- Fast execution
- Deterministic results
- Clear failure messages
- Test both success and failure paths

**Mocking Strategy**
- Mock external dependencies
- Mock slow operations
- Use test doubles (stubs, mocks, spies)
- Don't mock what you don't own (when possible)
- Verify mock interactions

### 5. Integration Testing

**Database Testing**
- Use test database
- Seed test data
- Transaction rollback between tests
- Test migrations
- Test queries and relationships

**API Testing**
- Test all endpoints
- Verify request/response schemas
- Test authentication and authorization
- Test error scenarios
- Validate status codes
- Check response times

**External Services**
- Mock external APIs during testing
- Contract testing for service boundaries
- Test error handling and retries
- Verify timeout behavior

### 6. End-to-End Testing

**Browser Automation**
- Use modern automation tools
- Page object pattern
- Wait strategies (avoid sleeps)
- Screenshot on failure
- Video recording
- Parallel execution

**Test Scenarios**
- Critical user journeys
- Complete workflows
- Cross-browser testing
- Mobile responsive testing
- Accessibility testing

### 7. Performance Testing

**Load Testing**
- Gradual load increase
- Peak load testing
- Endurance testing
- Spike testing
- Stress testing

**Metrics to Track**
- Response times (p50, p95, p99)
- Throughput (requests/sec)
- Error rates
- Resource utilization
- Concurrent users

### 8. Test Data Management

**Fixtures**
- Reusable test data
- Factory patterns for object creation
- Randomized test data
- Test data versioning
- Cleanup strategies

**Test Database**
- Separate test database
- Automated setup and teardown
- Consistent initial state
- Transaction isolation

### 9. Continuous Testing

**CI/CD Integration**
- Run tests on every commit
- Parallel test execution
- Fast feedback loop
- Test result reporting
- Coverage tracking
- Failure notifications

**Pre-commit Hooks**
- Run linting
- Run fast unit tests
- Check code formatting
- Prevent committing broken code

### 10. Test Quality

**Code Coverage**
- Track coverage metrics
- Set minimum thresholds
- Identify untested code
- Cover edge cases
- Don't chase 100% (80% is usually good)

**Test Maintenance**
- Keep tests simple
- Remove flaky tests
- Update tests with code changes
- Refactor test code like production code
- Document complex test setups

### 11. Common Testing Patterns

**Property-Based Testing**
- Generate random test inputs
- Verify invariants hold
- Discover edge cases automatically
- Complement example-based tests

**Contract Testing**
- Verify API contracts
- Provider and consumer testing
- Prevent breaking changes
- Document API behavior

**Mutation Testing**
- Verify test effectiveness
- Find weak tests
- Improve test quality
- Measure test suite strength

### 12. Debugging Tests

**Strategies**
- Run single test in isolation
- Add detailed logging
- Use debugger breakpoints
- Check test data
- Verify mocks and stubs
- Review test execution order

## Output Format

1. **Testing Strategy**: Overall approach and framework selection
2. **Test Structure**: Directory organization and naming conventions
3. **Unit Tests**: Comprehensive unit test suite
4. **Integration Tests**: Component integration tests
5. **E2E Tests**: Critical path scenarios
6. **Performance Tests**: Load and stress testing setup
7. **Test Data**: Fixtures and factories
8. **CI/CD Configuration**: Automated testing pipeline
9. **Documentation**: Testing guide and best practices

Focus on creating a maintainable test suite that provides confidence in code quality while remaining fast and reliable.
