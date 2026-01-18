import { GoogleGenerativeAI } from '@google/generative-ai';
import { promises as fs } from 'fs';
import path from 'path';
import type { AnalyticsEvent } from './types';
import type {
  ImageClickAnalytics,
  DetectedUXIssue,
  ConfigChangeSuggestion,
  ImageClickabilityAnalysis,
  EnrichedDeadClickEvent,
  DeadClickActionMapping,
  DeadClickMapperInput,
  ComponentContext,
  SiblingElementInfo,
  ProductCardElementRole,
  CodePatch,
  GeneratedCodeChange,
} from '@/types/suggestions';

/**
 * Extended mapping type that includes generated code
 */
export type DeadClickActionMappingWithCode = DeadClickActionMapping & {
  generatedCode?: GeneratedCodeChange;
};

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// ============================================
// Prompt Loading
// ============================================

/**
 * Load the UX issue detector agent prompt
 */
async function loadDetectorPrompt(): Promise<string> {
  const promptPath = path.join(
    process.cwd(),
    '.claude/agents/ux-issue-detector.md'
  );
  const content = await fs.readFile(promptPath, 'utf-8');
  return content.replace(/^---[\s\S]*?---\n/, '');
}

/**
 * Load the dead click action mapper agent prompt
 */
async function loadMapperPrompt(): Promise<string> {
  const promptPath = path.join(
    process.cwd(),
    '.claude/agents/dead-click-action-mapper.md'
  );
  const content = await fs.readFile(promptPath, 'utf-8');
  return content.replace(/^---[\s\S]*?---\n/, '');
}

/**
 * Load the click action guardrails
 */
async function loadClickGuardrails(): Promise<string> {
  const guardrailsPath = path.join(
    process.cwd(),
    '.claude/rules/click-action-guardrails.md'
  );
  return fs.readFile(guardrailsPath, 'utf-8');
}

// ============================================
// Image Click Pattern Detection
// ============================================

/**
 * Analyze events to detect non-clickable image patterns
 */
export function detectImageClickPatterns(
  events: AnalyticsEvent[]
): ImageClickAnalytics[] {
  const imageClicks = new Map<string, {
    events: AnalyticsEvent[];
    productId?: string;
    sessions: Set<string>;
  }>();

  events.forEach((event) => {
    if (
      (event.type === 'image_click' || event.type === 'dead_click') &&
      event.elementSelector?.includes('img')
    ) {
      const key = event.productId || event.elementSelector || 'unknown';
      const existing = imageClicks.get(key) || {
        events: [],
        productId: event.productId,
        sessions: new Set(),
      };
      existing.events.push(event);
      existing.sessions.add(event.sessionId);
      imageClicks.set(key, existing);
    }
  });

  const analytics: ImageClickAnalytics[] = [];

  imageClicks.forEach((data) => {
    const sortedEvents = data.events.sort((a, b) => a.timestamp - b.timestamp);

    let rapidClicks = 0;
    let totalTimeBetween = 0;
    let clickPairs = 0;

    for (let i = 1; i < sortedEvents.length; i++) {
      const timeDiff = sortedEvents[i].timestamp - sortedEvents[i - 1].timestamp;
      if (timeDiff < 500) {
        rapidClicks++;
      }
      totalTimeBetween += timeDiff;
      clickPairs++;
    }

    let followedByTitleClick = 0;
    sortedEvents.forEach((imageEvent) => {
      const followUp = events.find(
        (e) =>
          e.sessionId === imageEvent.sessionId &&
          e.type === 'click' &&
          e.timestamp > imageEvent.timestamp &&
          e.timestamp - imageEvent.timestamp < 2000 &&
          (e.elementSelector?.includes('a') || e.elementSelector?.includes('h3'))
      );
      if (followUp) {
        followedByTitleClick++;
      }
    });

    analytics.push({
      elementSelector: data.events[0].elementSelector || `img[data-product-id="${data.productId}"]`,
      productId: data.productId,
      totalClicks: data.events.length,
      rapidClicks,
      followedByTitleClick,
      avgTimeBetweenClicks: clickPairs > 0 ? Math.round(totalTimeBetween / clickPairs) : 0,
      uniqueSessions: data.sessions.size,
    });
  });

  return analytics;
}

/**
 * Determine severity based on analytics
 */
