---
model: claude-sonnet-4-5-20250929
---

# Implement Code

Implement the requested feature or functionality.

## Context
This command helps you implement new features, functionality, or code based on your requirements. It works in any codebase regardless of structure.

## Requirements
$ARGUMENTS

## Instructions

### Step 1: Check for Existing Tests

First, check if there are any existing tests related to this feature in the codebase:
- Search for test files that might cover this functionality
- Look for test frameworks (Jest, Pytest, JUnit, etc.)
- Check if there's a testing structure in place

### Step 2: Implementation Process

Use Task tool with subagent_type="general-purpose" to implement the requested functionality.

**Prompt**: "Implement the following functionality: $ARGUMENTS

Follow these guidelines:

**1. Understand Requirements**
- Analyze the requirements described in $ARGUMENTS
- Identify what needs to be built
- Determine scope and boundaries
- Clarify any ambiguities

**2. Check Codebase Context**
- If tests exist for this feature, review them to understand expected behavior
- If no tests exist, implement based on requirements
- Look for existing similar functionality to maintain consistency
- Review the project's coding patterns and conventions

**3. Implementation Strategy**
- Start with the simplest working implementation
- Use clear, readable code
- Follow the project's existing patterns
- Keep functions/methods focused and small
- Add appropriate error handling
- Include input validation where needed

**4. Code Quality**
- Write clean, maintainable code
- Use meaningful variable and function names
- Add comments for complex logic
- Follow language-specific idioms and best practices
- Keep the code simple and avoid over-engineering
- Ensure code is testable

**5. Testing Approach**
- If tests exist: Run them to verify implementation
- If no tests exist: Manually test the functionality
- Test happy paths and edge cases
- Verify error handling works correctly
- Check for any regressions in existing functionality

**6. Documentation**
- Add inline comments for complex logic
- Update relevant documentation if needed
- Document any assumptions made
- Note any areas that might need future improvement

**Output should include:**
- Complete, working implementation
- Test results (if tests exist)
- Any manual testing steps performed
- Notes on implementation decisions
- Suggestions for future improvements"

## Post-Implementation

After implementation:
1. Verify the functionality works as intended
2. Run any existing tests to ensure no regressions
3. Document the implementation
4. Note any areas for future refactoring or improvement

## Best Practices

- Write code that's easy to understand and maintain
- Follow the project's existing conventions
- Keep the implementation focused on the requirements
- Don't add unnecessary features
- Make it work correctly first, optimize later if needed
