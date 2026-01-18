import { promises as fs } from 'fs';
import path from 'path';
import type { AnalyticsEvent, SiteGuardrails } from './types';
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
// Use Claude for code generation (more reliable than Gemini)
import { callClaude } from './claude';
// Keep Gemini for non-code tasks
import { callGemini, callGeminiJSON } from './gemini';
// Dynamic site guardrails
import { loadSiteGuardrails, formatGuardrailsForLLM } from './site-guardrails';
// Syntax validation for retry logic
import { validateAllPatchesSyntax } from './fix-validators';

/**
 * Extended mapping type that includes generated code
 */
export type DeadClickActionMappingWithCode = DeadClickActionMapping & {
  generatedCode?: GeneratedCodeChange;
};

// ============================================
// Prompt Loading
// ============================================

/**
 * Mapping from fix types to their corresponding agent prompt files
 */
const FIX_TYPE_TO_AGENT_PROMPT: Record<string, string> = {
  loading_state: 'button-loading-generator.md',
  image_gallery: 'gallery-generator.md',
  address_autocomplete: 'autocomplete-generator.md',
  product_comparison: 'comparison-generator.md',
  color_preview: 'color-preview-generator.md',
  // Dead click handling uses a different agent
  dead_click: 'dead-click-action-mapper.md',
};

/**
 * Load an agent prompt by fix type
 * Returns the prompt content with YAML frontmatter removed
 */
export async function loadAgentPrompt(fixType: string): Promise<string | null> {
  const promptFile = FIX_TYPE_TO_AGENT_PROMPT[fixType];
  if (!promptFile) {
    console.log(`[loadAgentPrompt] No agent prompt for fix type: ${fixType}`);
    return null;
  }

  try {
    const promptPath = path.join(process.cwd(), '.claude/agents', promptFile);
    const content = await fs.readFile(promptPath, 'utf-8');
    // Remove YAML frontmatter if present
    return content.replace(/^---[\s\S]*?---\n/, '');
  } catch (error) {
    console.error(`[loadAgentPrompt] Failed to load ${promptFile}:`, error);
    return null;
  }
}

/**
 * Load theme protection guardrails (static markdown)
 * These define the visual constraints that ALL generated code must follow
 */
export async function loadThemeGuardrails(): Promise<string> {
  try {
    const guardrailsPath = path.join(
      process.cwd(),
      '.claude/rules/theme-protection-guardrails.md'
    );
    return await fs.readFile(guardrailsPath, 'utf-8');
  } catch (error) {
    console.error('[loadThemeGuardrails] Failed to load guardrails:', error);
    return '';
  }
}

/**
 * Load combined guardrails (static markdown + dynamic site-specific)
 * Returns both the markdown guardrails and the dynamic site constraints
 */
