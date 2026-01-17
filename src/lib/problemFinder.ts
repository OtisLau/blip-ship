import { AnalyticsEvent, InferredBehavior } from './types';
import { aggregateEvents, getFrustrationSignals, getTopClickedElements } from './analytics';

// Problem severity levels
export type ProblemSeverity = 'critical' | 'high' | 'medium' | 'low';

// Problem categories
export type ProblemCategory =
  | 'ux_friction'        // Dead clicks, rage clicks, confusing UI
  | 'engagement_dropoff' // Users not scrolling, high bounce
  | 'conversion_blocker' // Low CTA clicks, cart abandonment
  | 'content_issue'      // Sections ignored, poor content performance
  | 'navigation_problem' // Users getting lost, scroll reversals
  | 'mobile_issue';      // Viewport-specific problems

// Individual problem identified
export interface Problem {
  id: string;
  category: ProblemCategory;
  severity: ProblemSeverity;
  title: string;
  description: string;
  evidence: ProblemEvidence[];
  affectedSessions: number;
  affectedSessionsPercent: number;
  recommendation: string;
  priority: number; // 1-100, higher = more urgent
}

// Evidence supporting a problem
export interface ProblemEvidence {
  type: 'metric' | 'event' | 'pattern';
  label: string;
  value: string | number;
  context?: string;
}

// Problem finder result
export interface ProblemAnalysis {
  timestamp: number;
  totalProblems: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  problems: Problem[];
  summary: string;
}

// Thresholds for problem detection
const THRESHOLDS = {
  // UX Friction
  deadClicksPerSession: 2,       // More than 2 dead clicks per session = problem
  rageClicksPerSession: 1,       // Any rage click is a problem
  deadClickHotspotCount: 5,      // Element with 5+ dead clicks = hotspot problem

  // Engagement
  bounceRateHigh: 60,            // Over 60% bounce rate is critical
  bounceRateMedium: 40,          // Over 40% is concerning
  scrollReach50Minimum: 50,      // At least 50% should reach half the page
  scrollReach100Minimum: 20,     // At least 20% should reach bottom
  avgTimeOnPageMinimum: 30,      // Less than 30s = engagement problem

  // Conversion
  ctaClickRateMinimum: 10,       // Less than 10% CTA click rate is low
  addToCartRateMinimum: 5,       // Less than 5% add-to-cart is very low
  cartAbandonmentHigh: 70,       // Over 70% cart abandonment is critical

  // Behavioral
  confusedSessionsPercent: 15,   // Over 15% confused users = navigation problem
  scrollReversalThreshold: 3,    // 3+ scroll reversals = confusion
};

// Helper to generate problem IDs
function generateProblemId(category: ProblemCategory, index: number): string {
  return `prob_${category}_${Date.now()}_${index}`;
}

// Calculate priority score (1-100)
function calculatePriority(severity: ProblemSeverity, affectedPercent: number): number {
  const severityWeight = {
    critical: 40,
    high: 30,
    medium: 20,
    low: 10,
  };

  // Base score from severity + impact from affected percentage
  const baseScore = severityWeight[severity];
  const impactScore = Math.min(affectedPercent, 100) * 0.6;

  return Math.round(Math.min(baseScore + impactScore, 100));
}