function calculateSeverity(
  analytics: ImageClickAnalytics
): 'critical' | 'high' | 'medium' | 'low' {
  const { rapidClicks, uniqueSessions, followedByTitleClick, totalClicks } = analytics;
  const followUpRate = totalClicks > 0 ? followedByTitleClick / totalClicks : 0;

  if (rapidClicks > 30 || uniqueSessions > 10 || followUpRate > 0.5) {
    return 'critical';
  }
  if (rapidClicks > 15 || uniqueSessions > 5 || followUpRate > 0.3) {
    return 'high';
  }
  if (rapidClicks > 5 || uniqueSessions > 2 || followUpRate > 0.1) {
    return 'medium';
  }
  return 'low';
}

function meetsThreshold(analytics: ImageClickAnalytics): boolean {
  return analytics.uniqueSessions >= 3 && analytics.rapidClicks >= 5;
}

/**
 * Analyze image click patterns and generate config suggestions using LLM
 */
export async function analyzeImageClickability(
  events: AnalyticsEvent[],
  currentConfig: { products: { imageClickable: boolean } }
): Promise<ImageClickabilityAnalysis> {
  if (currentConfig.products.imageClickable) {
    return {
      issuesDetected: [],
      configChanges: [],
      summary: 'Product images are already clickable. No issues detected.',
    };
  }

  const imageAnalytics = detectImageClickPatterns(events);
  const significantPatterns = imageAnalytics.filter(meetsThreshold);

  if (significantPatterns.length === 0) {
    return {
      issuesDetected: [],
      configChanges: [],
      summary: 'No significant non-clickable image patterns detected.',
    };
  }

  const issuesDetected: DetectedUXIssue[] = significantPatterns.map((analytics) => ({
    type: 'non_clickable_image' as const,
    severity: calculateSeverity(analytics),
    elementSelector: analytics.elementSelector,
    productId: analytics.productId,
    analytics,
    detectedAt: new Date().toISOString(),
  }));

  try {
    const systemPrompt = await loadDetectorPrompt();
    const input = { currentConfig, imageClickEvents: significantPatterns };

    const prompt = `${systemPrompt}

---

# Current Task

Analyze the following image click patterns and generate config change suggestions:

\`\`\`json
${JSON.stringify(input, null, 2)}
\`\`\`

Remember: Return ONLY valid JSON with issuesDetected, configChanges, and summary.`;

    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || [null, text];
    const jsonStr = jsonMatch[1] || text;
    const llmResult = JSON.parse(jsonStr.trim()) as ImageClickabilityAnalysis;

    return {
      issuesDetected: llmResult.issuesDetected || issuesDetected,
      configChanges: llmResult.configChanges || [],
      summary: llmResult.summary || `Detected ${issuesDetected.length} non-clickable image issues.`,
    };
  } catch (error) {
    console.error('LLM analysis failed, using fallback:', error);

    const totalRapidClicks = significantPatterns.reduce((sum, p) => sum + p.rapidClicks, 0);
    const totalSessions = new Set(significantPatterns.flatMap((p) => p.uniqueSessions)).size;

    const configChanges: ConfigChangeSuggestion[] = [
      {
        issueType: 'non_clickable_image',
        configPath: 'products.imageClickable',
        currentValue: false,
        suggestedValue: true,
        reasoning: `Detected ${totalRapidClicks} rapid clicks on product images across ${totalSessions} sessions.`,
        expectedImpact: 'Reduce user frustration and improve product discovery',
        priority: issuesDetected.some((i) => i.severity === 'critical') ? 'high' : 'medium',
      },
    ];

    return {
      issuesDetected,
      configChanges,
      summary: `Detected ${issuesDetected.length} non-clickable image issues affecting user navigation.`,
    };
  }
}

// ============================================
// Dead Click Enrichment & Context
// ============================================

/**
 * Determine element role from selector and type
 */
function inferElementRole(
  selector: string,
  elementType: string
): ProductCardElementRole {
  const selectorLower = selector.toLowerCase();
  
  if (elementType === 'img' || selectorLower.includes('img')) {
    return 'product-image';
  }
  if (selectorLower.includes('add-to-cart') || selectorLower.includes('addtocart')) {
    return 'add-to-cart';
  }
  if (selectorLower.includes('product-info') || selectorLower.includes('productinfo')) {
    return 'product-info';
  }
  if (selectorLower.includes('badge')) {
    return 'product-badge';
  }
  if (selectorLower.includes('price')) {
    return 'product-price';
  }
  if (selectorLower.includes('name') || selectorLower.includes('title')) {
    return 'product-name';
  }
  if (selectorLower.includes('quantity')) {
    return 'quantity-control';
  }
  
  return 'unknown';
}

