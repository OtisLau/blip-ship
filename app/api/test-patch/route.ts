/**
 * Test endpoint to verify patch validation works with known-good patches
 */

import { NextResponse } from 'next/server';
import { validateAllPatchesSyntax, validatePatchSyntax } from '@/lib/fix-validators';
import { applyCodePatches } from '@/lib/ux-detection';
import { promises as fs } from 'fs';
import path from 'path';

// Copied from fix-validators.ts to debug
function checkBasicSyntax(code: string): string[] {
  const errors: string[] = [];

  // Check for balanced braces
  let braceCount = 0;
  let parenCount = 0;
  let bracketCount = 0;
  let inString = false;
  let stringChar = '';
  let inTemplate = false;

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const prevChar = i > 0 ? code[i - 1] : '';

    // Track string literals
    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
        if (char === '`') inTemplate = true;
      } else if (char === stringChar) {
        inString = false;
        inTemplate = false;
      }
      continue;
    }

    // Skip if inside string (except for template literal expressions)
    if (inString && !(inTemplate && char === '{' && prevChar === '$')) {
      continue;
    }

    // Count brackets
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
    if (char === '[') bracketCount++;
    if (char === ']') bracketCount--;
  }

  if (braceCount !== 0) {
    errors.push(`Unbalanced braces: ${braceCount > 0 ? 'missing }' : 'extra }'} (diff: ${braceCount})`);
  }
  if (parenCount !== 0) {
    errors.push(`Unbalanced parentheses: ${parenCount > 0 ? 'missing )' : 'extra )'} (diff: ${parenCount})`);
  }
  if (bracketCount !== 0) {
    errors.push(`Unbalanced brackets: ${bracketCount > 0 ? 'missing ]' : 'extra ]'} (diff: ${bracketCount})`);
  }

  // Check for unclosed JSX tags
  const jsxOpenTags = code.match(/<([A-Z][a-zA-Z0-9]*)[^>]*(?<!\/)\s*>/g) || [];
  const jsxCloseTags = code.match(/<\/([A-Z][a-zA-Z0-9]*)>/g) || [];

  // Extract tag names
  const openTagNames = jsxOpenTags.map(t => t.match(/<([A-Z][a-zA-Z0-9]*)/)?.[1]).filter(Boolean);
  const closeTagNames = jsxCloseTags.map(t => t.match(/<\/([A-Z][a-zA-Z0-9]*)>/)?.[1]).filter(Boolean);

  // Simple check: count should match
  const openCounts: Record<string, number> = {};
  const closeCounts: Record<string, number> = {};

  openTagNames.forEach(tag => {
    if (tag) openCounts[tag] = (openCounts[tag] || 0) + 1;
  });
  closeTagNames.forEach(tag => {
    if (tag) closeCounts[tag] = (closeCounts[tag] || 0) + 1;
  });

  for (const tag of Object.keys(openCounts)) {
    const open = openCounts[tag] || 0;
    const close = closeCounts[tag] || 0;
    if (open !== close) {
      errors.push(`JSX tag mismatch: <${tag}> opened ${open} times but closed ${close} times`);
    }
  }

  return errors;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action = 'validate' } = body as { action?: string };

    // Read the actual ProductGrid file
    const filePath = 'components/store/ProductGrid.tsx';
    const fullPath = path.join(process.cwd(), filePath);
    const content = await fs.readFile(fullPath, 'utf-8');

    // First check the original file
    const originalErrors = checkBasicSyntax(content);

    // Find JSX tags
    const jsxOpenTags = content.match(/<([A-Z][a-zA-Z0-9]*)[^>]*(?<!\/)\s*>/g) || [];
    const jsxCloseTags = content.match(/<\/([A-Z][a-zA-Z0-9]*)>/g) || [];

    return NextResponse.json({
      success: true,
      fileLength: content.length,
      fileLines: content.split('\n').length,
      originalFileErrors: originalErrors,
      jsxOpenTags: jsxOpenTags.slice(0, 10),
      jsxCloseTags: jsxCloseTags.slice(0, 10),
      openTagCount: jsxOpenTags.length,
      closeTagCount: jsxCloseTags.length,
    });
  } catch (error) {
    console.error('[TEST-PATCH] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    usage: 'POST with { action: "validate" | "debug" }',
    description: 'Tests patch validation with a known-good simple patch',
  });
}