// Detect UX friction problems (dead clicks, rage clicks)
function detectUXFriction(events: AnalyticsEvent[], totalSessions: number): Problem[] {
  const problems: Problem[] = [];
  const frustrations = getFrustrationSignals(events);

  // Check for dead click hotspots
  const deadClickHotspots = frustrations.filter(f => f.deadClicks >= THRESHOLDS.deadClickHotspotCount);

  deadClickHotspots.forEach((hotspot, index) => {
    const affectedSessions = events
      .filter(e => e.type === 'dead_click' && e.elementSelector === hotspot.selector)
      .map(e => e.sessionId);
    const uniqueSessions = new Set(affectedSessions).size;
    const affectedPercent = (uniqueSessions / totalSessions) * 100;

    const severity: ProblemSeverity = hotspot.deadClicks >= 10 ? 'critical' : 'high';

    problems.push({
      id: generateProblemId('ux_friction', index),
      category: 'ux_friction',
      severity,
      title: `Dead click hotspot on "${hotspot.text || hotspot.selector}"`,
      description: `Users are clicking on "${hotspot.text || hotspot.selector}" expecting it to be interactive, but nothing happens. This creates frustration and confusion.`,
      evidence: [
        { type: 'metric', label: 'Dead clicks', value: hotspot.deadClicks },
        { type: 'event', label: 'Element', value: hotspot.selector },
        { type: 'metric', label: 'Sessions affected', value: `${affectedPercent.toFixed(1)}%` },
      ],
      affectedSessions: uniqueSessions,
      affectedSessionsPercent: affectedPercent,
      recommendation: `Make "${hotspot.text || hotspot.selector}" interactive (clickable) or change its styling to not appear clickable.`,
      priority: calculatePriority(severity, affectedPercent),
    });
  });

  // Check for rage click areas
  const rageClickAreas = frustrations.filter(f => f.rageClicks >= 2);

  rageClickAreas.forEach((area, index) => {
    const affectedSessions = events
      .filter(e => e.type === 'rage_click' && e.elementSelector === area.selector)
      .map(e => e.sessionId);
    const uniqueSessions = new Set(affectedSessions).size;
    const affectedPercent = (uniqueSessions / totalSessions) * 100;

    problems.push({
      id: generateProblemId('ux_friction', index + deadClickHotspots.length),
      category: 'ux_friction',
      severity: 'critical',
      title: `Rage clicking on "${area.text || area.selector}"`,
      description: `Users are rapidly clicking on "${area.text || area.selector}" multiple times, indicating severe frustration. This element may be unresponsive or not working as expected.`,
      evidence: [
        { type: 'metric', label: 'Rage click incidents', value: area.rageClicks },
        { type: 'event', label: 'Element', value: area.selector },
        { type: 'pattern', label: 'Behavior', value: 'Rapid repeated clicks (3+ in 2 seconds)' },
      ],
      affectedSessions: uniqueSessions,
      affectedSessionsPercent: affectedPercent,
      recommendation: `Investigate why "${area.text || area.selector}" is frustrating users. Check if it's slow to respond, broken, or not behaving as expected.`,
      priority: calculatePriority('critical', affectedPercent),
    });
  });

  return problems;
}