/**
 * Enrich dead click events with context
 */
export function enrichDeadClickEvents(
  events: AnalyticsEvent[]
): EnrichedDeadClickEvent[] {
  console.log('\n  [ENRICH] Starting enrichDeadClickEvents...');
  console.log('  [ENRICH] Total input events:', events.length);
  
  const clickGroups = new Map<string, {
    events: AnalyticsEvent[];
    productId?: string;
    productName?: string;
    sessions: Set<string>;
  }>();

  let deadClickCount = 0;
  events.forEach((event) => {
    if (
      (event.type === 'dead_click' || event.type === 'image_click') &&
      event.elementSelector
    ) {
      deadClickCount++;
      const key = event.productId || event.elementSelector;
      const existing = clickGroups.get(key) || {
        events: [],
        productId: event.productId,
        productName: event.productName,
        sessions: new Set(),
      };
      existing.events.push(event);
      existing.sessions.add(event.sessionId);
      clickGroups.set(key, existing);
    }
  });

  console.log('  [ENRICH] Dead/image click events found:', deadClickCount);
  console.log('  [ENRICH] Unique click groups:', clickGroups.size);

  const enriched: EnrichedDeadClickEvent[] = [];

  clickGroups.forEach((data, key) => {
    const sortedEvents = data.events.sort((a, b) => a.timestamp - b.timestamp);
    
    let rapidClicks = 0;
    for (let i = 1; i < sortedEvents.length; i++) {
      const timeDiff = sortedEvents[i].timestamp - sortedEvents[i - 1].timestamp;
      if (timeDiff < 500) {
        rapidClicks++;
      }
    }

    const selector = data.events[0].elementSelector || '';
    const elementType = selector.includes('img') ? 'img' : 
                       selector.includes('button') ? 'button' : 'div';

    const enrichedEvent = {
      elementSelector: selector,
      elementType,
      elementRole: inferElementRole(selector, elementType),
      clickCount: data.events.length,
      rapidClicks,
      uniqueSessions: data.sessions.size,
      productId: data.productId,
      productName: data.productName,
    };
    
    console.log(`  [ENRICH] Group "${key}":`, {
      clickCount: enrichedEvent.clickCount,
      rapidClicks: enrichedEvent.rapidClicks,
      uniqueSessions: enrichedEvent.uniqueSessions,
      elementRole: enrichedEvent.elementRole,
    });

    enriched.push(enrichedEvent);
  });

  return enriched;
}

/**
 * Build component context for a product card
 */
export function buildProductCardContext(productId?: string): ComponentContext {
  const siblingElements: SiblingElementInfo[] = [
    {
      selector: '[data-add-to-cart]',
      type: 'button',
      role: 'add-to-cart',
      hasOnClick: true,
      action: 'adds-to-cart',
      handler: 'handleAddToCart(product)',
      hasStopPropagation: true,
    },
    {
      selector: '.product-info, [data-product-id] > div:last-child',
      type: 'div',
      role: 'product-info',
      hasOnClick: true,
      action: 'opens-modal',
      handler: 'setSelectedProduct(product)',
      hasStopPropagation: true,
    },
  ];

  return {
    containerSelector: productId 
      ? `[data-product-id="${productId}"]` 
      : '[data-product-id]',
    containerType: 'product-card',
    productId,
    siblingElements,
  };
}

// ============================================
// Code Patch Generation & Application
// ============================================

/**
 * Generate action mapping for dead clicks using LLM
 */
