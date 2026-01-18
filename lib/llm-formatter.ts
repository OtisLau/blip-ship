/**
 * LLM Context Formatter
 * Formats UI issues into structured prompts for LLM consumption
 * to generate code fixes.
 *
 * Instead of hardcoded fix suggestions, we paint a picture of what happened
 * and let the LLM reason about what the fix should be.
 */

import { UIIssue } from './types'
import { AnalyticsEvent } from '../types/events'
import { resolveComponent, getComponentContext } from './component-registry'

/**
 * Build a narrative of what happened from the events
 */
function buildUserJourney(events: AnalyticsEvent[]): string {
  const lines: string[] = []

  for (const event of events) {
    const e = event as unknown as Record<string, unknown>
    const ctx = e.elementContext as Record<string, unknown> | undefined
    const pageCtx = e.pageContext as Record<string, unknown> | undefined

    const time = pageCtx?.timeOnPage
      ? `${Math.round((pageCtx.timeOnPage as number) / 1000)}s into session`
      : ''

    const position = e.x && e.y ? `at position (${e.x}, ${e.y})` : ''
    const scrollPos = pageCtx?.scrollPercent
      ? `${pageCtx.scrollPercent}% down the page`
      : ''

    let action = ''
    switch (event.type) {
      case 'dead_click':
        action = `User clicked on \`${ctx?.fullPath || event.elementSelector}\` expecting it to do something`
        if (ctx?.computedStyle) {
          const style = ctx.computedStyle as Record<string, string>
          if (style.cursor === 'pointer') {
            action += ` (element has cursor:pointer so it LOOKS clickable)`
          }
        }
        break
      case 'rage_click':
        action = `User rage-clicked ${e.clickCount || 3}+ times rapidly on \`${ctx?.fullPath || event.elementSelector}\` - frustrated that nothing happened`
        break
      case 'double_click':
        action = `User double-clicked on \`${ctx?.fullPath || event.elementSelector}\` - likely expecting different behavior or unsure if first click registered`
        break
      case 'scroll_reversal':
        action = `User scrolled up and down repeatedly - searching for something they can't find`
        break
      case 'slow_form_fill':
        action = `User spent a long time filling \`${event.elementSelector}\` - possibly struggling with the input`
        break
      case 'checkout_abandon':
        action = `User abandoned the checkout flow`
        break
      case 'exit_intent':
        action = `User moved mouse to leave the page`
        break
      default:
        action = `User performed ${event.type} on \`${event.elementSelector}\``
    }

    // Add frustration reason if we have one
    const frustrationReason = e.frustrationReason as string | undefined
    if (frustrationReason) {
      action += `\n   → Analysis: ${frustrationReason}`
    }

    // Add element details
    if (ctx) {
      const bbox = ctx.boundingBox as Record<string, number> | undefined
      if (bbox) {
        action += `\n   → Element: ${bbox.width}x${bbox.height}px at (${bbox.left}, ${bbox.top})`
      }
      if (ctx.isInteractive === false) {
        action += `\n   → ⚠️ Element is NOT interactive (no click handler)`
      }
      if (ctx.nearestInteractive) {
        action += `\n   → Nearest clickable element: \`${ctx.nearestInteractive}\``
      }
    }

    lines.push(`[${time}] ${position} ${scrollPos}\n${action}`)
  }

  return lines.join('\n\n')
}

/**
 * Analyze patterns across events
 */