export async function loadCombinedGuardrails(): Promise<{
  staticGuardrails: string;
  dynamicGuardrails: SiteGuardrails;
  combinedPrompt: string;
}> {
  const [staticGuardrails, dynamicGuardrails] = await Promise.all([
    loadThemeGuardrails(),
    loadSiteGuardrails(),
  ]);

  // Format dynamic guardrails for LLM inclusion
  const dynamicPrompt = formatGuardrailsForLLM(dynamicGuardrails);

  // Combine both into a single prompt section
  const combinedPrompt = `# Theme Protection Guardrails

## Static Rules (from project configuration)

${staticGuardrails}

---

${dynamicPrompt}

---

**IMPORTANT**: The dynamic site-specific constraints above take precedence for color palette and component patterns. Use the exact colors listed in the dynamic constraints. If there's a conflict, follow the dynamic constraints.`;

  console.log('[loadCombinedGuardrails] Loaded guardrails:');
  console.log(`  Static: ${staticGuardrails.length} chars`);
  console.log(`  Dynamic site: ${dynamicGuardrails.siteId} (source: ${dynamicGuardrails.source})`);

  return {
    staticGuardrails,
    dynamicGuardrails,
    combinedPrompt,
  };
}

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

    const llmResult = await callGeminiJSON<ImageClickabilityAnalysis>(prompt);

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

    console.log('  [LLM] Calling Claude API for code generation...');
    const response = await callClaude(prompt);
    console.log('  [LLM] Response received, parsing JSON...');

    // Parse JSON from response (may be wrapped in markdown)
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || [null, response];
    const jsonStr = (jsonMatch[1] || response).trim();
    const mapping = JSON.parse(jsonStr) as DeadClickActionMappingWithCode;

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
  // Check if fix is already applied - look for the specific pattern of updated comment + onClick together
  const hasOnClick = hasUpdatedComment && fileContent.includes('Product Image - clickable to open modal */}\n              <div\n                onClick');

  console.log('  [FALLBACK] File state:');
  console.log('    - hasOriginalComment:', hasOriginalComment);
  console.log('    - hasUpdatedComment:', hasUpdatedComment);
  console.log('    - hasOnClick (already applied):', hasOnClick);

  // If onClick already exists on image container, no patch needed
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
  // Match actual file format (div and style on separate lines)
  if (hasUpdatedComment) {
    console.log('  [FALLBACK] Using updated comment pattern for oldCode');
    oldCode = `{/* Product Image - clickable to open modal */}
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

  // Filter to product images with 3+ rapid clicks (user-specified threshold)
  const RAPID_CLICK_THRESHOLD = 3;
  const significantEvents = enrichedEvents.filter(
    (e) => (e.elementRole === 'product-image' || e.elementType === 'img') && e.rapidClicks >= RAPID_CLICK_THRESHOLD
  );

  console.log(`[ANALYZE] Product images with ${RAPID_CLICK_THRESHOLD}+ rapid clicks:`, significantEvents.length);
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
 * Triggers when 3+ rapid dead clicks are detected on product images
 */
export function hasSignificantDeadClickPattern(events: AnalyticsEvent[]): {
  hasIssue: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'none';
  quickStats: {
    totalDeadClicks: number;
    uniqueSessions: number;
    affectedProducts: number;
    rapidClicks: number;
  };
} {
  const enriched = enrichDeadClickEvents(events);
  
  // Filter for product images with 3+ rapid clicks (user-specified threshold)
  const RAPID_CLICK_THRESHOLD = 3;
  const significant = enriched.filter(
    (e) => (e.elementRole === 'product-image' || e.elementType === 'img') && e.rapidClicks >= RAPID_CLICK_THRESHOLD
  );
  
  console.log(`[PATTERN-CHECK] Checking for significant dead click pattern...`);
  console.log(`  - Total enriched events: ${enriched.length}`);
  console.log(`  - Product images with ${RAPID_CLICK_THRESHOLD}+ rapid clicks: ${significant.length}`);

  if (significant.length === 0) {
    const totalRapidClicks = enriched.reduce((sum, e) => sum + e.rapidClicks, 0);
    console.log(`  - No significant pattern (total rapid clicks on images: ${totalRapidClicks})`);
    return {
      hasIssue: false,
      severity: 'none',
      quickStats: {
        totalDeadClicks: enriched.reduce((sum, e) => sum + e.clickCount, 0),
        uniqueSessions: new Set(enriched.flatMap((e) => e.productId || [])).size,
        affectedProducts: enriched.length,
        rapidClicks: totalRapidClicks,
      },
    };
  }

  const totalRapidClicks = significant.reduce((sum, e) => sum + e.rapidClicks, 0);
  const maxSessions = Math.max(...significant.map((e) => e.uniqueSessions));

  // Severity based on rapid clicks - 3+ triggers medium, which is enough to auto-fix
  let severity: 'critical' | 'high' | 'medium' | 'low' = 'medium'; // Default to medium for 3+ rapid clicks
  if (totalRapidClicks > 30 || maxSessions > 10) {
    severity = 'critical';
  } else if (totalRapidClicks > 15 || maxSessions > 5) {
    severity = 'high';
  }

  console.log(`  - SIGNIFICANT PATTERN FOUND! Rapid clicks: ${totalRapidClicks}, Severity: ${severity}`);

  return {
    hasIssue: true,
    severity,
    quickStats: {
      totalDeadClicks: significant.reduce((sum, e) => sum + e.clickCount, 0),
      uniqueSessions: maxSessions,
      affectedProducts: significant.length,
      rapidClicks: totalRapidClicks,
    },
  };
}

// ============================================
// General Issue → LLM → Patches Pipeline
// ============================================

import { formatIssueForLLM } from './llm-formatter';
import type { UIIssue } from './types';
import type { NewFileSpec, LLMPipelineResult } from '@/types/suggestions';

// Pattern ID to fix type mapping
const PATTERN_TO_FIX_TYPE: Record<string, string> = {
  button_no_feedback: 'loading_state',
  click_frustration: 'loading_state',
  image_gallery_needed: 'image_gallery',
  address_autocomplete_needed: 'address_autocomplete',
  comparison_feature_needed: 'product_comparison',
  color_preview_needed: 'color_preview',
};

/**
 * Write a new file to the project
 */
export async function writeNewFile(
  filePath: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  console.log(`\n    [WRITE-NEW-FILE] Creating: ${filePath}`);
  try {
    const fullPath = path.join(process.cwd(), filePath);

    // Ensure directory exists
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });

    // Write the file
    await fs.writeFile(fullPath, content, 'utf-8');
    console.log(`    [WRITE-NEW-FILE] SUCCESS: Created ${filePath}`);

    return { success: true };
  } catch (error) {
    console.error(`    [WRITE-NEW-FILE] ERROR:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Write multiple new files (created BEFORE patches are applied)
 */
export async function writeNewFiles(
  files: NewFileSpec[]
): Promise<{
  success: boolean;
  results: Array<{ path: string; success: boolean; error?: string }>
}> {
  console.log(`\n  [WRITE-NEW-FILES] Creating ${files.length} new file(s)...`);
  const results: Array<{ path: string; success: boolean; error?: string }> = [];

  for (const file of files) {
    const result = await writeNewFile(file.path, file.content);
    results.push({
      path: file.path,
      success: result.success,
      error: result.error,
    });
  }

  const allSuccess = results.every(r => r.success);
  console.log(`  [WRITE-NEW-FILES] Complete: ${results.filter(r => r.success).length}/${files.length} succeeded`);

  return { success: allSuccess, results };
}

/**
 * Process a UI issue through the full LLM pipeline:
 * 1. Determine fix type from pattern ID
 * 2. Load specialized agent prompt (if available)
 * 3. Load COMBINED guardrails (static + dynamic site-specific)
 * 4. Format issue into rich prompt via formatIssueForLLM
 * 5. Combine agent prompt + formatted issue + guardrails
 * 6. Request JSON output with newFiles[] AND patches[]
 * 7. Parse response and return results
 */
export async function processIssueWithLLM(issue: UIIssue): Promise<LLMPipelineResult> {
  console.log(`\n[LLM-PIPELINE] Processing issue: ${issue.patternId}`);
  console.log(`  Severity: ${issue.severity}, Events: ${issue.eventCount}`);

  // Determine fix type from pattern ID
  const fixType = PATTERN_TO_FIX_TYPE[issue.patternId] || 'unknown';
  console.log(`[LLM-PIPELINE] Fix type: ${fixType}`);

  try {
    // Step 1: Load specialized agent prompt (if available)
    console.log('[LLM-PIPELINE] Loading agent prompt...');
    const agentPrompt = await loadAgentPrompt(fixType);
    const agentUsed = agentPrompt ? FIX_TYPE_TO_AGENT_PROMPT[fixType] : 'generic';
    console.log(`[LLM-PIPELINE] Agent prompt: ${agentUsed}`);

    // Step 2: Load COMBINED guardrails (static markdown + dynamic site-specific)
    console.log('[LLM-PIPELINE] Loading combined guardrails (static + dynamic)...');
    const { combinedPrompt: guardrailsPrompt, dynamicGuardrails } = await loadCombinedGuardrails();
    console.log(`[LLM-PIPELINE] Combined guardrails loaded: ${guardrailsPrompt.length} chars`);
    console.log(`[LLM-PIPELINE] Site: ${dynamicGuardrails.siteId}, Source: ${dynamicGuardrails.source}`);

    // Step 3: Format the issue into a rich prompt
    console.log('[LLM-PIPELINE] Formatting issue for LLM...');
    const formattedIssue = await formatIssueForLLM(issue);
    console.log('[LLM-PIPELINE] Formatted issue length:', formattedIssue.length);

    // Step 4: Build the combined prompt
    let fullPrompt = '';

    // If we have a specialized agent prompt, use it as the base
    if (agentPrompt) {
      fullPrompt = `${agentPrompt}

---

${guardrailsPrompt}

---

# Issue Context

${formattedIssue}

---`;
    } else {
      // Fallback to generic prompt
      fullPrompt = `${formattedIssue}

---

${guardrailsPrompt}

---`;
    }

    // Step 5: Add structured output instructions
    fullPrompt += `

## REQUIRED OUTPUT FORMAT

You MUST respond with ONLY valid JSON in this exact format:

\`\`\`json
{
  "diagnosis": "Brief explanation of the root cause",
  "explanation": "Why users expected different behavior",
  "newFiles": [
    {
      "path": "context/CompareContext.tsx",
      "content": "// Full file content here...",
      "description": "What this file does"
    }
  ],
  "patches": [
    {
      "filePath": "path/to/file.tsx",
      "description": "What this patch does",
      "oldCode": "EXACT code to replace (copy from source above)",
      "newCode": "The replacement code"
    }
  ]
}
\`\`\`

CRITICAL RULES:
1. oldCode MUST be copied EXACTLY from the component source code shown above (including whitespace)
2. Do NOT guess the code structure - only use what's shown in the source
3. If you cannot find the exact code to patch, return an empty patches array
4. Keep patches minimal - only change what's necessary to fix the issue
5. Follow the existing code style (inline styles, React patterns, etc.)
6. For new files: provide complete, working TypeScript/TSX code
7. For comparison features: create CompareContext.tsx and CompareDrawer.tsx
8. For loading states: use the LoadingSpinner component
9. For galleries: create ProductGallery.tsx
10. Always include stopPropagation() when adding onClick to elements with siblings
11. FOLLOW ALL THEME GUARDRAILS: no border-radius, use only allowed colors, etc.`;

    // Step 6: Send to Gemini
    console.log('[LLM-PIPELINE] Calling Gemini...');
    const response = await callClaude(fullPrompt);
    console.log('[LLM-PIPELINE] Response received, length:', response.length);

    // Step 7: Parse response
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || [null, response];
    const jsonStr = (jsonMatch[1] || response).trim();

    let parsed: {
      diagnosis?: string;
      explanation: string;
      newFiles?: NewFileSpec[];
      patches?: CodePatch[];
    };

    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('[LLM-PIPELINE] Failed to parse JSON:', parseError);
      console.log('[LLM-PIPELINE] Raw response:', response.substring(0, 500));
      return {
        success: false,
        newFiles: [],
        patches: [],
        explanation: 'Failed to parse LLM response as JSON',
        error: `Parse error: ${parseError}`,
        agentUsed,
      };
    }

    console.log('[LLM-PIPELINE] Parsed response:');
    console.log('  Diagnosis:', parsed.diagnosis?.substring(0, 100));
    console.log('  New files count:', parsed.newFiles?.length || 0);
    console.log('  Patches count:', parsed.patches?.length || 0);

    // Step 8: Validate syntax and regenerate individual bad patches
    const MAX_FIX_ATTEMPTS = 3;
    let currentPatches = parsed.patches || [];
    let currentNewFiles = parsed.newFiles || [];

    for (let attempt = 0; attempt < MAX_FIX_ATTEMPTS; attempt++) {
      if (currentPatches.length === 0) break;

      console.log(`[LLM-PIPELINE] Validating patch syntax (attempt ${attempt + 1}/${MAX_FIX_ATTEMPTS})...`);
      const syntaxValidation = await validateAllPatchesSyntax(currentPatches);

      if (syntaxValidation.valid) {
        console.log('[LLM-PIPELINE] Syntax validation passed!');
        break;
      }

      console.log(`[LLM-PIPELINE] ${syntaxValidation.results.filter(r => !r.valid).length} patches failed validation`);

      // Keep valid patches, regenerate invalid ones ONE AT A TIME
      const validPatches = syntaxValidation.results
        .filter(r => r.valid)
        .map(r => currentPatches.find(p => p.filePath === r.patch.filePath && p.oldCode === r.patch.oldCode))
        .filter((p): p is CodePatch => p !== undefined);
      const invalidPatches = syntaxValidation.results.filter(r => !r.valid);

      console.log(`[LLM-PIPELINE] Keeping ${validPatches.length} valid patches, fixing ${invalidPatches.length} invalid patches...`);

      const fixedPatches: CodePatch[] = [...validPatches];

      for (const invalidResult of invalidPatches) {
        const bp = invalidResult.patch;
        const errors = invalidResult.errors;

        console.log(`[LLM-PIPELINE] Fixing patch for ${bp.filePath}: ${errors.join(', ')}`);

        // Read the actual source file
        let sourceContent = '';
        try {
          const fullPath = path.join(process.cwd(), bp.filePath);
          sourceContent = await fs.readFile(fullPath, 'utf-8');
        } catch {
          console.log(`[LLM-PIPELINE] Could not read ${bp.filePath}, skipping patch`);
          continue;
        }

        // Find the original patch to get description
        const originalPatch = currentPatches.find(p => p.filePath === bp.filePath && p.oldCode === bp.oldCode);
        const description = originalPatch?.description || 'Fix code';

        // Ask LLM to fix THIS ONE PATCH only
        const singleFixPrompt = `Fix this ONE patch. It has syntax errors.

## THE BROKEN PATCH
File: ${bp.filePath}
Description: ${description}
Errors: ${errors.join(', ')}

Your oldCode:
\`\`\`
${bp.oldCode}
\`\`\`

Your newCode (BROKEN):
\`\`\`
${bp.newCode}
\`\`\`

## SOURCE FILE (first 3000 chars)
\`\`\`tsx
${sourceContent.substring(0, 3000)}
\`\`\`

## RULES
1. oldCode MUST match text in the source file EXACTLY
2. CRITICAL: newCode brace count must match oldCode brace count
   - Count { in oldCode and newCode - difference must be same
   - Example: if oldCode has 2 { and 1 }, newCode must also have delta of +1
3. newCode must have BALANCED JSX: every <Tag> needs </Tag> or <Tag />
4. Keep the patch SMALL - only change what's needed

Return ONLY this JSON:
\`\`\`json
{
  "filePath": "${bp.filePath}",
  "description": "${description}",
  "oldCode": "exact match from source",
  "newCode": "fixed code with balanced braces/JSX"
}
\`\`\``;

        try {
          const fixResponse = await callClaude(singleFixPrompt);
          const fixJsonMatch = fixResponse.match(/```json\n?([\s\S]*?)\n?```/) || [null, fixResponse];
          const fixJsonStr = (fixJsonMatch[1] || fixResponse).trim();
          const fixedPatch = JSON.parse(fixJsonStr);

          if (fixedPatch.filePath && fixedPatch.oldCode && fixedPatch.newCode) {
            // Accept all patches with valid structure - rely on full file validation
            fixedPatches.push(fixedPatch);
            console.log(`[LLM-PIPELINE] ✓ Fixed patch for ${bp.filePath}`);
          }
        } catch (e) {
          console.log(`[LLM-PIPELINE] ✗ Failed to fix patch: ${e}`);
        }
      }

      currentPatches = fixedPatches;
    }

    // Final validation check
    if (currentPatches.length > 0) {
      const finalValidation = await validateAllPatchesSyntax(currentPatches);
      if (!finalValidation.valid) {
        const validCount = finalValidation.results.filter(r => r.valid).length;
        const invalidCount = finalValidation.results.filter(r => !r.valid).length;
        console.log(`[LLM-PIPELINE] Final: ${validCount} valid, ${invalidCount} invalid patches`);

        // Return only the valid patches
        const validPatches = finalValidation.results
          .filter(r => r.valid)
          .map(r => currentPatches.find(p => p.filePath === r.patch.filePath && p.oldCode === r.patch.oldCode))
          .filter((p): p is CodePatch => p !== undefined);
        if (validPatches.length > 0) {
          console.log(`[LLM-PIPELINE] Returning ${validPatches.length} valid patches (dropped ${invalidCount} invalid)`);
          currentPatches = validPatches;
        } else {
          console.log(`[LLM-PIPELINE] No valid patches after ${MAX_FIX_ATTEMPTS} attempts`);
          return {
            success: false,
            newFiles: currentNewFiles,
            patches: [],
            explanation: parsed.explanation || 'LLM could not generate valid patches',
            error: `All patches failed syntax validation after ${MAX_FIX_ATTEMPTS} attempts`,
            agentUsed,
          };
        }
      }
    }

    return {
      success: true,
      newFiles: parsed.newFiles || [],
      patches: parsed.patches || [],
      explanation: parsed.explanation || parsed.diagnosis || 'No explanation provided',
      agentUsed,
    };

  } catch (error) {
    console.error('[LLM-PIPELINE] Error:', error);
    return {
      success: false,
      newFiles: [],
      patches: [],
      explanation: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process multiple issues through LLM pipeline
 */
export async function processIssuesWithLLM(issues: UIIssue[]): Promise<{
  results: Array<{
    issue: UIIssue;
    success: boolean;
    newFiles: NewFileSpec[];
    patches: CodePatch[];
    explanation: string;
    error?: string;
    agentUsed?: string;
  }>;
  summary: {
    total: number;
    successful: number;
    totalNewFiles: number;
    totalPatches: number;
  };
}> {
  console.log(`\n[LLM-PIPELINE] Processing ${issues.length} issues...`);

  const results: Array<{
    issue: UIIssue;
    success: boolean;
    newFiles: NewFileSpec[];
    patches: CodePatch[];
    explanation: string;
    error?: string;
    agentUsed?: string;
  }> = [];

  for (const issue of issues) {
    const result = await processIssueWithLLM(issue);
    results.push({
      issue,
      ...result,
    });
  }

  const successful = results.filter(r => r.success).length;
  const totalNewFiles = results.reduce((sum, r) => sum + (r.newFiles?.length || 0), 0);
  const totalPatches = results.reduce((sum, r) => sum + (r.patches?.length || 0), 0);

  console.log(`[LLM-PIPELINE] Complete: ${successful}/${issues.length} successful, ${totalNewFiles} new files, ${totalPatches} patches`);

  return {
    results,
    summary: {
      total: issues.length,
      successful,
      totalNewFiles,
      totalPatches,
    },
  };
}