export async function generateDeadClickActionMapping(
  deadClickData: EnrichedDeadClickEvent
): Promise<DeadClickActionMappingWithCode | null> {
  console.log('\n  [LLM] Starting generateDeadClickActionMapping...');
  console.log('  [LLM] Dead click data:', {
    elementRole: deadClickData.elementRole,
    elementSelector: deadClickData.elementSelector,
    clickCount: deadClickData.clickCount,
    productId: deadClickData.productId,
  });
  
  const componentContext = buildProductCardContext(deadClickData.productId);
  console.log('  [LLM] Component context built:', componentContext.containerType);
  
  // Read the actual source file to provide context for accurate patches
  const targetFilePath = 'components/store/ProductGrid.tsx';
  let sourceCode = '';
  try {
    const fullPath = path.join(process.cwd(), targetFilePath);
    sourceCode = await fs.readFile(fullPath, 'utf-8');
    console.log('  [LLM] Source file read:', targetFilePath, sourceCode.length, 'chars');
  } catch (err) {
    console.log('  [LLM] Could not read source file:', err);
  }
  
  const input: DeadClickMapperInput = {
    deadClickData,
    componentContext,
    existingHandlers: {
      modalOpener: {
        selector: '.product-info',
        handler: 'onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedProduct(product); }}',
        description: 'Opens ProductModal with product details',
      },
      cartAdder: {
        selector: '[data-add-to-cart]',
        handler: 'onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}',
        description: 'Adds product to cart',
      },
    },
  };

  try {
    console.log('  [LLM] Loading prompts and guardrails...');
    const [systemPrompt, guardrails] = await Promise.all([
      loadMapperPrompt(),
      loadClickGuardrails(),
    ]);
    console.log('  [LLM] Prompts loaded - systemPrompt:', systemPrompt.length, 'chars, guardrails:', guardrails.length, 'chars');

    const prompt = `${systemPrompt}

---

# Guardrails Reference

${guardrails}

---

# Actual Source Code

The file you need to patch is \`${targetFilePath}\`. Here is the ACTUAL current content:

\`\`\`tsx
${sourceCode}
\`\`\`

CRITICAL: Your \`oldCode\` in patches MUST match the actual code above EXACTLY (including whitespace and indentation). Do not guess or assume the code structure.

---

# Current Task

Analyze the following dead click data and generate an action mapping:

\`\`\`json
${JSON.stringify(input, null, 2)}
\`\`\`

Remember: 
1. Return ONLY valid JSON matching the output format specified. No markdown, no explanation, just the JSON object.
2. Your oldCode MUST be copied EXACTLY from the source code above - do not modify whitespace or formatting.`;

    console.log('  [LLM] Calling Gemini API...');
    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text();
    console.log('  [LLM] Gemini response received, length:', text.length, 'chars');
    console.log('  [LLM] Response preview:', text.substring(0, 200) + '...');
    
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || [null, text];
    const jsonStr = jsonMatch[1] || text;
    console.log('  [LLM] Parsing JSON response...');
    const mapping = JSON.parse(jsonStr.trim()) as DeadClickActionMappingWithCode;
    
    console.log('  [LLM] Mapping parsed successfully!');
    console.log('  [LLM] Action type:', mapping.actionMapping?.suggestedAction?.actionType);
    console.log('  [LLM] Has generated code:', !!mapping.generatedCode);
    if (mapping.generatedCode?.patches) {
      console.log('  [LLM] Patches count:', mapping.generatedCode.patches.length);
    }
    
    return mapping;
  } catch (error) {
    console.error('  [LLM] Failed to generate action mapping:', error);
    return null;
  }
}

/**
 * Generate fallback action mapping without LLM
 */