function analyzePatterns(events: AnalyticsEvent[]): {
  totalClicks: number
  uniquePositions: number
  timeSpan: string
  timeSpanMs: number
  eventTypes: Record<string, number>
  allPaths: string[]
  clickPositions: Array<{ x: number; y: number; count: number }>
} {
  const eventTypes: Record<string, number> = {}
  const positions = new Map<string, number>()
  const paths = new Set<string>()

  let minTime = Infinity
  let maxTime = 0

  for (const event of events) {
    const e = event as unknown as Record<string, unknown>
    eventTypes[event.type] = (eventTypes[event.type] || 0) + 1

    if (e.x && e.y) {
      const key = `${Math.round((e.x as number) / 10) * 10},${Math.round((e.y as number) / 10) * 10}`
      positions.set(key, (positions.get(key) || 0) + 1)
    }

    const ctx = e.elementContext as unknown as
      | Record<string, unknown>
      | undefined
    if (ctx?.fullPath) {
      paths.add(ctx.fullPath as string)
    }

    const pageCtx = e.pageContext as unknown as
      | Record<string, unknown>
      | undefined
    if (pageCtx?.timeOnPage) {
      const t = pageCtx.timeOnPage as number
      if (t < minTime) minTime = t
      if (t > maxTime) maxTime = t
    }
  }

  const timeSpanMs =
    minTime === Infinity || maxTime === 0 ? 0 : maxTime - minTime
  const timeSpan =
    timeSpanMs <= 0
      ? 'instant'
      : timeSpanMs < 1000
        ? `${timeSpanMs}ms`
        : timeSpanMs < 60000
          ? `${Math.round(timeSpanMs / 1000)}s`
          : `${Math.round(timeSpanMs / 60000)}m`

  const clickPositions = Array.from(positions.entries())
    .map(([key, count]) => {
      const [x, y] = key.split(',').map(Number)
      return { x, y, count }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    totalClicks: events.length,
    uniquePositions: positions.size,
    timeSpan,
    timeSpanMs,
    eventTypes,
    allPaths: Array.from(paths),
    clickPositions,
  }
}

/**
 * Extract product interaction details (objective, no behavior labeling)
 */
function analyzeProductInteractions(events: AnalyticsEvent[]): {
  products: Array<{
    name: string
    price?: number
    viewCount: number
    addedToCart: boolean
    removedFromCart: boolean
  }>
  priceRange: { min: number; max: number } | null
  actionTimeline: string[]
} {
  const productMap = new Map<
    string,
    {
      name: string
      price?: number
      views: number
      addedToCart: boolean
      removedFromCart: boolean
    }
  >()
  const actionTimeline: string[] = []

  for (const event of events) {
    const e = event as unknown as Record<string, unknown>
    const productName = e.productName as string
    const productPrice = e.productPrice as number | undefined

    if (productName) {
      const existing = productMap.get(productName) || {
        name: productName,
        price: productPrice,
        views: 0,
        addedToCart: false,
        removedFromCart: false,
      }

      if (event.type === 'product_view' || event.type === 'product_compare') {
        existing.views++
        actionTimeline.push(
          `Viewed "${productName}"${productPrice ? ` ($${productPrice})` : ''}`
        )
      } else if (event.type === 'add_to_cart') {
        existing.addedToCart = true
        actionTimeline.push(
          `Added "${productName}" to cart${productPrice ? ` ($${productPrice})` : ''}`
        )
      } else if (event.type === 'cart_remove') {
        existing.removedFromCart = true
        actionTimeline.push(`Removed "${productName}" from cart`)
      }

      if (productPrice && !existing.price) existing.price = productPrice
      productMap.set(productName, existing)
    }
  }

  const products = Array.from(productMap.values()).map(p => ({
    name: p.name,
    price: p.price,
    viewCount: p.views,
    addedToCart: p.addedToCart,
    removedFromCart: p.removedFromCart,
  }))

  const prices = products
    .map(p => p.price)
    .filter((p): p is number => p !== undefined)
  const priceRange =
    prices.length >= 2
      ? { min: Math.min(...prices), max: Math.max(...prices) }
      : null

  return { products, priceRange, actionTimeline }
}

/**
 * Analyze why user expected element to be clickable
 */
function analyzeClickExpectation(events: AnalyticsEvent[]): {
  visualCues: string[]
  likelyIntent: string
  suggestedBehavior: string
} {
  const visualCues: string[] = []
  let likelyIntent = ''
  let suggestedBehavior = ''

  const firstEvent = events[0] as unknown as Record<string, unknown>
  const ctx = firstEvent?.elementContext as Record<string, unknown> | undefined

  if (ctx) {
    const style = ctx.computedStyle as Record<string, string> | undefined
    const tag = ctx.tag as string
    const attrs = ctx.attributes as Record<string, string> | undefined

    // Check visual cues
    if (style?.cursor === 'pointer') {
      visualCues.push(
        'Element has cursor:pointer - universally indicates clickability'
      )
    }
    if (tag === 'img') {
      visualCues.push(
        'Product images are conventionally clickable for zoom/details'
      )
    }
    if (tag === 'h3' || tag === 'h2') {
      visualCues.push(
        'Product titles are conventionally links to product pages'
      )
    }
    if (attrs?.src?.includes('unsplash') || attrs?.src?.includes('product')) {
      visualCues.push(
        'Appears to be a product image - users expect to see larger version'
      )
    }
    if (ctx.nearestInteractive) {
      visualCues.push(
        `Nearby clickable element: ${ctx.nearestInteractive} - user may have expected this element to be part of same interaction`
      )
    }

    // Determine likely intent
    if (tag === 'img') {
      likelyIntent =
        'View larger image, see product details, or open product page'
      suggestedBehavior =
        'Make image clickable: open lightbox, zoom, or navigate to product detail page'
    } else if (tag === 'h3' || tag === 'h2') {
      likelyIntent = 'Navigate to product detail page'
      suggestedBehavior = 'Wrap title in <Link> to product detail page'
    } else if (tag === 'div' && ctx.text) {
      likelyIntent = 'Interact with this content block'
      suggestedBehavior =
        'Consider if this container should be a clickable card'
    } else if (tag === 'button') {
      likelyIntent = 'Trigger an action and see feedback'
      suggestedBehavior =
        'Add loading state, disable during action, show success/error feedback'
    }
  }

  return { visualCues, likelyIntent, suggestedBehavior }
}

/**
 * Get session-level context
 */
function analyzeSessionBehavior(events: AnalyticsEvent[]): {
  inferredIntent: string
  confidence: number
  journeyStage: string
  frustrationLevel: string
} {
  const firstEvent = events[0] as unknown as Record<string, unknown>
  const inferredBehavior =
    (firstEvent?.inferredBehavior as string) || 'browsing'
  const behaviorConfidence = (firstEvent?.behaviorConfidence as number) || 0.5
  const behaviorContext = (firstEvent?.behaviorContext as string) || ''

  // Count frustration signals
  const frustrationEvents = events.filter(e =>
    ['dead_click', 'rage_click', 'double_click', 'scroll_reversal'].includes(
      e.type
    )
  ).length

  let frustrationLevel = 'low'
  if (frustrationEvents >= 5) frustrationLevel = 'high'
  else if (frustrationEvents >= 2) frustrationLevel = 'medium'

  // Determine journey stage
  let journeyStage = 'browsing'
  const hasAddToCart = events.some(e => e.type === 'add_to_cart')
  const hasCheckout = events.some(e => e.type === 'checkout_start')
  const hasProductView = events.some(e => e.type === 'product_view')

  if (hasCheckout) journeyStage = 'checkout'
  else if (hasAddToCart) journeyStage = 'ready_to_buy'
  else if (hasProductView) journeyStage = 'considering'

  return {
    inferredIntent: behaviorContext || inferredBehavior,
    confidence: behaviorConfidence,
    journeyStage,
    frustrationLevel,
  }
}

/**
 * Format a single issue for LLM consumption
 */
export async function formatIssueForLLM(issue: UIIssue): Promise<string> {
  // Get component code - try fullPath from sample events first
  const sampleEvent = issue.sampleEvents[0] as
    | Record<string, unknown>
    | undefined
  const elementContext = sampleEvent?.elementContext as
    | Record<string, unknown>
    | undefined
  const fullPath = elementContext?.fullPath as string | undefined

  const component = resolveComponent(
    fullPath || issue.elementSelector,
    sampleEvent?.elementText as string | undefined
  )
  let componentCode = ''
  let componentPath = issue.componentPath
  let componentName = issue.componentName

  if (component) {
    const context = await getComponentContext(component)
    componentCode = context.code || ''
    componentPath = context.path
    componentName = context.name
  }

  // Run all analyses
  const patterns = analyzePatterns(issue.sampleEvents)
  const sessionBehavior = analyzeSessionBehavior(issue.sampleEvents)
  const clickExpectation = analyzeClickExpectation(issue.sampleEvents)
  const productInteractions = analyzeProductInteractions(issue.sampleEvents)
  const userJourney = buildUserJourney(issue.sampleEvents)

  // Get unique frustration reasons
  const frustrationReasons = [
    ...new Set(
      issue.sampleEvents
        .map(
          e =>
            (e as unknown as Record<string, unknown>)
              .frustrationReason as string
        )
        .filter(Boolean)
    ),
  ]

  // Determine issue type for specialized sections
  const hasMultiProductActivity =
    issue.patternId === 'multi_product_interaction' ||
    productInteractions.products.length >= 2
  const isClickFrustration =
    patterns.eventTypes['dead_click'] ||
    patterns.eventTypes['rage_click'] ||
    patterns.eventTypes['double_click']

  return `# UI Problem Detected

## Quick Summary
- **Issue Type**: ${issue.patternId}
- **Severity**: ${issue.severity.toUpperCase()}
- **Events**: ${issue.eventCount} frustration signals from ${issue.uniqueSessions} session(s)
- **User State**: ${sessionBehavior.journeyStage} (${sessionBehavior.inferredIntent})
- **Frustration Level**: ${sessionBehavior.frustrationLevel}

### Event Breakdown
- **Total**: ${issue.eventCount} events over ${patterns.timeSpan}
- **Types**: ${Object.entries(patterns.eventTypes)
    .map(([t, c]) => `${c}x ${t}`)
    .join(', ')}
${patterns.clickPositions.length > 0 ? `- **Click hotspots**: ${patterns.clickPositions.map(p => `(${p.x}, ${p.y}): ${p.count} clicks`).join(', ')}` : ''}

---
${
  hasMultiProductActivity
    ? `
## 🛒 Product Activity (Raw Data)

**Products involved:**
${productInteractions.products
  .map(p => {
    const actions: string[] = []
    if (p.viewCount > 0) actions.push(`viewed ${p.viewCount}x`)
    if (p.addedToCart) actions.push('added to cart')
    if (p.removedFromCart) actions.push('removed from cart')
    return `- **${p.name}**${p.price ? ` ($${p.price})` : ''} — ${actions.join(', ')}`
  })
  .join('\n')}

${productInteractions.priceRange ? `**Price range observed**: $${productInteractions.priceRange.min} - $${productInteractions.priceRange.max}` : ''}

**Action sequence (chronological):**
${productInteractions.actionTimeline.map((a, i) => `${i + 1}. ${a}`).join('\n')}

**Note**: This is raw behavioral data. The LLM should interpret what this behavior means and whether any UI changes would help.

---
`
    : ''
}
${
  isClickFrustration && clickExpectation.visualCues.length > 0
    ? `
## 🖱️ Why User Expected This To Be Clickable

**Visual cues that suggested interactivity:**
${clickExpectation.visualCues.map(c => `- ${c}`).join('\n')}

**User's likely intent**: ${clickExpectation.likelyIntent}

**Suggested fix**: ${clickExpectation.suggestedBehavior}

---
`
    : ''
}
## 📝 What The System Observed
${frustrationReasons.length > 0 ? frustrationReasons.map(r => `- ${r}`).join('\n') : '- No specific frustration reasons captured'}

---

## 🎬 User Actions Timeline
${userJourney}

---

## 📍 Location Details
| Property | Value |
|----------|-------|
| Page | ${issue.sectionId || 'Unknown'} |
| Component | ${componentName} |
| File | \`${componentPath}\` |
| Element | \`${issue.elementSelector}\` |
| Full DOM Path | \`${fullPath || 'Unknown'}\` |

${
  patterns.allPaths.length > 1
    ? `### All Affected Element Paths
${patterns.allPaths.map(p => `- \`${p}\``).join('\n')}`
    : ''
}

---
${
  elementContext
    ? `
## 🔍 Element State When Clicked

| Property | Value |
|----------|-------|
| Tag | \`<${elementContext.tag}>\` |
| Size | ${(elementContext.boundingBox as Record<string, number>)?.width}x${(elementContext.boundingBox as Record<string, number>)?.height}px |
| Position | (${(elementContext.boundingBox as Record<string, number>)?.left}, ${(elementContext.boundingBox as Record<string, number>)?.top}) |
| Cursor | \`${(elementContext.computedStyle as Record<string, string>)?.cursor}\` |
| Pointer Events | \`${(elementContext.computedStyle as Record<string, string>)?.pointerEvents}\` |
| Interactive | ${elementContext.isInteractive ? '✅ Yes' : '❌ No'} |
| Visible | ${elementContext.isVisible ? '✅ Yes' : '❌ No'} |
| Text | "${(elementContext.text as string)?.slice(0, 100) || '(empty)'}" |

### Element Attributes
\`\`\`json
${JSON.stringify(elementContext.attributes || {}, null, 2)}
\`\`\`

---
`
    : ''
}
${
  componentCode
    ? `
## 💻 Component Source Code
File: \`${componentPath}\`

\`\`\`tsx
${componentCode}
\`\`\`

---
`
    : ''
}
## 🎯 Your Task

You are analyzing **real user behavior data**. Based on the evidence above:

1. **Diagnose**: What is the root cause of user frustration?
2. **Explain**: Why did users expect different behavior? (Consider UX conventions, visual cues)
3. **Recommend**: What's the minimal code change to fix this?

${componentCode ? 'Provide the modified component code.' : 'Describe the fix needed.'}
`
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
  }

  const categoryCounts = {
    frustration: issues.filter(i => i.category === 'frustration').length,
    missing_feature: issues.filter(i => i.category === 'missing_feature')
      .length,
    conversion_blocker: issues.filter(i => i.category === 'conversion_blocker')
      .length,
  }

  const componentCounts = new Map<string, number>()
  for (const issue of issues) {
    const count = componentCounts.get(issue.componentName) || 0
    componentCounts.set(issue.componentName, count + 1)
  }

  const topComponents = Array.from(componentCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

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

`

  for (const issue of issues) {
    // Get frustration reasons from sample events
    const frustrationReasons = issue.sampleEvents
      .map(
        e =>
          (e as unknown as Record<string, unknown>).frustrationReason as string
      )
      .filter(Boolean)
      .slice(0, 2)

    // Get element context from first event
    const ctx = (issue.sampleEvents[0] as Record<string, unknown>)
      ?.elementContext as Record<string, unknown> | undefined
    const fullPath = (ctx?.fullPath as string) || issue.elementSelector
    const tag = (ctx?.tag as string) || issue.elementSelector
    const attrs = ctx?.attributes as Record<string, string> | undefined

    // Build a more descriptive element name
    let elementDesc = `<${tag}>`

    // Handle page/section-level issues (no specific element)
    if (issue.elementSelector.startsWith('/') || !ctx) {
      elementDesc = `Page: ${issue.elementSelector}`
    } else if (attrs?.src) {
      // For images, show the image filename
      const filename = attrs.src.split('/').pop()?.split('?')[0] || 'image'
      elementDesc = `<img> (${filename})`
    } else if (attrs?.['data-product-id']) {
      elementDesc = `<${tag}> in product card`
    } else if (ctx?.text) {
      const text = (ctx.text as string).slice(0, 30)
      elementDesc = `<${tag}> "${text}"`
    }

    // Get product names if this involves multiple products
    const productNames = issue.sampleEvents
      .map(e => (e as unknown as Record<string, unknown>).productName as string)
      .filter(Boolean)
    const uniqueProducts = [...new Set(productNames)]

    // Get event type breakdown
    const eventTypes = issue.sampleEvents.reduce(
      (acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
    const eventBreakdown = Object.entries(eventTypes)
      .map(([t, c]) => `${c}x ${t}`)
      .join(', ')

    summary += `### ${issue.severity.toUpperCase()}: ${issue.eventCount} signals (${eventBreakdown})
- **File**: \`${issue.componentPath}\`
- **Element**: ${elementDesc}
${fullPath !== issue.elementSelector ? `- **DOM Path**: \`${fullPath}\`` : ''}
- **Sessions**: ${issue.uniqueSessions}
${uniqueProducts.length > 0 ? `- **Products involved**: ${uniqueProducts.join(', ')}` : ''}
${frustrationReasons.length > 0 ? `- **Evidence**: ${frustrationReasons[0]}` : ''}

`
  }

  return summary
}

/**
 * Format an issue for a business-friendly email
 */
export function formatIssueForEmail(issue: UIIssue): {
  subject: string
  headline: string
  description: string
  impact: string
  fixDescription: string
} {
  // Create business-friendly descriptions
  const categoryDescriptions: Record<string, string> = {
    frustration: 'User Experience Issue',
    missing_feature: 'Feature Opportunity',
    conversion_blocker: 'Conversion Issue',
  }

  const severityEmojis: Record<string, string> = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢',
  }

  return {
    subject: `${severityEmojis[issue.severity]} ${categoryDescriptions[issue.category]}: ${issue.problemStatement.slice(0, 60)}`,
    headline: issue.problemStatement,
    description: `We analyzed user behavior on your site and found that ${issue.eventCount} users (across ${issue.uniqueSessions} sessions) experienced this issue in the last 24 hours.`,
    impact: `${issue.userIntent}. Currently, ${issue.currentOutcome.toLowerCase()}.`,
    fixDescription: issue.suggestedFix,
  }
}

/**
 * Create a structured JSON format for API consumption
 */
export async function formatIssueAsJSON(issue: UIIssue): Promise<{
  issue: UIIssue
  llmPrompt: string
  emailContent: ReturnType<typeof formatIssueForEmail>
  componentCode: string | null
}> {
  const component = resolveComponent(
    issue.elementSelector,
    issue.sampleEvents[0]?.elementText
  )
  let componentCode: string | null = null

  if (component) {
    const context = await getComponentContext(component)
    componentCode = context.code
  }

  return {
    issue,
    llmPrompt: await formatIssueForLLM(issue),
    emailContent: formatIssueForEmail(issue),
    componentCode,
  }
}
