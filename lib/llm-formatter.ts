/**
 * LLM Context Formatter
 * Formats UI issues into structured prompts for LLM consumption
 * to generate code fixes.
 */

import { UIIssue } from './types';
import { AnalyticsEvent } from '../types/events';
import { resolveComponent, getComponentContext } from './component-registry';

/**
 * Format a single issue for LLM consumption
 */
export async function formatIssueForLLM(issue: UIIssue): Promise<string> {
  // Get component code
  const component = resolveComponent(issue.elementSelector, issue.sampleEvents[0]?.elementText);
  let componentCode = '';
  let componentPath = issue.componentPath;
  let componentName = issue.componentName;

  if (component) {
    const context = await getComponentContext(component);
    componentCode = context.code || '';
    componentPath = context.path;
    componentName = context.name;
  }

  // Format sample events for context
  const sampleEventsFormatted = issue.sampleEvents
    .slice(0, 3)
    .map(e => ({
      type: e.type,
      selector: e.elementSelector,
      text: e.elementText?.slice(0, 50),
      position: e.x && e.y ? `(${e.x}, ${e.y})` : undefined,
    }));

  return `## UI Issue Report

### Issue ID
${issue.id}

### Severity
${issue.severity.toUpperCase()} (${issue.eventCount} occurrences across ${issue.uniqueSessions} sessions)

### Category
${issue.category.replace(/_/g, ' ')}

---

### The Problem
${issue.problemStatement}

### What Users Are Trying To Do
${issue.userIntent}

### What Currently Happens
${issue.currentOutcome}

### Suggested Fix Direction
${issue.suggestedFix}

---

### Location
- **Component**: ${componentName}
- **File**: ${componentPath}
- **Element Selector**: \`${issue.elementSelector}\`

### Sample User Events
\`\`\`json
${JSON.stringify(sampleEventsFormatted, null, 2)}
\`\`\`

---

### Component Source Code
\`\`\`tsx
${componentCode}
\`\`\`

---

### Instructions for Fix
1. Analyze the component code above
2. Identify the element matching selector \`${issue.elementSelector}\`
3. Implement a fix that addresses: ${issue.userIntent}
4. Ensure the fix is minimal and focused
5. Maintain existing functionality and styling
6. Return the complete modified component code
`;
}

/**
 * Format multiple issues into a summary report
 */
export async function formatIssuesSummary(issues: UIIssue[]): Promise<string> {
  const severityCounts = {
    critical: issues.filter(i => i.severity === 'critical').length,
    high: issues.filter(i => i.severity === 'high').length,
    medium: issues.filter(i => i.severity === 'medium').length,
    low: issues.filter(i => i.severity === 'low').length,
  };

  const categoryCounts = {
    frustration: issues.filter(i => i.category === 'frustration').length,
    missing_feature: issues.filter(i => i.category === 'missing_feature').length,
    conversion_blocker: issues.filter(i => i.category === 'conversion_blocker').length,
  };

  const componentCounts = new Map<string, number>();
  for (const issue of issues) {
    const count = componentCounts.get(issue.componentName) || 0;
    componentCounts.set(issue.componentName, count + 1);
  }

  const topComponents = Array.from(componentCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  let summary = `# UI/UX Issues Summary

## Overview
- **Total Issues Detected**: ${issues.length}
- **Time Period**: Last 24 hours

## By Severity
| Severity | Count |
|----------|-------|
| Critical | ${severityCounts.critical} |
| High | ${severityCounts.high} |
| Medium | ${severityCounts.medium} |
| Low | ${severityCounts.low} |

## By Category
| Category | Count |
|----------|-------|
| User Frustration | ${categoryCounts.frustration} |
| Missing Features | ${categoryCounts.missing_feature} |
| Conversion Blockers | ${categoryCounts.conversion_blocker} |

## Most Affected Components
${topComponents.map(([name, count]) => `- **${name}**: ${count} issue(s)`).join('\n')}

---

## Issues List

`;

  for (const issue of issues) {
    summary += `### ${issue.severity.toUpperCase()}: ${issue.problemStatement}
- **Component**: ${issue.componentName}
- **Selector**: \`${issue.elementSelector}\`
- **Impact**: ${issue.eventCount} events, ${issue.uniqueSessions} sessions
- **Suggested Fix**: ${issue.suggestedFix}

`;
  }

  return summary;
}

/**
 * Format an issue for a business-friendly email
 */
export function formatIssueForEmail(issue: UIIssue): {
  subject: string;
  headline: string;
  description: string;
  impact: string;
  fixDescription: string;
} {
  // Create business-friendly descriptions
  const categoryDescriptions: Record<string, string> = {
    frustration: 'User Experience Issue',
    missing_feature: 'Feature Opportunity',
    conversion_blocker: 'Conversion Issue',
  };

  const severityEmojis: Record<string, string> = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢',
  };

  return {
    subject: `${severityEmojis[issue.severity]} ${categoryDescriptions[issue.category]}: ${issue.problemStatement.slice(0, 60)}`,
    headline: issue.problemStatement,
    description: `We analyzed user behavior on your site and found that ${issue.eventCount} users (across ${issue.uniqueSessions} sessions) experienced this issue in the last 24 hours.`,
    impact: `${issue.userIntent}. Currently, ${issue.currentOutcome.toLowerCase()}.`,
    fixDescription: issue.suggestedFix,
  };
}

/**
 * Create a structured JSON format for API consumption
 */
export async function formatIssueAsJSON(issue: UIIssue): Promise<{
  issue: UIIssue;
  llmPrompt: string;
  emailContent: ReturnType<typeof formatIssueForEmail>;
  componentCode: string | null;
}> {
  const component = resolveComponent(issue.elementSelector, issue.sampleEvents[0]?.elementText);
  let componentCode: string | null = null;

  if (component) {
    const context = await getComponentContext(component);
    componentCode = context.code;
  }

  return {
    issue,
    llmPrompt: await formatIssueForLLM(issue),
    emailContent: formatIssueForEmail(issue),
    componentCode,
  };
}
