import { NextRequest, NextResponse } from 'next/server';
import { callGeminiJSON } from '@/lib/gemini';
import { promises as fs } from 'fs';
import path from 'path';

interface FilterGenerationResult {
  action: string;
  files: Array<{
    path: string;
    operation: 'create' | 'modify';
    content?: string;
    oldCode?: string;
    newCode?: string;
  }>;
  explanation: string;
}

// POST /api/generate-filter - Generate filter code using LLM
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { triggerButton, rageClickCount } = body;

    console.log(`\n🤖 [Generate Filter] Starting LLM code generation...`);
    console.log(`   Trigger: ${rageClickCount} rage clicks on "${triggerButton}" button`);

    // Read current source files to provide context
    const headerPath = path.join(process.cwd(), 'components/store/Header.tsx');
    const productGridPath = path.join(process.cwd(), 'components/store/ProductGrid.tsx');
    const storeContentPath = path.join(process.cwd(), 'components/store/StoreContent.tsx');

    const [headerCode, productGridCode, storeContentCode] = await Promise.all([
      fs.readFile(headerPath, 'utf-8'),
      fs.readFile(productGridPath, 'utf-8'),
      fs.readFile(storeContentPath, 'utf-8'),
    ]);

    const prompt = `You are a React/Next.js code generator. The user has rage-clicked ${rageClickCount} times on the "${triggerButton}" navigation button, indicating they want filtering functionality.

## Current Code

### Header.tsx
\`\`\`tsx
${headerCode}
\`\`\`

### ProductGrid.tsx  
\`\`\`tsx
${productGridCode}
\`\`\`

### StoreContent.tsx
\`\`\`tsx
${storeContentCode}
\`\`\`

## Your Task

Generate code to implement Men/Women product filtering:

1. **Create FilterContext.tsx** - A React context with:
   - \`categoryFilter\` state ('all' | 'men' | 'women')
   - \`setCategoryFilter\` function
   - \`FilterProvider\` component
   - \`useFilter\` hook

2. **Modify Header.tsx** - Add:
   - Import useFilter hook
   - Get categoryFilter and setCategoryFilter from hook
   - Create handleNavClick function that toggles filter
   - Update nav buttons to show active state (bold + underline when active)

3. **Modify ProductGrid.tsx** - Add:
   - Import useFilter hook
   - Get categoryFilter from hook
   - Filter config.items by category (show all if 'all', filter by men/women/unisex otherwise)
   - Show filter indicator when not 'all'

4. **Modify StoreContent.tsx** - Add:
   - Import FilterProvider
   - Wrap content with FilterProvider

Return ONLY valid JSON in this exact format:
{
  "action": "generate-filter",
  "files": [
    {
      "path": "context/FilterContext.tsx",
      "operation": "create",
      "content": "... full file content with proper imports and exports ..."
    },
    {
      "path": "components/store/Header.tsx",
      "operation": "modify",
      "oldCode": "... exact code to find and replace (first ~30 lines including imports and function start) ...",
      "newCode": "... replacement code with new imports, hook usage, and handleNavClick ..."
    },
    {
      "path": "components/store/Header.tsx",
      "operation": "modify", 
      "oldCode": "... nav buttons code to replace ...",
      "newCode": "... updated nav buttons with active state and handleNavClick ..."
    },
    {
      "path": "components/store/ProductGrid.tsx",
      "operation": "modify",
      "oldCode": "... exact code to find ...",
      "newCode": "... replacement code with useFilter and filtering logic ..."
    },
    {
      "path": "components/store/StoreContent.tsx",
      "operation": "modify",
      "oldCode": "... exact imports to find ...",
      "newCode": "... imports with FilterProvider added ..."
    },
    {
      "path": "components/store/StoreContent.tsx",
      "operation": "modify",
      "oldCode": "... JSX structure to wrap ...",
      "newCode": "... JSX with FilterProvider wrapper ..."
    }
  ],
  "explanation": "Generated Men/Women product filtering triggered by user rage clicks"
}

CRITICAL RULES:
- oldCode MUST match the source files EXACTLY (including whitespace)
- All code must be syntactically valid TypeScript/React
- Use 'use client' directive for client components
- Match the existing code style (inline styles, etc)`;

    console.log(`   Calling Gemini...`);
    
    const result = await callGeminiJSON<FilterGenerationResult>(prompt);
    
    console.log(`   ✅ LLM generated ${result.files.length} file operations`);

    // Apply the generated code
    let appliedCount = 0;
    const errors: string[] = [];

    for (const file of result.files) {
      const fullPath = path.join(process.cwd(), file.path);
      
      try {
        if (file.operation === 'create') {
          // Create new file
          const dir = path.dirname(fullPath);
          await fs.mkdir(dir, { recursive: true });
          await fs.writeFile(fullPath, file.content || '');
          console.log(`   📝 Created: ${file.path}`);
          appliedCount++;
        } else if (file.operation === 'modify' && file.oldCode && file.newCode) {
          // Modify existing file
          const content = await fs.readFile(fullPath, 'utf-8');
          
          if (content.includes(file.oldCode)) {
            const newContent = content.replace(file.oldCode, file.newCode);
            await fs.writeFile(fullPath, newContent);
            console.log(`   ✏️ Modified: ${file.path}`);
            appliedCount++;
          } else {
            console.log(`   ⚠️ oldCode not found in ${file.path}`);
            errors.push(`oldCode not found in ${file.path}`);
          }
        }
      } catch (err) {
        console.error(`   ❌ Failed to apply to ${file.path}:`, err);
        errors.push(`Failed to apply to ${file.path}: ${err}`);
      }
    }

    return NextResponse.json({
      success: appliedCount > 0,
      appliedCount,
      totalOperations: result.files.length,
      explanation: result.explanation,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error generating filter:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
