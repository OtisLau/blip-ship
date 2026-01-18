import { GoogleGenerativeAI } from '@google/generative-ai';
import { promises as fs } from 'fs';
import path from 'path';
import type { AnalyticsEvent } from './types';
import type {
  ImageClickAnalytics,
  DetectedUXIssue,
  ConfigChangeSuggestion,
  ImageClickabilityAnalysis,
} from '@/types/suggestions';

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

/**
 * Load the UX issue detector agent prompt
 */
async function loadDetectorPrompt(): Promise<string> {
  const promptPath = path.join(
    process.cwd(),
    '.claude/agents/ux-issue-detector.md'
  );
  const content = await fs.readFile(promptPath, 'utf-8');
  // Remove YAML frontmatter
  return content.replace(/^---[\s\S]*?---\n/, '');
}

/**
 * Analyze events to detect non-clickable image patterns
 */
export function detectImageClickPatterns(
  events: AnalyticsEvent[]
): ImageClickAnalytics[] {
  // Group image clicks by element/product
  const imageClicks = new Map<string, {
    events: AnalyticsEvent[];
    productId?: string;
    sessions: Set<string>;
  }>();

  // Find all image_click and dead_click events on product images
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

  imageClicks.forEach((data, key) => {
    // Sort events by timestamp
    const sortedEvents = data.events.sort((a, b) => a.timestamp - b.timestamp);

    // Calculate rapid clicks (< 500ms apart)
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

    // Find follow-up title clicks (link clicks within 2s after image click)
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

/**
 * Check if pattern meets minimum thresholds for action
 */
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
  // If already enabled, no analysis needed
  if (currentConfig.products.imageClickable) {
    return {
      issuesDetected: [],
      configChanges: [],
      summary: 'Product images are already clickable. No issues detected.',
    };
  }

  // Detect patterns from events
  const imageAnalytics = detectImageClickPatterns(events);

  // Filter to patterns meeting threshold
  const significantPatterns = imageAnalytics.filter(meetsThreshold);

  if (significantPatterns.length === 0) {
    return {
      issuesDetected: [],
      configChanges: [],
      summary: 'No significant non-clickable image patterns detected.',
    };
  }

  // Build issues from patterns
  const issuesDetected: DetectedUXIssue[] = significantPatterns.map((analytics) => ({
    type: 'non_clickable_image' as const,
    severity: calculateSeverity(analytics),
    elementSelector: analytics.elementSelector,
    productId: analytics.productId,
    analytics,
    detectedAt: new Date().toISOString(),
  }));

  // Use LLM to generate reasoning and config changes
  try {
    const systemPrompt = await loadDetectorPrompt();

    const input = {
      currentConfig,
      imageClickEvents: significantPatterns,
    };

    const prompt = `${systemPrompt}

---

# Current Task

Analyze the following image click patterns and generate config change suggestions:

\`\`\`json
${JSON.stringify(input, null, 2)}
\`\`\`

Remember: Return ONLY valid JSON with issuesDetected, configChanges, and summary.`;

    const result = await geminiModel.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse JSON from response
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

    // Fallback: Generate config change without LLM
    const totalRapidClicks = significantPatterns.reduce((sum, p) => sum + p.rapidClicks, 0);
    const totalSessions = new Set(significantPatterns.flatMap((p) => p.uniqueSessions)).size;

    const configChanges: ConfigChangeSuggestion[] = [
      {
        issueType: 'non_clickable_image',
        configPath: 'products.imageClickable',
        currentValue: false,
        suggestedValue: true,
        reasoning: `Detected ${totalRapidClicks} rapid clicks on product images across ${totalSessions} sessions. Users expect images to open the product modal for more details.`,
        expectedImpact: 'Reduce user frustration and improve product discovery by enabling image clicks to open product modal',
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
