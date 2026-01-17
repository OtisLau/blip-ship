---
model: claude-sonnet-4-5-20250929
---

# Pull Request Enhancer

Create comprehensive, well-documented pull requests that facilitate effective code reviews.

## Context
This command helps you create or improve pull requests to make them easy to review and well-documented. It works with any Git repository.

## Requirements
$ARGUMENTS

## Instructions

### Step 1: Check Git Context

First, verify the Git and PR context:
- Check if this is a Git repository (look for .git directory)
- Check for uncommitted changes or recent commits using git commands
- If a PR already exists, ask for the PR number or URL
- Identify the branch and compare it with the base branch
- If no Git repository is found, inform the user that this command requires a Git project

### Step 2: PR Title

**Title Format**
- Clear, concise description of changes
- Include type prefix (feat:, fix:, docs:, refactor:, etc.)
- Reference issue number if applicable
- Use imperative mood ("Add feature" not "Added feature")
- Keep under 72 characters

**Examples**
- `feat: Add user authentication with JWT`
- `fix: Resolve memory leak in data processing`
- `docs: Update API documentation for v2 endpoints`
- `refactor: Extract validation logic to separate module`

### 2. PR Description

**Summary Section**
- What does this PR do?
- Why is this change needed?
- What problem does it solve?
- High-level approach taken

**Changes Section**
- Bullet list of key changes
- Organized by category (backend, frontend, database, etc.)
- Include file/component names
- Mention breaking changes prominently
- List new dependencies

**Technical Details**
- Architecture or design decisions
- Implementation approach
- Trade-offs considered
- Alternative approaches rejected (and why)
- Performance implications
- Security considerations

### 3. Visual Evidence

**Screenshots**
- Before/after comparisons
- New UI features
- Error states
- Mobile responsive views
- Different user states
- Edge cases

**Screen Recordings**
- User flow demonstrations
- Interaction animations
- Complex workflows
- Performance improvements
- Error handling

**Diagrams**
- Architecture changes
- Data flow changes
- Sequence diagrams
- State transitions

### 4. Testing Evidence

**Test Coverage**
- Unit tests added/modified
- Integration tests added
- E2E tests for critical paths
- Test coverage percentage
- Edge cases tested

**Testing Performed**
- Manual testing checklist
- Browsers tested
- Devices tested
- Different user roles tested
- Performance testing results
- Security testing performed

**Test Results**
- All tests passing
- Screenshot of test results
- Performance benchmarks
- Before/after metrics

### 5. Review Checklist

**Code Quality**
- [ ] Code follows style guidelines
- [ ] No linting errors
- [ ] No debug code or console logs
- [ ] Comments added for complex logic
- [ ] No commented-out code
- [ ] Error handling implemented
- [ ] Input validation added

**Testing**
- [ ] All tests passing
- [ ] New tests added for new functionality
- [ ] Edge cases covered
- [ ] Error scenarios tested
- [ ] Performance tested
- [ ] Security tested

**Documentation**
- [ ] README updated (if needed)
- [ ] API documentation updated
- [ ] Inline code documentation added
- [ ] Configuration documented
- [ ] Migration guide added (if breaking changes)

**Security**
- [ ] No sensitive data exposed
- [ ] Input validation implemented
- [ ] Authentication/authorization checked
- [ ] Dependencies security scanned
- [ ] No SQL injection vulnerabilities
- [ ] XSS protection in place

**Performance**
- [ ] No performance regressions
- [ ] Database queries optimized
- [ ] Caching implemented where needed
- [ ] Resource usage acceptable
- [ ] Load tested (if applicable)

### 6. Breaking Changes

**If Breaking Changes**
- Clearly mark as BREAKING CHANGE
- Explain what breaks
- Provide migration guide
- Show before/after examples
- Update version (major bump)
- Add deprecation warnings first (if possible)

### 7. Dependencies

**New Dependencies**
- List new dependencies added
- Justify why each is needed
- Consider bundle size impact
- Check license compatibility
- Verify maintenance status
- Security scan results

**Updated Dependencies**
- List updated dependencies
- Reason for update
- Breaking changes in dependencies
- Test compatibility

### 8. Deployment Notes

**Deployment Requirements**
- Environment variable changes
- Database migrations needed
- Configuration changes
- Infrastructure changes
- Feature flags to toggle
- Rollback procedure

**Deployment Order**
- If multiple services, specify order
- Dependencies between services
- Database migrations timing
- Cache invalidation needs

### 9. Related Issues

**Link Related Items**
- Closes #123 (issue this fixes)
- Related to #456 (related issue)
- Blocks #789 (issue this blocks)
- Blocked by #321 (blocking issue)
- Part of milestone X

### 10. Reviewer Guidance

**Review Focus Areas**
- What to pay special attention to
- Known concerns or trade-offs
- Areas where you need specific feedback
- Questions for reviewers
- Estimated review time

**Review Strategy**
- Suggest reviewing commit-by-commit (if logical commits)
- Highlight files with major changes
- Note files with only minor changes
- Suggest starting with specific files

### 11. Size Management

**Keep PRs Small**
- Aim for <400 lines of code changes
- Focus on single concern
- Split large changes into multiple PRs
- Use stacked PRs for dependent changes

**If Large PR**
- Explain why it must be large
- Provide review guide
- Break into logical sections
- Consider feature flags for incremental review

### 12. Communication

**Tone and Language**
- Be clear and professional
- Explain "why" not just "what"
- Be respectful of reviewers' time
- Welcome feedback
- Acknowledge uncertainties

**Responding to Feedback**
- Respond to all comments
- Mark resolved threads
- Explain reasoning for pushback
- Thank reviewers
- Request re-review when ready

### 13. PR Templates

**Feature PR Template**
```markdown
## Summary
[Brief description of the feature]

## Motivation
[Why is this feature needed?]

## Changes
- [Change 1]
- [Change 2]

## Screenshots/Recordings
[Visual evidence]

## Testing
- [How to test]
- [Test results]

## Checklist
- [ ] Tests added
- [ ] Documentation updated
- [ ] No breaking changes

## Closes
Closes #[issue number]
```

**Bug Fix PR Template**
```markdown
## Bug Description
[What was the bug?]

## Root Cause
[Why did it happen?]

## Fix
[How did you fix it?]

## Testing
[How to verify the fix]

## Regression Prevention
[Tests added to prevent regression]

## Closes
Closes #[issue number]
```

### 14. Draft PRs

**Use Draft PRs For**
- Work in progress
- Early feedback
- Design discussions
- Exploring approaches
- Sharing context

**Draft PR Guidelines**
- Mark as draft
- Explain it's WIP
- State what feedback you need
- Update when ready for full review
- Convert to ready when complete

## Output Format

1. **PR Title**: Clear, descriptive title with type prefix
2. **PR Description**: Comprehensive description with all sections
3. **Visual Evidence**: Screenshots, recordings, or diagrams
4. **Testing Evidence**: Test results and coverage
5. **Review Checklist**: Complete checklist
6. **Deployment Notes**: Any special deployment requirements
7. **Reviewer Guidance**: Help for efficient review

Focus on creating PRs that are easy to review, well-documented, and include all context needed for confident merging.
