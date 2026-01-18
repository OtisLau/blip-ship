/**
 * Code Change Service - Uses Claude Sonnet to generate actual code changes
 * IMPORTANT: Uses expensive API - only call when actually generating a fix
 */

import Anthropic from '@anthropic-ai/sdk';
import { promises as fs } from 'fs';
import path from 'path';
import { FixRecommendation } from './gemini-service';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export interface CodeChange {
  file: string;
  originalContent: string;
  modifiedContent: string;
  diff: string;
}

export interface CodeChangeResult {
  success: boolean;
  changes: CodeChange[];
  summary: string;
  error?: string;
}

/**
 * Read file content
 */
async function readFile(filePath: string): Promise<string | null> {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    return await fs.readFile(fullPath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Generate a simple unified diff
 */
function generateDiff(original: string, modified: string, filePath: string): string {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');

  let diff = `--- a/${filePath}\n+++ b/${filePath}\n`;

  // Simple line-by-line diff
  const maxLines = Math.max(originalLines.length, modifiedLines.length);
  let inHunk = false;
  let hunkStart = 0;
  let hunkLines: string[] = [];

  for (let i = 0; i < maxLines; i++) {
    const origLine = originalLines[i] || '';
    const modLine = modifiedLines[i] || '';

    if (origLine !== modLine) {
      if (!inHunk) {
        inHunk = true;
        hunkStart = Math.max(0, i - 2);
        // Add context before
        for (let j = hunkStart; j < i; j++) {
          hunkLines.push(` ${originalLines[j]}`);
        }
      }
      if (originalLines[i] !== undefined) {
        hunkLines.push(`-${origLine}`);
      }
      if (modifiedLines[i] !== undefined) {
        hunkLines.push(`+${modLine}`);
      }
    } else if (inHunk) {
      hunkLines.push(` ${origLine}`);
      // End hunk after 2 context lines
      if (hunkLines.filter(l => l.startsWith(' ')).length >= 4) {
        diff += `@@ -${hunkStart + 1},${hunkLines.filter(l => !l.startsWith('+')).length} +${hunkStart + 1},${hunkLines.filter(l => !l.startsWith('-')).length} @@\n`;
        diff += hunkLines.join('\n') + '\n';
        inHunk = false;
        hunkLines = [];
      }
    }
  }

  // Close any remaining hunk
  if (hunkLines.length > 0) {
    diff += `@@ -${hunkStart + 1},${hunkLines.filter(l => !l.startsWith('+')).length} +${hunkStart + 1},${hunkLines.filter(l => !l.startsWith('-')).length} @@\n`;
    diff += hunkLines.join('\n') + '\n';
  }

  return diff;
}

/**
 * Generate code changes using Claude Sonnet
 * This is the expensive API call - only call when necessary!
 */
export async function generateCodeChanges(
  recommendation: FixRecommendation
): Promise<CodeChangeResult> {
  console.log('💰 [Sonnet] Generating code changes (expensive API call)...');

  // Read all files that need to be modified
  const fileContents: Map<string, string> = new Map();
  for (const change of recommendation.changes) {
    if (!fileContents.has(change.file)) {
      const content = await readFile(change.file);
      if (content) {
        fileContents.set(change.file, content);
      }
    }
  }

  if (fileContents.size === 0) {
    return {
      success: false,
      changes: [],
      summary: 'Could not read any files to modify',
      error: 'No files found',
    };
  }

  // Build the prompt for Sonnet
  const filesContext = Array.from(fileContents.entries())
    .map(([file, content]) => `### File: ${file}\n\`\`\`tsx\n${content}\n\`\`\``)
    .join('\n\n');

  const changesDescription = recommendation.changes
    .map((c, i) => `${i + 1}. In ${c.file}, ${c.action}: ${c.attribute || c.value} - ${c.reason}`)
    .join('\n');

  const prompt = `You are a senior React developer making a small, targeted fix to improve user experience.

## Fix Summary
${recommendation.summary}

## Changes Needed
${changesDescription}

## Rationale
${recommendation.rationale}

## Current Code
${filesContext}

## Your Task
Apply ONLY the specified changes. Do not refactor, do not add comments, do not change anything else.

For each file that needs changes, output the COMPLETE modified file content.

Respond with a JSON object containing the modified files:

{
  "files": [
    {
      "path": "components/store/CartDrawer.tsx",
      "content": "... complete file content with changes applied ..."
    }
  ],
  "summary": "Added autocomplete attributes to shipping form inputs"
}

IMPORTANT:
- Output the COMPLETE file content, not just snippets
- Make ONLY the specified changes
- Preserve all existing code, formatting, and indentation
- Do not add any comments or explanations in the code`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text content
    const textContent = message.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Sonnet');
    }

    let responseText = textContent.text;

    // Parse JSON from response
    if (responseText.includes('```json')) {
      responseText = responseText.split('```json')[1].split('```')[0].trim();
    } else if (responseText.includes('```')) {
      responseText = responseText.split('```')[1].split('```')[0].trim();
    }

    const response = JSON.parse(responseText) as {
      files: Array<{ path: string; content: string }>;
      summary: string;
    };

    // Generate diffs for each modified file
    const changes: CodeChange[] = [];
    for (const file of response.files) {
      const originalContent = fileContents.get(file.path);
      if (originalContent) {
        const diff = generateDiff(originalContent, file.content, file.path);
        changes.push({
          file: file.path,
          originalContent,
          modifiedContent: file.content,
          diff,
        });
      }
    }

    console.log('✅ [Sonnet] Code changes generated:', {
      files: changes.map(c => c.file),
      summary: response.summary,
    });

    return {
      success: true,
      changes,
      summary: response.summary,
    };
  } catch (error) {
    console.error('Error generating code changes with Sonnet:', error);
    return {
      success: false,
      changes: [],
      summary: 'Failed to generate code changes',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Apply code changes to files (write to disk)
 */
export async function applyCodeChanges(changes: CodeChange[]): Promise<boolean> {
  try {
    for (const change of changes) {
      const fullPath = path.join(process.cwd(), change.file);
      await fs.writeFile(fullPath, change.modifiedContent, 'utf-8');
      console.log(`📝 [Apply] Modified: ${change.file}`);
    }
    return true;
  } catch (error) {
    console.error('Error applying code changes:', error);
    return false;
  }
}

/**
 * Check if Anthropic is configured
 */
export function isAnthropicConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}