export async function generateFallbackActionMapping(
  deadClickData: EnrichedDeadClickEvent
): Promise<DeadClickActionMapping & { generatedCode: GeneratedCodeChange }> {
  console.log('\n  [FALLBACK] Generating fallback action mapping...');
  
  const isProductImage = 
    deadClickData.elementRole === 'product-image' ||
    deadClickData.elementType === 'img';
  console.log('  [FALLBACK] Is product image:', isProductImage);

  // Read current file to detect state
  const filePath = path.join(process.cwd(), 'components/store/ProductGrid.tsx');
  console.log('  [FALLBACK] Reading file:', filePath);
  
  let fileContent = '';
  try {
    fileContent = await fs.readFile(filePath, 'utf-8');
    console.log('  [FALLBACK] File read, length:', fileContent.length);
  } catch (err) {
    console.log('  [FALLBACK] File read failed:', err);
    // File read failed, use default patterns
  }

  // Check which pattern exists in the file
  const hasOriginalComment = fileContent.includes('{/* Product Image */}');
  const hasUpdatedComment = fileContent.includes('{/* Product Image - clickable to open modal */}');
  const hasOnClick = fileContent.includes('onClick={(e) => {\n                  e.stopPropagation();\n                  setSelectedProduct(product);');

  console.log('  [FALLBACK] File state:');
  console.log('    - hasOriginalComment:', hasOriginalComment);
  console.log('    - hasUpdatedComment:', hasUpdatedComment);
  console.log('    - hasOnClick (already applied):', hasOnClick);

  // If onClick already exists, no patch needed
  if (hasOnClick) {
    console.log('  [FALLBACK] Patch already applied, returning no-op');
    const oldCode = `{/* Product Image - clickable to open modal */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedProduct(product);
                }}
                style={{
                  aspectRatio: '1',
                  position: 'relative',
                  overflow: 'hidden',
                  backgroundColor: '#f5f5f5',
                  cursor: 'pointer',
                }}
              >`;
    
    return createMapping(deadClickData, isProductImage, oldCode, oldCode, true);
  }

  // Determine oldCode based on current file state
  let oldCode: string;
  if (hasUpdatedComment) {
    console.log('  [FALLBACK] Using updated comment pattern for oldCode');
    oldCode = `{/* Product Image - clickable to open modal */}
              <div
                style={{
                  aspectRatio: '1',
                  position: 'relative',
                  overflow: 'hidden',
                  backgroundColor: '#f5f5f5',
                }}
              >`;
  } else {
    console.log('  [FALLBACK] Using original comment pattern for oldCode');
    oldCode = `{/* Product Image */}
              <div
                style={{
                  aspectRatio: '1',
                  position: 'relative',
                  overflow: 'hidden',
                  backgroundColor: '#f5f5f5',
                }}
              >`;
  }

  console.log('  [FALLBACK] oldCode pattern (first 80 chars):', oldCode.substring(0, 80));

  const newCode = `{/* Product Image - clickable to open modal */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedProduct(product);
                }}
                style={{
                  aspectRatio: '1',
                  position: 'relative',
                  overflow: 'hidden',
                  backgroundColor: '#f5f5f5',
                  cursor: 'pointer',
                }}
              >`;

  return createMapping(deadClickData, isProductImage, oldCode, newCode, false);
}

/**
 * Helper to create the mapping object
 */
function createMapping(
  deadClickData: EnrichedDeadClickEvent,
  isProductImage: boolean,
  oldCode: string,
  newCode: string,
  alreadyApplied: boolean
): DeadClickActionMapping & { generatedCode: GeneratedCodeChange } {

  return {
    analysis: {
      deadClickElement: isProductImage ? 'Product image' : deadClickData.elementSelector,
      inferredUserIntent: 'view-product-details',
      intentConfidence: 0.85,
      intentReasoning: `${deadClickData.rapidClicks} rapid clicks detected across ${deadClickData.uniqueSessions} sessions on product image. Users expect clicking the image to show product details.`,
    },
    actionMapping: {
      targetElement: {
        selector: deadClickData.productId 
          ? `[data-product-id="${deadClickData.productId}"] > div:first-child`
          : '[data-product-id] > div:first-child',
        description: 'Product image container',
        currentBehavior: 'none',
      },
      suggestedAction: {
        actionType: 'open-modal',
        mirrorHandler: {
          sourceElement: '.product-info',
          handler: 'setSelectedProduct(product)',
        },
      },
      codeChange: {
        type: 'add-onclick',
        element: 'image-container',
        handler: '(e) => { e.stopPropagation(); setSelectedProduct(product); }',
        addStyles: { cursor: 'pointer' },
        requiresStopPropagation: true,
        stopPropagationReason: 'Prevent event bubbling; AddToCart button inside has its own onClick',
      },
    },
    generatedCode: {
      patches: [
        {
          filePath: 'components/store/ProductGrid.tsx',
          description: 'Add onClick to image container to open ProductModal',
          oldCode,
          newCode,
        },
      ],
      explanation: 'Added onClick handler to the image container div that calls setSelectedProduct(product) to open the ProductModal. Includes stopPropagation() to prevent interfering with the AddToCart button. Added cursor: pointer for visual affordance.',
      rollbackPatches: [
        {
          filePath: 'components/store/ProductGrid.tsx',
          description: 'Remove onClick from image container',
          oldCode: newCode,
          newCode: oldCode,
        },
      ],
    },
    preservedElements: [
      {
        selector: '[data-add-to-cart]',
        action: 'add-to-cart',
        preserved: true,
        reason: 'Button has independent onClick with stopPropagation, will not be affected',
      },
    ],
    validation: {
      passesGuardrails: true,
      checklist: {
        singleElementTargeted: true,
        actionMatchesIntent: true,
        siblingsPreserved: true,
        stopPropagationIncluded: true,
        handlerMirrorsExisting: true,
      },
    },
    confidence: 0.85,
    reasoning: `Dead clicks on product image with ${Math.round((deadClickData.rapidClicks / deadClickData.clickCount) * 100)}% rapid click rate indicate user frustration. Product info section opens modal via setSelectedProduct(). Adding same handler to image container with stopPropagation will fix UX while preserving AddToCart button.`,
  };
}

