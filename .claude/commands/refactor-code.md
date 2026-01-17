---
model: claude-sonnet-4-5-20250929
---

# Refactor and Clean Code

Analyze and refactor code to improve its quality, maintainability, and performance.

## Context
This command helps you refactor existing code to make it cleaner, more maintainable, and aligned with best practices. It works with any codebase and programming language.

## Requirements
$ARGUMENTS

## Instructions

### Step 1: Check for Code to Refactor

First, verify that the code or module to refactor exists in the codebase:
- Search for the file, function, or module mentioned in the requirements
- If not found, ask the user to clarify the location or provide more details
- If the code doesn't exist yet, suggest using the implement-code command instead

### Step 2: Code Analysis

First, analyze the current code for:

**Code Smells**
- Long methods/functions (>20-50 lines depending on language)
- Large classes/modules (>200-500 lines)
- Duplicate code blocks
- Dead code and unused variables
- Complex conditionals and nested loops (>3 levels)
- Magic numbers and hardcoded values
- Poor naming conventions
- Tight coupling between components
- Missing abstractions

**SOLID Violations**
- Single Responsibility Principle violations
- Open/Closed Principle issues
- Liskov Substitution problems
- Interface Segregation concerns
- Dependency Inversion violations

**Performance Issues**
- Inefficient algorithms (O(n²) or worse)
- Unnecessary object creation
- Memory leaks potential
- Blocking operations
- Missing caching opportunities

### 2. Refactoring Strategy

Create a prioritized refactoring plan:

**Immediate Fixes (High Impact, Low Effort)**
- Extract magic numbers to constants
- Improve variable and function names
- Remove dead code
- Simplify boolean expressions
- Extract duplicate code to functions

**Method Extraction**
- Break long functions into smaller, focused ones
- Each function should do one thing well
- Extract complex logic into named functions
- Reduce parameter count (max 3-4)
- Eliminate side effects

**Class/Module Decomposition**
- Extract responsibilities to separate components
- Create clear interfaces for dependencies
- Implement dependency injection
- Use composition over inheritance
- Apply appropriate design patterns

**Pattern Application**
- Factory pattern for object creation
- Strategy pattern for algorithm variants
- Observer pattern for event handling
- Repository pattern for data access
- Decorator pattern for extending behavior
- Command pattern for operations
- Builder pattern for complex construction

### 3. Clean Code Principles

Apply these principles:

**Meaningful Names**
- Names should reveal intent
- Use pronounceable names
- Use searchable names
- Avoid abbreviations
- One word per concept
- Use solution/problem domain names

**Functions**
- Small (ideally <20 lines)
- Do one thing
- One level of abstraction per function
- Descriptive names
- Minimal arguments (0-2 ideal, max 3-4)
- No side effects
- Command-Query Separation

**Error Handling**
- Use exceptions, not error codes
- Don't return null (use optional/maybe pattern)
- Write try-catch-finally blocks cleanly
- Provide context with exceptions
- Define exception classes when needed

**Comments**
- Code should be self-documenting
- Comments explain WHY, not WHAT
- Legal/informative comments only
- No commented-out code
- No redundant comments
- Use meaningful function names instead

**Formatting**
- Consistent indentation
- Vertical spacing for readability
- Related code stays together
- Dependent functions close
- Horizontal alignment (avoid long lines)
- Team coding standards

### 4. Refactored Implementation

Provide the complete refactored code with:

**Structure Improvements**
- Clear separation of concerns
- Proper abstraction levels
- Logical organization
- Minimal coupling
- High cohesion

**Code Organization**
```
Before:
- 200-line function doing multiple things
- Duplicate logic across files
- Magic numbers throughout
- Unclear variable names

After:
- Multiple focused functions (<20 lines each)
- Shared logic in utility modules
- Named constants with meaning
- Descriptive names
```

**Design Patterns**
Apply appropriate patterns:
- Creational: Factory, Builder, Singleton
- Structural: Adapter, Decorator, Facade
- Behavioral: Strategy, Observer, Command

### 5. Testing Considerations

Ensure refactored code is testable:

**Testability Improvements**
- Inject dependencies
- Avoid global state
- Pure functions where possible
- Clear inputs and outputs
- Mockable external dependencies

**Maintain Test Coverage**
- Run existing tests during refactoring
- Add tests for new functions
- Ensure no regression
- Update tests if interfaces change

### 6. Performance Optimization

Where appropriate:

**Algorithm Improvements**
- Replace O(n²) with O(n log n) or O(n)
- Use appropriate data structures
- Eliminate unnecessary loops
- Cache expensive computations

**Resource Management**
- Proper cleanup (close files, connections)
- Avoid memory leaks
- Minimize object creation
- Use lazy loading
- Implement pooling where needed

### 7. Documentation

Update or add:

**Code Documentation**
- Function/method doc strings
- Complex logic explanations
- Public API documentation
- Usage examples

**Architecture Documentation**
- Updated diagrams
- Design decision records
- Refactoring notes
- Migration guides

### 8. Validation

Before completing:

**Quality Checks**
- All tests pass
- No new warnings
- Code coverage maintained or improved
- Performance not degraded
- No new security issues

**Review Checklist**
- Code is more readable
- Functions are smaller and focused
- Duplication eliminated
- Names are meaningful
- Complexity reduced
- SOLID principles followed
- Error handling improved
- Tests still pass

## Output Format

1. **Analysis Report**: Issues found and their severity
2. **Refactoring Plan**: Prioritized list of changes
3. **Refactored Code**: Complete, improved implementation
4. **Comparison**: Before/after key metrics
5. **Testing Results**: All tests passing
6. **Documentation**: Updated docs and comments
7. **Migration Notes**: Steps to integrate changes

Focus on practical improvements that make code easier to understand, maintain, and extend, without unnecessary complexity or over-engineering.