// Detect engagement drop-off problems
function detectEngagementDropoff(events: AnalyticsEvent[], totalSessions: number): Problem[] {
  const problems: Problem[] = [];
  const analytics = aggregateEvents(events);
  const { summary, scrollData } = analytics;

  // High bounce rate
  if (summary.bounceRate >= THRESHOLDS.bounceRateHigh) {
    problems.push({
      id: generateProblemId('engagement_dropoff', 0),
      category: 'engagement_dropoff',
      severity: 'critical',
      title: 'Critical bounce rate',
      description: `${summary.bounceRate}% of visitors leave immediately without any interaction. This indicates the page isn't capturing attention or meeting user expectations.`,
      evidence: [
        { type: 'metric', label: 'Bounce rate', value: `${summary.bounceRate}%` },
        { type: 'metric', label: 'Threshold', value: `>${THRESHOLDS.bounceRateHigh}%` },
      ],
      affectedSessions: Math.round(totalSessions * summary.bounceRate / 100),
      affectedSessionsPercent: summary.bounceRate,
      recommendation: 'Improve above-the-fold content: make the value proposition clearer, use compelling visuals, and ensure the hero section loads fast.',
      priority: calculatePriority('critical', summary.bounceRate),
    });
  } else if (summary.bounceRate >= THRESHOLDS.bounceRateMedium) {
    problems.push({
      id: generateProblemId('engagement_dropoff', 0),
      category: 'engagement_dropoff',
      severity: 'medium',
      title: 'Elevated bounce rate',
      description: `${summary.bounceRate}% bounce rate is higher than ideal. Some visitors aren't finding what they're looking for.`,
      evidence: [
        { type: 'metric', label: 'Bounce rate', value: `${summary.bounceRate}%` },
      ],
      affectedSessions: Math.round(totalSessions * summary.bounceRate / 100),
      affectedSessionsPercent: summary.bounceRate,
      recommendation: 'Review your hero section messaging and ensure it matches your traffic sources and user expectations.',
      priority: calculatePriority('medium', summary.bounceRate),
    });
  }

  // Poor scroll depth
  if (scrollData.reached50 < THRESHOLDS.scrollReach50Minimum) {
    const dropoffPercent = 100 - scrollData.reached50;
    problems.push({
      id: generateProblemId('engagement_dropoff', 1),
      category: 'engagement_dropoff',
      severity: 'high',
      title: 'Users not scrolling past halfway',
      description: `Only ${scrollData.reached50}% of users scroll past the midpoint of your page. Content below the fold is being missed.`,
      evidence: [
        { type: 'metric', label: 'Reached 50%', value: `${scrollData.reached50}%` },
        { type: 'metric', label: 'Reached 100%', value: `${scrollData.reached100}%` },
        { type: 'pattern', label: 'Drop-off', value: `${dropoffPercent}% never see lower content` },
      ],
      affectedSessions: Math.round(totalSessions * dropoffPercent / 100),
      affectedSessionsPercent: dropoffPercent,
      recommendation: 'Add scroll indicators, break up content into digestible sections, or move important content higher on the page.',
      priority: calculatePriority('high', dropoffPercent),
    });
  }

  // Low time on page
  if (summary.avgTimeOnPage < THRESHOLDS.avgTimeOnPageMinimum) {
    problems.push({
      id: generateProblemId('engagement_dropoff', 2),
      category: 'engagement_dropoff',
      severity: 'medium',
      title: 'Very short session duration',
      description: `Users spend only ${summary.avgTimeOnPage.toFixed(1)} seconds on average. This suggests content isn't engaging or users aren't finding what they need.`,
      evidence: [
        { type: 'metric', label: 'Avg time on page', value: `${summary.avgTimeOnPage.toFixed(1)}s` },
        { type: 'metric', label: 'Target minimum', value: `${THRESHOLDS.avgTimeOnPageMinimum}s` },
      ],
      affectedSessions: totalSessions,
      affectedSessionsPercent: 100,
      recommendation: 'Improve content quality, add engaging elements (videos, interactive features), and ensure page loads quickly.',
      priority: calculatePriority('medium', 80),
    });
  }

  return problems;
}

