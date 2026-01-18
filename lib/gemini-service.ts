/**
 * Gemini Service - Analyzes detected issues and recommends fixes
 * Uses Gemini 2.1 Flash for fast, cost-effective analysis
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { UIIssue } from './types';
import { promises as fs } from 'fs';
import path from 'path';
import { loadElementIndex, getElementsByComponent, IndexedElement } from './element-indexer';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

export interface FixRecommendation {
  issueId: string;
  confidence: number; // 0-1
  summary: string;
  changeType: 'attribute' | 'style' | 'text' | 'structure';
  changes: Array<{
    file: string;
    elementSelector: string;
    action: 'add_attribute' | 'modify_attribute' | 'change_style' | 'change_text';
    attribute?: string;
    value?: string;
    oldValue?: string;
    reason: string;
  }>;
  expectedImpact: string;
  rationale: string;
}

/**
 * Read component source code for context
 */
async function readComponentCode(componentPath: string): Promise<string | null> {
  try {
    const fullPath = path.join(process.cwd(), componentPath);
    const code = await fs.readFile(fullPath, 'utf-8');
    return code;
  } catch {
    return null;
  }
}

/**
 * Analyze issues and recommend the highest-confidence fix
 */
export async function analyzeIssuesAndRecommendFix(
  issues: UIIssue[]
): Promise<FixRecommendation | null> {
  if (issues.length === 0) {
    return null;
  }

  // Sort by severity and event count to prioritize
  const sortedIssues = [...issues].sort((a, b) => {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const sevDiff = severityOrder[b.severity] - severityOrder[a.severity];
    if (sevDiff !== 0) return sevDiff;
    return b.eventCount - a.eventCount;
  });

  // Take top 5 issues for analysis
  const topIssues = sortedIssues.slice(0, 5);

  // Get component code for the most severe issue
  const primaryIssue = topIssues[0];
  const componentCode = await readComponentCode(primaryIssue.componentPath);

  // Get indexed elements for the affected component
  const elementIndex = await loadElementIndex();
  let indexedElements: IndexedElement[] = [];
  if (elementIndex && primaryIssue.componentPath !== 'unknown') {
    indexedElements = getElementsByComponent(elementIndex, primaryIssue.componentPath);
    console.log(`🎯 [Gemini] Found ${indexedElements.length} indexed elements for ${primaryIssue.componentPath}`);
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `You are a CRO (Conversion Rate Optimization) expert analyzing user behavior issues on an e-commerce website.

## Detected Issues (sorted by severity)

${topIssues.map((issue, i) => `
### Issue ID: ${issue.id}
**Problem**: ${issue.problemStatement}
- **Pattern**: ${issue.patternId}
- **Severity**: ${issue.severity}
- **Category**: ${issue.category}
- **Element**: ${issue.elementSelector}
- **Component**: ${issue.componentPath}
- **Event Count**: ${issue.eventCount} occurrences across ${issue.uniqueSessions} sessions
- **User Intent**: ${issue.userIntent || 'Unknown'}
- **Current Outcome**: ${issue.currentOutcome || 'Unknown'}
- **Suggested Fix**: ${issue.suggestedFix || 'TBD'}
- **Sample Events**: ${JSON.stringify(issue.sampleEvents.slice(0, 3), null, 2)}
`).join('\n')}

${componentCode ? `
## Component Code (${primaryIssue.componentPath})
\`\`\`tsx
${componentCode}
\`\`\`
` : ''}

${indexedElements.length > 0 ? `
## Indexed Elements in This Component
These are the interactable elements we've identified in ${primaryIssue.componentPath}:

${indexedElements.map(el => `- **${el.id}** (${el.type}): "${el.text?.slice(0, 40) || el.placeholder || 'no text'}"
  - Tag: \`<${el.tag}>\`${el.inputType ? ` type="${el.inputType}"` : ''}
  - Selector: \`${el.selector}\`
  - Current attributes: ${Object.entries(el.attributes).map(([k, v]) => `${k}="${v}"`).join(', ') || 'none'}
  ${el.placeholder ? `- Placeholder: "${el.placeholder}"` : ''}
  ${el.ariaLabel ? `- Aria-label: "${el.ariaLabel}"` : ''}`).join('\n')}
` : ''}

## Your Task

Analyze these issues and recommend ONE specific fix. Choose the issue you have the HIGHEST CONFIDENCE can be fixed with a small code change.

**Allowed change types:**
- Add/modify HTML attributes (autocomplete, aria-*, data-*, name, id, placeholder)
- Change inline styles (colors, sizes, padding, visibility)
- Change text content
- Add loading states and visual feedback (e.g., button disabled state, "Adding..." text)
- Add simple state variables for UI feedback
- NO new components, NO major refactors

Respond with ONLY a JSON object (no markdown, no explanation).
IMPORTANT: Use the EXACT issue ID from the input (e.g., "issue_rage_click_add_to_cart"), not a number like "Issue 1".

{
  "issueId": "issue_rage_click_add_to_cart",
  "confidence": 0.85,
  "summary": "Brief description of the fix",
  "changeType": "attribute",
  "changes": [
    {
      "file": "components/store/CartDrawer.tsx",
      "elementSelector": "input[name='name']",
      "action": "add_attribute",
      "attribute": "autoComplete",
      "value": "name",
      "reason": "Enable browser autofill for name field"
    }
  ],
  "expectedImpact": "+20-30% form completion rate",
  "rationale": "Users are spending too long on form fields because browser autofill is not working..."
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse JSON from response (handle potential markdown wrapping)
    let jsonStr = text;
    if (text.includes('```json')) {
      jsonStr = text.split('```json')[1].split('```')[0].trim();
    } else if (text.includes('```')) {
      jsonStr = text.split('```')[1].split('```')[0].trim();
    }

    const recommendation = JSON.parse(jsonStr) as FixRecommendation;

    console.log('🤖 [Gemini] Fix recommendation generated:', {
      issueId: recommendation.issueId,
      confidence: recommendation.confidence,
      summary: recommendation.summary,
      changes: recommendation.changes.length,
    });

    return recommendation;
  } catch (error) {
    console.error('Error analyzing issues with Gemini:', error);
    return null;
  }
}

/**
 * Get a quick confidence assessment for an issue without full analysis
 */
export async function assessIssueConfidence(issue: UIIssue): Promise<number> {
  // Quick heuristics for confidence scoring
  let confidence = 0.5;

  // Higher severity = higher confidence we should fix
  if (issue.severity === 'critical') confidence += 0.2;
  else if (issue.severity === 'high') confidence += 0.15;
  else if (issue.severity === 'medium') confidence += 0.1;

  // More events = more confident this is a real issue
  if (issue.eventCount >= 20) confidence += 0.15;
  else if (issue.eventCount >= 10) confidence += 0.1;

  // Multiple sessions = not just one confused user
  if (issue.uniqueSessions >= 5) confidence += 0.1;

  // Known fixable patterns get higher confidence
  const easyPatterns = [
    'checkout_autofill_disabled',
    'address_no_autocomplete',
    'click_frustration',
    'form_abandonment',
  ];
  if (easyPatterns.includes(issue.patternId)) {
    confidence += 0.15;
  }

  return Math.min(confidence, 1);
}

/**
 * Check if Gemini is configured
 */
export function isGeminiConfigured(): boolean {
  return !!process.env.GOOGLE_GEMINI_API_KEY;
}
