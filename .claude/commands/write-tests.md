---
model: claude-sonnet-4-5-20250929
---

# Write Tests

Write comprehensive tests for the specified functionality.

## Context
This command helps you create thorough tests for your code. It works with any codebase and testing framework.

## Requirements
$ARGUMENTS

## Instructions

### Step 1: Check Testing Setup

First, check what testing infrastructure exists in the codebase:
- Look for existing test files and identify the testing framework (Jest, Pytest, JUnit, etc.)
- Check the project structure to see where tests should be located
- If no testing framework exists, recommend setting one up based on the project's language

### Step 2: Test Generation Process

Use Task tool with subagent_type="general-purpose" to generate tests.

**Prompt**: "Generate comprehensive tests for: $ARGUMENTS

Follow these guidelines:

**1. Test Structure Setup**
- Use the project's existing testing framework (or recommend one if none exists)
- Set up test fixtures and necessary imports
- Configure test runners and assertion libraries
- Use descriptive test naming conventions
- Create test data builders for complex objects

**2. Test Coverage**
- Define clear expected behaviors from requirements
- Cover happy path scenarios thoroughly
- Include edge cases and boundary conditions
- Add error handling and exception scenarios
- Consider null/undefined/empty input cases
- Test async operations if applicable

**3. Test Implementation**
- Write descriptive test names that document intent
- Keep tests focused on single behaviors
- Use Arrange-Act-Assert (AAA) pattern consistently
- Ensure test independence - each test must be isolated
- Use meaningful test data (avoid generic 'foo', 'bar')

**4. Test Categories**
- **Unit Tests**: Test individual functions/methods in isolation
- **Integration Tests**: Test how components work together
- **Contract Tests**: Verify API and interface contracts
- **End-to-End Tests**: Test complete user workflows (if applicable)

**5. Test Quality Checklist**
- ✓ Tests are readable and self-documenting
- ✓ Failure messages clearly indicate what went wrong
- ✓ Tests follow DRY principle with appropriate abstractions
- ✓ Coverage includes positive, negative, and edge cases
- ✓ Tests can serve as living documentation
- ✓ Tests focus on behavior, not implementation details
- ✓ Tests use meaningful, realistic data

**6. Best Practices**
- Write tests that verify behavior, not implementation
- Keep test setup simple and clear
- Make tests maintainable and flexible
- Write tests that are fast to execute
- Ensure tests provide clear feedback on failure
- Avoid test interdependencies

**Output should include:**
- Complete test file(s) with all necessary imports
- Clear documentation of what each test validates
- Commands to run the tests
- Coverage metrics where available
- Notes on any testing decisions made"

## After Writing Tests

After generating tests:
1. Run the tests to verify they work correctly
2. Check that tests provide clear feedback on failures
3. Verify tests are independent and can run in any order
4. Ensure comprehensive coverage of the functionality
5. Document any testing assumptions or decisions

## Best Practices

- Tests should clearly document the expected behavior
- Write tests that are easy to understand and maintain
- Focus on testing behavior, not implementation details
- Keep tests simple and focused
- Make sure test failures provide helpful information