// Detect conversion blocker problems
function detectConversionBlockers(events: AnalyticsEvent[], totalSessions: number): Problem[] {
  const problems: Problem[] = [];
  const analytics = aggregateEvents(events);

  // Low CTA click rate
  if (analytics.summary.ctaClickRate < THRESHOLDS.ctaClickRateMinimum) {
    problems.push({
      id: generateProblemId('conversion_blocker', 0),
      category: 'conversion_blocker',
      severity: 'high',
      title: 'Low call-to-action engagement',
      description: `Only ${analytics.summary.ctaClickRate}% of users click on CTAs. Your calls-to-action may not be compelling or visible enough.`,
      evidence: [
        { type: 'metric', label: 'CTA click rate', value: `${analytics.summary.ctaClickRate}%` },
        { type: 'metric', label: 'Target minimum', value: `${THRESHOLDS.ctaClickRateMinimum}%` },
      ],
      affectedSessions: Math.round(totalSessions * (100 - analytics.summary.ctaClickRate) / 100),
      affectedSessionsPercent: 100 - analytics.summary.ctaClickRate,
      recommendation: 'Make CTAs more prominent with contrasting colors, clearer text, and better positioning. Test different CTA copy.',
      priority: calculatePriority('high', 100 - analytics.summary.ctaClickRate),
    });
  }

  // Cart abandonment signals
  const cartReviews = events.filter(e => e.type === 'cart_review');
  const addToCarts = events.filter(e => e.type === 'add_to_cart');
  const checkouts = events.filter(e => e.type === 'checkout_start');

  if (cartReviews.length > 0 && addToCarts.length > 0) {
    const cartOpenSessions = new Set(cartReviews.map(e => e.sessionId)).size;
    const addToCartSessions = new Set(addToCarts.map(e => e.sessionId)).size;
    const checkoutSessions = new Set(checkouts.map(e => e.sessionId)).size;

    // Users who added to cart but didn't checkout
    const abandonmentRate = addToCartSessions > 0
      ? ((addToCartSessions - checkoutSessions) / addToCartSessions) * 100
      : 0;

    if (abandonmentRate > THRESHOLDS.cartAbandonmentHigh) {
      problems.push({
        id: generateProblemId('conversion_blocker', 1),
        category: 'conversion_blocker',
        severity: 'critical',
        title: 'High cart abandonment',
        description: `${abandonmentRate.toFixed(1)}% of users who add items to cart don't proceed to checkout. Significant revenue is being lost.`,
        evidence: [
          { type: 'metric', label: 'Cart abandonment', value: `${abandonmentRate.toFixed(1)}%` },
          { type: 'metric', label: 'Added to cart', value: addToCartSessions },
          { type: 'metric', label: 'Started checkout', value: checkoutSessions },
        ],
        affectedSessions: addToCartSessions - checkoutSessions,
        affectedSessionsPercent: (addToCartSessions - checkoutSessions) / totalSessions * 100,
        recommendation: 'Simplify checkout process, show clear pricing with no surprises, add trust signals, and consider exit-intent offers.',
        priority: calculatePriority('critical', abandonmentRate),
      });
    }
  }

  // Price sensitivity signals
  const priceChecks = events.filter(e => e.type === 'price_check');
  const priceSensitiveSessions = new Set(
    events.filter(e => e.inferredBehavior === 'price_sensitive').map(e => e.sessionId)
  ).size;

  if (priceSensitiveSessions / totalSessions > 0.3) {
    problems.push({
      id: generateProblemId('conversion_blocker', 2),
      category: 'conversion_blocker',
      severity: 'medium',
      title: 'High price sensitivity detected',
      description: `${((priceSensitiveSessions / totalSessions) * 100).toFixed(1)}% of users show price-sensitive behavior. Users may find your prices too high.`,
      evidence: [
        { type: 'metric', label: 'Price-sensitive sessions', value: `${priceSensitiveSessions}` },
        { type: 'pattern', label: 'Behavior', value: 'Repeatedly checking/clicking prices' },
      ],
      affectedSessions: priceSensitiveSessions,
      affectedSessionsPercent: (priceSensitiveSessions / totalSessions) * 100,
      recommendation: 'Consider showing value justification, adding comparison to competitors, displaying savings, or offering discounts.',
      priority: calculatePriority('medium', (priceSensitiveSessions / totalSessions) * 100),
    });
  }

  return problems;
}