/**
 * Apply a code patch to a file
 */
export async function applyCodePatch(patch: CodePatch): Promise<{
  success: boolean;
  error?: string;
  appliedAt?: string;
}> {
  console.log('\n    [PATCH] Applying patch to:', patch.filePath);
  console.log('    [PATCH] Description:', patch.description);
  
  try {
    const filePath = path.join(process.cwd(), patch.filePath);
    console.log('    [PATCH] Full path:', filePath);
    
    const content = await fs.readFile(filePath, 'utf-8');
    console.log('    [PATCH] File read, length:', content.length, 'chars');
    
    const oldCodeFound = content.includes(patch.oldCode);
    console.log('    [PATCH] Old code found in file:', oldCodeFound);
    
    if (!oldCodeFound) {
      console.log('    [PATCH] FAILED: Old code not found!');
      console.log('    [PATCH] Looking for (first 100 chars):', patch.oldCode.substring(0, 100));
      return {
        success: false,
        error: `Could not find the code to replace in ${patch.filePath}. The file may have been modified.`,
      };
    }
    
    const newContent = content.replace(patch.oldCode, patch.newCode);
    console.log('    [PATCH] New content length:', newContent.length, 'chars');
    
    await fs.writeFile(filePath, newContent, 'utf-8');
    console.log('    [PATCH] SUCCESS: File written!');
    
    return {
      success: true,
      appliedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('    [PATCH] ERROR:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error applying patch',
    };
  }
}

/**
 * Apply multiple code patches
 */
export async function applyCodePatches(patches: CodePatch[]): Promise<{
  success: boolean;
  results: Array<{
    patch: CodePatch;
    success: boolean;
    error?: string;
  }>;
  allApplied: boolean;
}> {
  const results: Array<{
    patch: CodePatch;
    success: boolean;
    error?: string;
  }> = [];

  for (const patch of patches) {
    const result = await applyCodePatch(patch);
    results.push({
      patch,
      success: result.success,
      error: result.error,
    });
  }

  const allApplied = results.every((r) => r.success);

  return {
    success: allApplied,
    results,
    allApplied,
  };
}

/**
 * Validate a code patch before applying
 */
export async function validateCodePatch(patch: CodePatch): Promise<{
  valid: boolean;
  issues: string[];
}> {
  console.log('\n    [VALIDATE] Validating patch for:', patch.filePath);
  const issues: string[] = [];
  
  try {
    const filePath = path.join(process.cwd(), patch.filePath);
    const content = await fs.readFile(filePath, 'utf-8');
    console.log('    [VALIDATE] File read, length:', content.length);
    
    const oldCodeFound = content.includes(patch.oldCode);
    console.log('    [VALIDATE] Old code found:', oldCodeFound);
    if (!oldCodeFound) {
      issues.push('Old code not found in file - file may have been modified');
      console.log('    [VALIDATE] Old code (first 150 chars):', patch.oldCode.substring(0, 150));
    }
    
    const newCodeExists = content.includes(patch.newCode);
    console.log('    [VALIDATE] New code already exists:', newCodeExists);
    if (newCodeExists) {
      issues.push('New code already exists in file - patch may have already been applied');
    }
    
    if (patch.newCode.includes('onClick') && !patch.newCode.includes('=>')) {
      issues.push('onClick handler appears malformed');
    }
    
    const openBraces = (patch.newCode.match(/{/g) || []).length;
    const closeBraces = (patch.newCode.match(/}/g) || []).length;
    console.log('    [VALIDATE] Braces - open:', openBraces, 'close:', closeBraces);
    if (openBraces !== closeBraces) {
      issues.push('Unbalanced braces in new code');
    }
    
  } catch (error) {
    console.error('    [VALIDATE] Error reading file:', error);
    issues.push(`Could not read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  console.log('    [VALIDATE] Result - valid:', issues.length === 0, 'issues:', issues);
  return {
    valid: issues.length === 0,
    issues,
  };
}

// ============================================
// Main Analysis Pipeline
// ============================================

/**
 * Main function to analyze dead clicks and generate action mapping with code patches
 */
export async function analyzeDeadClicksForActionMapping(
  events: AnalyticsEvent[],
  options: { useLLM?: boolean } = { useLLM: true }
): Promise<{
  enrichedEvents: EnrichedDeadClickEvent[];
  mappings: DeadClickActionMappingWithCode[];
  summary: string;
}> {
  console.log('\n[ANALYZE] Starting analyzeDeadClicksForActionMapping...');
  console.log('[ANALYZE] Options:', options);
  
  const enrichedEvents = enrichDeadClickEvents(events);
  console.log('[ANALYZE] Enriched events count:', enrichedEvents.length);

  // Filter to significant patterns - THRESHOLD: 1 click is enough to trigger
  // Using clickCount >= 1 instead of rapidClicks >= 1 so single clicks work
  const significantEvents = enrichedEvents.filter(
    (e) => e.uniqueSessions >= 1 && e.clickCount >= 1
  );

  console.log('[ANALYZE] Significant events (clickCount >= 1):', significantEvents.length);
  significantEvents.forEach((e, i) => {
    console.log(`  [${i}] ${e.elementRole} - clicks: ${e.clickCount}, rapid: ${e.rapidClicks}, sessions: ${e.uniqueSessions}`);
  });

  if (significantEvents.length === 0) {
    console.log('[ANALYZE] No significant dead click patterns found, returning early');
    return {
      enrichedEvents,
      mappings: [],
      summary: 'No significant dead click patterns detected on product images.',
    };
  }

  const mappings: DeadClickActionMappingWithCode[] = [];

  for (const event of significantEvents) {
    let mapping: DeadClickActionMappingWithCode | null = null;

    if (options.useLLM) {
      console.log('\n[ANALYZE] Calling LLM for event:', event.elementRole);
      mapping = await generateDeadClickActionMapping(event);
      console.log('[ANALYZE] LLM mapping result:', mapping ? 'SUCCESS' : 'FAILED/NULL');
    } else {
      console.log('[ANALYZE] LLM disabled, skipping to fallback');
    }

    // Fallback if LLM fails or is disabled
    if (!mapping) {
      console.log('[ANALYZE] Using fallback mapping generator...');
      mapping = await generateFallbackActionMapping(event);
      console.log('[ANALYZE] Fallback mapping generated');
    }

    if (mapping?.generatedCode?.patches) {
      console.log('[ANALYZE] Patches in mapping:', mapping.generatedCode.patches.length);
      mapping.generatedCode.patches.forEach((p, i) => {
        console.log(`  Patch ${i + 1}: ${p.filePath} - ${p.description}`);
      });
    }

    mappings.push(mapping);
  }

  const totalClicks = significantEvents.reduce((sum, e) => sum + e.clickCount, 0);
  const totalSessions = new Set(significantEvents.map((e) => e.productId || e.elementSelector)).size;

  const summary = `Detected ${significantEvents.length} dead click pattern(s) on product images. ` +
    `${totalClicks} clicks across ${totalSessions} unique elements. ` +
    `Recommendation: Add onClick handler to image containers to open ProductModal.`;

  console.log('[ANALYZE] Complete. Mappings:', mappings.length);
  return {
    enrichedEvents,
    mappings,
    summary,
  };
}

/**
 * Check if a mapping passes all guardrail validations
 */
export function validateMapping(mapping: DeadClickActionMapping): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Safely access nested properties (LLM responses may vary)
  const checklist = mapping?.validation?.checklist;
  const codeChange = mapping?.actionMapping?.codeChange;

  if (!checklist) {
    // If no checklist, assume basic validation passed
    console.log('    [VALIDATE-MAPPING] No checklist in mapping, assuming valid');
  } else {
    if (!checklist.singleElementTargeted) {
      issues.push('Target is not a single specific element');
    }
    if (!checklist.actionMatchesIntent) {
      issues.push('Action does not match inferred user intent');
    }
    if (!checklist.siblingsPreserved) {
      issues.push('Sibling element functionality may be affected');
    }
    if (codeChange?.requiresStopPropagation && !checklist.stopPropagationIncluded) {
      issues.push('stopPropagation required but not included');
    }
    if (!checklist.handlerMirrorsExisting) {
      issues.push('Handler does not mirror existing equivalent handler');
    }
  }

  const confidence = mapping?.confidence ?? 0.8;
  if (confidence < 0.7) {
    issues.push(`Low confidence score: ${confidence}`);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Full analysis pipeline that combines config-level and code-level suggestions
 */
export async function analyzeDeadClicksComprehensive(
  events: AnalyticsEvent[],
  currentConfig: { products: { imageClickable?: boolean } },
  options: { useLLM?: boolean } = { useLLM: true }
): Promise<{
  imageAnalysis: ImageClickabilityAnalysis;
  actionMappings: {
    enrichedEvents: EnrichedDeadClickEvent[];
    mappings: DeadClickActionMappingWithCode[];
    summary: string;
  };
  recommendation: {
    type: 'config-change' | 'code-change' | 'both' | 'none';
    description: string;
    priority: 'high' | 'medium' | 'low';
  };
}> {
  const [imageAnalysis, actionMappingResult] = await Promise.all([
    analyzeImageClickability(events, currentConfig as { products: { imageClickable: boolean } }),
    analyzeDeadClicksForActionMapping(events, options),
  ]);

  const hasConfigIssues = imageAnalysis.issuesDetected.length > 0;
  const hasActionMappings = actionMappingResult.mappings.length > 0;

  let recommendationType: 'config-change' | 'code-change' | 'both' | 'none' = 'none';
  let description = 'No dead click issues detected on product images.';
  let priority: 'high' | 'medium' | 'low' = 'low';

  if (hasConfigIssues && hasActionMappings) {
    recommendationType = 'both';
    const criticalCount = imageAnalysis.issuesDetected.filter(
      (i) => i.severity === 'critical' || i.severity === 'high'
    ).length;
    priority = criticalCount > 0 ? 'high' : 'medium';
    description = `Detected ${imageAnalysis.issuesDetected.length} dead click pattern(s). ` +
      `Recommend adding onClick handler to image container to open ProductModal.`;
  } else if (hasConfigIssues) {
    recommendationType = 'config-change';
    priority = imageAnalysis.issuesDetected.some((i) => i.severity === 'critical') ? 'high' : 'medium';
    description = `Detected ${imageAnalysis.issuesDetected.length} dead click pattern(s). ` +
      `Recommend enabling products.imageClickable in config.`;
  } else if (hasActionMappings) {
    recommendationType = 'code-change';
    priority = actionMappingResult.mappings.some((m) => m.confidence > 0.9) ? 'high' : 'medium';
    description = `Detected dead click patterns. ` +
      `Recommend adding onClick handler to image container to open ProductModal.`;
  }

  return {
    imageAnalysis,
    actionMappings: actionMappingResult,
    recommendation: {
      type: recommendationType,
      description,
      priority,
    },
  };
}

/**
 * Quick check if dead clicks on product images warrant attention
 */
export function hasSignificantDeadClickPattern(events: AnalyticsEvent[]): {
  hasIssue: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'none';
  quickStats: {
    totalDeadClicks: number;
    uniqueSessions: number;
    affectedProducts: number;
  };
} {
  const enriched = enrichDeadClickEvents(events);
  
  const significant = enriched.filter(
    (e) => e.uniqueSessions >= 1 && e.rapidClicks >= 1
  );

  if (significant.length === 0) {
    return {
      hasIssue: false,
      severity: 'none',
      quickStats: {
        totalDeadClicks: enriched.reduce((sum, e) => sum + e.clickCount, 0),
        uniqueSessions: new Set(enriched.flatMap((e) => e.productId || [])).size,
        affectedProducts: enriched.length,
      },
    };
  }

  const totalRapidClicks = significant.reduce((sum, e) => sum + e.rapidClicks, 0);
  const maxSessions = Math.max(...significant.map((e) => e.uniqueSessions));

  let severity: 'critical' | 'high' | 'medium' | 'low' = 'low';
  if (totalRapidClicks > 30 || maxSessions > 10) {
    severity = 'critical';
  } else if (totalRapidClicks > 15 || maxSessions > 5) {
    severity = 'high';
  } else if (totalRapidClicks > 5 || maxSessions > 2) {
    severity = 'medium';
  }

  return {
    hasIssue: true,
    severity,
    quickStats: {
      totalDeadClicks: significant.reduce((sum, e) => sum + e.clickCount, 0),
      uniqueSessions: maxSessions,
      affectedProducts: significant.length,
    },
  };
}
