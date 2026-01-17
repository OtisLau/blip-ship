---
model: claude-sonnet-4-5-20250929
---

# Accessibility Audit

Perform comprehensive accessibility audits for WCAG compliance and inclusive design.

## Context
This command helps you assess your application's accessibility to ensure it's usable by people with disabilities. It works with any web application or UI codebase.

## Requirements
$ARGUMENTS

## Instructions

### Step 1: Check for UI Code

First, verify what UI code exists to audit:
- Search for frontend code (HTML, JSX, Vue templates, React components, etc.)
- Look for styling files (CSS, SCSS, styled-components, etc.)
- Identify the frontend framework/technology being used
- If specific components are mentioned in $ARGUMENTS, verify they exist
- If no UI code is found or it's unclear, ask the user for clarification
- If this is a backend-only project, inform the user that accessibility audits apply to frontend/UI code

### Step 2: Accessibility Standards

**WCAG 2.1 Conformance Levels**
- **Level A**: Minimum accessibility (must meet)
- **Level AA**: Recommended level (should meet)
- **Level AAA**: Enhanced accessibility (nice to have)

**Four Principles (POUR)**
- **Perceivable**: Information must be presentable to users
- **Operable**: UI components must be operable
- **Understandable**: Information and operation must be understandable
- **Robust**: Content must work with assistive technologies

### 2. Perceivable Content

**Text Alternatives**
- Alt text for images
- Captions for audio
- Transcripts for audio and video
- Text descriptions for complex images
- Empty alt for decorative images
- Long descriptions for data visualizations

**Adaptable Content**
- Semantic HTML structure
- Meaningful heading hierarchy
- Proper list markup
- Table headers and associations
- Form label associations
- Reading order makes sense

**Distinguishable Content**
- Color contrast ratios (4.5:1 minimum for text)
- Don't use color alone to convey information
- Resizable text (up to 200%)
- Images of text avoided
- Audio control
- Visual focus indicators

### 3. Operable Interface

**Keyboard Accessibility**
- All functionality via keyboard
- No keyboard traps
- Logical tab order
- Skip navigation links
- Keyboard shortcuts documented
- Focus visible at all times

**Enough Time**
- Adjustable time limits
- Pause/stop/hide moving content
- No automatic updates that disrupt
- Warning before timeout
- Session timeout extensions

**Seizures and Physical Reactions**
- No flashing content (3 times per second)
- Animation controls
- Motion reduction support
- Parallax effects optional

**Navigable**
- Page titles descriptive
- Focus order logical
- Link text meaningful
- Multiple navigation methods
- Clear headings and labels
- Current location indicated
- Breadcrumb navigation

### 4. Understandable Information

**Readable Text**
- Language of page specified
- Language of parts specified
- Unusual words explained
- Abbreviations expanded
- Reading level appropriate (or alternatives provided)
- Pronunciation guides where needed

**Predictable Behavior**
- Focus doesn't cause context changes
- Input doesn't cause unexpected changes
- Consistent navigation
- Consistent identification of components
- Changes only on request

**Input Assistance**
- Error identification clear
- Labels and instructions provided
- Error suggestions given
- Error prevention for important actions
- Context-sensitive help available

### 5. Robust Content

**Compatible with Assistive Technologies**
- Valid HTML
- ARIA roles, states, and properties correctly used
- Name, role, value for custom controls
- Status messages programmatically determined
- Parsing errors fixed

**Future-Proof**
- Standards-compliant code
- Progressive enhancement
- Graceful degradation
- Works without JavaScript (or alternatives provided)
- Responsive design

### 6. Common Issues

**Visual Issues**
- Poor color contrast
- Small text
- Lack of visual focus indicators
- Color-only information
- Images without alt text
- No dark mode support

**Keyboard Issues**
- Non-keyboard accessible controls
- Illogical tab order
- Keyboard traps
- No skip links
- Missing keyboard shortcuts

**Screen Reader Issues**
- Missing ARIA labels
- Incorrect ARIA roles
- Unlabeled form fields
- Tables without headers
- Unclear link text ("click here")
- Missing heading structure

**Content Issues**
- Auto-playing media
- Time-limited content
- Flashing content
- Complex language
- Unclear error messages
- Missing instructions

### 7. Testing Methods

**Automated Testing**
- Use accessibility testing tools
- Check HTML validation
- Color contrast checkers
- Heading structure analysis
- Form label verification
- ARIA usage validation

**Manual Testing**
- Keyboard-only navigation
- Screen reader testing (NVDA, JAWS, VoiceOver)
- Browser zoom testing (200%+)
- Color blind simulation
- Cognitive load assessment
- Mobile accessibility testing

**User Testing**
- Test with users with disabilities
- Diverse disability types
- Real assistive technologies
- Actual user tasks
- Feedback collection

### 8. Assistive Technology Support

**Screen Readers**
- NVDA (Windows, free)
- JAWS (Windows, commercial)
- VoiceOver (macOS/iOS, built-in)
- TalkBack (Android, built-in)
- ORCA (Linux, free)

**Other Assistive Technologies**
- Screen magnifiers
- Voice control software
- Switch controls
- Braille displays
- Alternative input devices

### 9. Remediation Guidance

**Quick Wins**
- Add missing alt text
- Fix color contrast issues
- Add skip links
- Fix form labels
- Ensure keyboard accessibility

**Medium Effort**
- Implement proper heading structure
- Add ARIA landmarks
- Create keyboard shortcuts
- Improve error messages
- Add captions to videos

**Major Improvements**
- Redesign complex interactions
- Restructure navigation
- Create accessible alternatives
- Comprehensive screen reader support
- Full WCAG AA compliance

### 10. Accessibility Statement

**Include**
- Conformance level achieved
- Known issues and workarounds
- Contact information for feedback
- Alternative access methods
- Assistive technology compatibility
- Date of last review

## Output Format

1. **Executive Summary**: Overall accessibility score and key findings
2. **WCAG Compliance Report**: Level A, AA, AA issues
3. **Issue List**: Prioritized accessibility issues with severity
4. **Remediation Guide**: Step-by-step fixes for each issue
5. **Code Examples**: Before/after code snippets
6. **Testing Results**: Automated and manual testing findings
7. **Best Practices**: Recommendations for ongoing compliance
8. **Accessibility Statement**: Draft statement for users

Focus on practical, implementable fixes that improve accessibility for the widest range of users, prioritizing issues that affect the most people or prevent access entirely.