// Detect navigation/confusion problems
function detectNavigationProblems(events: AnalyticsEvent[], totalSessions: number): Problem[] {
  const problems: Problem[] = [];

  // Confused users (from inferred behavior)
  const confusedEvents = events.filter(e => e.inferredBehavior === 'confused');
  const confusedSessions = new Set(confusedEvents.map(e => e.sessionId)).size;
  const confusedPercent = (confusedSessions / totalSessions) * 100;

  if (confusedPercent > THRESHOLDS.confusedSessionsPercent) {
    problems.push({
      id: generateProblemId('navigation_problem', 0),
      category: 'navigation_problem',
      severity: 'high',
      title: 'Users are getting confused',
      description: `${confusedPercent.toFixed(1)}% of sessions show confusion signals (rage clicks, dead clicks, erratic behavior). The UI may not be intuitive.`,
      evidence: [
        { type: 'metric', label: 'Confused sessions', value: `${confusedPercent.toFixed(1)}%` },
        { type: 'pattern', label: 'Signals', value: 'Rage clicks, dead clicks, scroll reversals' },
      ],
      affectedSessions: confusedSessions,
      affectedSessionsPercent: confusedPercent,
      recommendation: 'Simplify navigation, add clearer labels, ensure interactive elements look clickable, and consider user testing.',
      priority: calculatePriority('high', confusedPercent),
    });
  }

  // Scroll reversals (going back and forth)
  const scrollReversals = events.filter(e => e.type === 'scroll_reversal');
  const scrollReversalSessions = new Set(scrollReversals.map(e => e.sessionId)).size;
  const reversalPercent = (scrollReversalSessions / totalSessions) * 100;

  if (reversalPercent > 20) {
    problems.push({
      id: generateProblemId('navigation_problem', 1),
      category: 'navigation_problem',
      severity: 'medium',
      title: 'Users scrolling back and forth',
      description: `${reversalPercent.toFixed(1)}% of users repeatedly scroll up and down, indicating they're searching for something or are confused about page structure.`,
      evidence: [
        { type: 'metric', label: 'Sessions with scroll reversals', value: `${reversalPercent.toFixed(1)}%` },
        { type: 'event', label: 'Scroll reversal events', value: scrollReversals.length },
      ],
      affectedSessions: scrollReversalSessions,
      affectedSessionsPercent: reversalPercent,
      recommendation: 'Improve content organization, add a table of contents or quick navigation, and ensure information is easy to find.',
      priority: calculatePriority('medium', reversalPercent),
    });
  }

  return problems;
}

// Detect content issues
function detectContentIssues(events: AnalyticsEvent[], totalSessions: number): Problem[] {
  const problems: Problem[] = [];

  // Sections not being viewed
  const sectionViews = events.filter(e => e.type === 'section_view');
  const sectionViewsPerSession = sectionViews.length / totalSessions;

  // If users aren't viewing multiple sections
  if (sectionViewsPerSession < 2 && totalSessions > 5) {
    problems.push({
      id: generateProblemId('content_issue', 0),
      category: 'content_issue',
      severity: 'medium',
      title: 'Low section engagement',
      description: `Users view only ${sectionViewsPerSession.toFixed(1)} sections on average. Page sections may not be compelling enough to scroll to.`,
      evidence: [
        { type: 'metric', label: 'Sections viewed per session', value: sectionViewsPerSession.toFixed(1) },
        { type: 'metric', label: 'Total section views', value: sectionViews.length },
      ],
      affectedSessions: totalSessions,
      affectedSessionsPercent: 100,
      recommendation: 'Make section transitions more enticing, add visual cues to scroll, and ensure each section provides clear value.',
      priority: calculatePriority('medium', 60),
    });
  }

  // Text selection without conversion (research behavior without action)
  const textSelections = events.filter(e => e.type === 'text_selection');
  const textSelectionSessions = new Set(textSelections.map(e => e.sessionId));
  const convertedSessions = new Set(
    events.filter(e => e.type === 'add_to_cart' || e.type === 'checkout_start')
      .map(e => e.sessionId)
  );

  // Users who researched but didn't convert
  let researchNoConvert = 0;
  textSelectionSessions.forEach(session => {
    if (!convertedSessions.has(session)) researchNoConvert++;
  });

  if (textSelectionSessions.size > 3 && researchNoConvert / textSelectionSessions.size > 0.7) {
    problems.push({
      id: generateProblemId('content_issue', 1),
      category: 'content_issue',
      severity: 'low',
      title: 'Researchers not converting',
      description: `Users who select text (researching behavior) often don't convert. They may need more information or reassurance.`,
      evidence: [
        { type: 'metric', label: 'Text selection sessions', value: textSelectionSessions.size },
        { type: 'metric', label: 'Converted', value: textSelectionSessions.size - researchNoConvert },
        { type: 'pattern', label: 'Behavior', value: 'Research without purchase' },
      ],
      affectedSessions: researchNoConvert,
      affectedSessionsPercent: (researchNoConvert / totalSessions) * 100,
      recommendation: 'Add FAQ section, comparison tables, detailed specs, or trust signals to help researchers make decisions.',
      priority: calculatePriority('low', (researchNoConvert / totalSessions) * 100),
    });
  }

  return problems;
}

