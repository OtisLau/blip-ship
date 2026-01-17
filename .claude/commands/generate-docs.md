---
model: claude-sonnet-4-5-20250929
---

# Documentation Generator

Generate comprehensive, clear documentation for your project.

## Context
This command helps you create comprehensive documentation for your project including API docs, user guides, and developer documentation. It works with any codebase.

## Requirements
$ARGUMENTS

## Instructions

### Step 1: Check What to Document

First, verify what exists in the codebase:
- Search for the code, APIs, or features mentioned in $ARGUMENTS
- Identify the project structure and technology stack
- Look for existing documentation to build upon or update
- Check for API endpoints, modules, or components that need documentation
- If the code doesn't exist yet or is unclear, ask the user for clarification

### Step 2: Documentation Types

**API Documentation**
- Endpoint descriptions
- Request/response formats
- Authentication methods
- Error codes
- Rate limiting
- Code examples in multiple languages
- Interactive API explorer

**User Documentation**
- Getting started guide
- Feature documentation
- Tutorial walkthroughs
- FAQ
- Troubleshooting guide
- Best practices
- Video tutorials (script outlines)

**Developer Documentation**
- Architecture overview
- Setup instructions
- Development guide
- Contributing guidelines
- Code style guide
- Testing guide
- Deployment guide

**Reference Documentation**
- Function/method references
- Class documentation
- Configuration options
- Environment variables
- Command-line interfaces
- Database schema

### 2. API Documentation

**Endpoint Documentation**
- HTTP method and path
- Description and purpose
- Authentication requirements
- Request parameters (path, query, body)
- Request headers
- Request body schema
- Response status codes
- Response body schema
- Example requests and responses
- Error scenarios

**API Specification Format**
- OpenAPI/Swagger specification
- GraphQL schema documentation
- gRPC proto file documentation
- WebSocket event documentation

**Authentication Documentation**
- Authentication methods supported
- How to obtain credentials
- How to include credentials in requests
- Token refresh procedures
- Permissions and scopes
- Security best practices

### 3. User Guide

**Getting Started**
- Installation instructions
- Initial setup and configuration
- First steps tutorial
- Quick start guide
- System requirements
- Prerequisites

**Feature Documentation**
- Feature overview
- Use cases
- Step-by-step instructions
- Screenshots and diagrams
- Tips and tricks
- Common pitfalls

**Tutorials**
- Goal-oriented walkthroughs
- Progressive complexity
- Real-world examples
- Code samples
- Expected outcomes
- Next steps

### 4. Developer Guide

**Architecture Documentation**
- System overview diagram
- Component descriptions
- Data flow diagrams
- Technology stack
- Design patterns used
- Architectural decisions (ADRs)

**Setup Instructions**
- Environment setup
- Dependency installation
- Database setup
- Configuration
- Running locally
- Common setup issues

**Development Workflow**
- Branching strategy
- Coding standards
- Commit message format
- Code review process
- Testing requirements
- Deployment process

### 5. Code Documentation

**Inline Documentation**
- Function/method doc comments
- Parameter descriptions
- Return value descriptions
- Exception documentation
- Usage examples
- Implementation notes

**Module Documentation**
- Module purpose
- Public API
- Dependencies
- Configuration
- Examples
- Known limitations

### 6. Configuration Documentation

**Environment Variables**
- Variable name
- Description
- Required/Optional
- Default value
- Example values
- Valid values/format

**Configuration Files**
- File location
- File format
- Configuration options
- Default configuration
- Example configurations
- Common configurations

### 7. Troubleshooting Guide

**Common Issues**
- Problem description
- Symptoms
- Likely causes
- Solution steps
- Prevention measures
- Related issues

**Error Messages**
- Error code/message
- What it means
- Common causes
- How to fix
- When to escalate
- Log locations

**Debugging Guide**
- How to enable debug mode
- What logs to check
- Diagnostic commands
- Performance profiling
- Network debugging
- Database debugging

### 8. Release Documentation

**Release Notes**
- Version number and date
- New features
- Improvements
- Bug fixes
- Breaking changes
- Deprecations
- Migration guide

**Changelog**
- Chronological list of changes
- Categorized by type (feature, fix, etc.)
- Links to issues/PRs
- Credits to contributors

**Migration Guides**
- What changed
- Why it changed
- How to migrate
- Before/after examples
- Deprecation timeline
- Support resources

### 9. Best Practices

**Writing Guidelines**
- Use clear, simple language
- Write in active voice
- Use consistent terminology
- Include examples
- Keep documentation up-to-date
- Structure logically
- Use headings and lists
- Add diagrams where helpful

**Code Examples**
- Complete, runnable examples
- Show common use cases
- Include error handling
- Add explanatory comments
- Test examples regularly
- Multiple language examples
- Copy-paste ready

**Diagrams and Visuals**
- Architecture diagrams
- Sequence diagrams
- Flow charts
- Entity-relationship diagrams
- UI screenshots
- Annotated images
- GIFs for interactions

### 10. Documentation Structure

**Organization**
- Logical hierarchy
- Clear navigation
- Search functionality
- Table of contents
- Breadcrumbs
- Cross-references
- Index

**Versioning**
- Version-specific documentation
- Version switcher
- Deprecation notices
- Legacy documentation archived
- Migration paths clear

### 11. Interactive Documentation

**API Playground**
- Try API calls in browser
- Pre-filled examples
- Authentication handling
- Response inspection
- Code generation
- Share API calls

**Live Examples**
- Interactive code samples
- Editable and runnable
- Immediate feedback
- Multiple examples
- Progressive disclosure

### 12. Documentation Maintenance

**Keep Updated**
- Update with code changes
- Review regularly
- Fix errors promptly
- Add missing information
- Remove outdated content
- Update screenshots

**Quality Checks**
- Spelling and grammar
- Link validation
- Code example testing
- Consistency check
- Completeness review
- Accessibility compliance

**User Feedback**
- Feedback mechanism
- Track common questions
- Monitor documentation usage
- Conduct user testing
- Implement improvements

## Output Format

1. **API Documentation**: Complete API reference with OpenAPI spec
2. **User Guide**: Getting started and feature documentation
3. **Developer Guide**: Setup, architecture, and development workflow
4. **Code Documentation**: Inline comments and module documentation
5. **Configuration Reference**: All configuration options documented
6. **Troubleshooting Guide**: Common issues and solutions
7. **Release Notes**: Current version release notes
8. **README**: Project overview and quick start
9. **CONTRIBUTING**: Contribution guidelines

Focus on creating documentation that is accurate, comprehensive, well-organized, and serves the needs of different audiences from end users to contributors.
