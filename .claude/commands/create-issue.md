---
model: claude-sonnet-4-5-20250929
---

# Create Comprehensive Issue

Analyze and document issues with complete, actionable descriptions.

## Context
This command helps you create well-documented issues with all necessary context for your project. It works with any codebase or project.

## Requirements
$ARGUMENTS

## Instructions

### Step 1: Check Context (Optional)

If the issue relates to existing code:
- Search for the relevant files, functions, or modules mentioned in $ARGUMENTS
- Gather context about the existing implementation
- Check for similar past issues or related code areas
- If specific code is mentioned but not found, note this in the issue

Note: If this is a feature request or general issue not tied to specific code, skip this step.

### Step 2: UNDERSTAND
- Analyze the problem described
- Identify the core issue vs symptoms
- Determine the scope and impact
- Ask clarifying questions if necessary

### 2. RESEARCH
- Search for similar past issues
- Review relevant documentation
- Examine related code sections
- Check for known workarounds
- Identify affected components

### 3. DOCUMENT

Create a comprehensive issue description with:

**Title**
- Clear, concise summary (50-80 characters)
- Include key terms for searchability
- Indicate severity if critical

**Problem Description**
- What is happening (observed behavior)
- What should happen (expected behavior)
- When did this start (if known)
- How often does it occur (frequency)
- Who is affected (impact scope)

**Steps to Reproduce**
1. Precise, numbered steps
2. Include all prerequisites
3. Specify environment details
4. Provide test data if needed
5. Note any timing dependencies

**Environment Information**
- System/platform details
- Version numbers
- Configuration settings
- Dependencies and their versions
- Browser/client information (if applicable)

**Impact Assessment**
- Severity level (critical/high/medium/low)
- Number of users affected
- Business impact
- Workarounds available
- Blocking other work?

**Evidence**
- Error messages (full stack traces)
- Log excerpts (relevant portions)
- Screenshots or recordings
- Network traces (if applicable)
- Performance metrics

**Expected vs Actual**
- Clear comparison table
- Specific examples
- Edge cases identified

**Suggested Solution** (if known)
- Potential fix approaches
- Areas of code to investigate
- Related issues or PRs
- Technical considerations

**Acceptance Criteria**
- Specific, testable conditions
- Definition of done
- Testing requirements
- Documentation needs

### 4. CATEGORIZE
- Assign appropriate labels
- Set priority level
- Link related issues
- Tag relevant team members
- Assign to appropriate milestone

### 5. FOLLOW-UP
- Monitor for questions
- Provide additional context as needed
- Update with new information
- Track progress
- Verify resolution

## Output Format

Provide a complete issue ready to be filed with:

1. **Issue Title**: Concise, searchable title
2. **Description**: Full problem description
3. **Reproduction Steps**: Detailed, numbered steps
4. **Environment**: System and version information
5. **Impact**: Severity and scope assessment
6. **Evidence**: Logs, errors, screenshots
7. **Acceptance Criteria**: Clear success conditions
8. **Labels & Metadata**: Categorization information

Focus on creating issues that are immediately actionable, contain all necessary context, and can be understood by anyone on the team without additional explanation.