// Main problem finder function
export function findProblems(events: AnalyticsEvent[]): ProblemAnalysis {
  const sessions = [...new Set(events.map(e => e.sessionId))];
  const totalSessions = sessions.length;

  if (totalSessions === 0) {
    return {
      timestamp: Date.now(),
      totalProblems: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      problems: [],
      summary: 'No session data available for analysis.',
    };
  }

  // Collect all problems
  const allProblems: Problem[] = [
    ...detectUXFriction(events, totalSessions),
    ...detectEngagementDropoff(events, totalSessions),
    ...detectConversionBlockers(events, totalSessions),
    ...detectNavigationProblems(events, totalSessions),
    ...detectContentIssues(events, totalSessions),
  ];

  // Sort by priority (highest first)
  allProblems.sort((a, b) => b.priority - a.priority);

  // Count by severity
  const criticalCount = allProblems.filter(p => p.severity === 'critical').length;
  const highCount = allProblems.filter(p => p.severity === 'high').length;
  const mediumCount = allProblems.filter(p => p.severity === 'medium').length;
  const lowCount = allProblems.filter(p => p.severity === 'low').length;

  // Generate summary
  let summary = '';
  if (criticalCount > 0) {
    summary = `Found ${criticalCount} critical issue${criticalCount > 1 ? 's' : ''} requiring immediate attention. `;
  }
  if (highCount > 0) {
    summary += `${highCount} high-priority issue${highCount > 1 ? 's' : ''} should be addressed soon. `;
  }
  if (allProblems.length === 0) {
    summary = 'No significant problems detected. Continue monitoring for patterns.';
  } else {
    summary += `Total: ${allProblems.length} issue${allProblems.length > 1 ? 's' : ''} identified across ${totalSessions} sessions.`;
  }

  return {
    timestamp: Date.now(),
    totalProblems: allProblems.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    problems: allProblems,
    summary: summary.trim(),
  };
}

// Format problems for display/AI
export function formatProblemsForAI(analysis: ProblemAnalysis): string {
  if (analysis.problems.length === 0) {
    return 'No problems detected in the current data.';
  }

  const lines = [
    `# Problem Analysis Report`,
    `Generated: ${new Date(analysis.timestamp).toISOString()}`,
    '',
    `## Summary`,
    analysis.summary,
    '',
    `## Issues by Severity`,
    `- Critical: ${analysis.criticalCount}`,
    `- High: ${analysis.highCount}`,
    `- Medium: ${analysis.mediumCount}`,
    `- Low: ${analysis.lowCount}`,
    '',
    `## Detailed Problems (by priority)`,
  ];

  analysis.problems.forEach((problem, index) => {
    lines.push('');
    lines.push(`### ${index + 1}. [${problem.severity.toUpperCase()}] ${problem.title}`);
    lines.push(`**Category:** ${problem.category.replace('_', ' ')}`);
    lines.push(`**Priority Score:** ${problem.priority}/100`);
    lines.push(`**Affected:** ${problem.affectedSessions} sessions (${problem.affectedSessionsPercent.toFixed(1)}%)`);
    lines.push('');
    lines.push(`**Description:** ${problem.description}`);
    lines.push('');
    lines.push(`**Evidence:**`);
    problem.evidence.forEach(e => {
      lines.push(`- ${e.label}: ${e.value}${e.context ? ` (${e.context})` : ''}`);
    });
    lines.push('');
    lines.push(`**Recommendation:** ${problem.recommendation}`);
  });

  return lines.join('\n');
}

// Get problems filtered by category
export function getProblemsByCategory(
  analysis: ProblemAnalysis,
  category: ProblemCategory
): Problem[] {
  return analysis.problems.filter(p => p.category === category);
}

// Get problems filtered by severity
export function getProblemsBySeverity(
  analysis: ProblemAnalysis,
  severity: ProblemSeverity
): Problem[] {
  return analysis.problems.filter(p => p.severity === severity);
}
