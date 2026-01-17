# Autonomous CRO Agent - Master Architecture Doc

> **Team:** Identity  
> **Hackathon:** UofTHacks 2026  
> **Challenge:** Amplitude Technical Challenge  
> **One-liner:** An AI agent that analyzes user behavior, proposes website improvements, and deploys them—all without the owner writing a single line of code.

---

## 🎯 Problem Statement

Small businesses don't know how to harness analytics to improve their websites. Existing tools (Hotjar, GA, etc.) show data but leave owners to figure out what to do with it. No tool closes the full loop:

```
Collect behavior → Analyze issues → Propose fixes → Implement changes → Owner approves → Deploy
```

**We're building an autonomous conversion rate optimization (CRO) agent that does this entire loop without the owner needing any technical knowledge.**

---

## 🧠 Core Concept

```
┌─────────────────────────────────────────────────────────────────────┐
│                        THE SELF-IMPROVING LOOP                       │
│                                                                      │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│   │  TRACK   │ → │ ANALYZE  │ → │ GENERATE │ → │  PREVIEW │     │
│   │ behavior │    │ with AI  │    │  changes │    │ & approve│     │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘     │
│        ↑                                               │            │
│        └───────────────── DEPLOY ←────────────────────┘            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ✅ Amplitude Challenge Fit

| Amplitude Criteria | How We Address It |
|--------------------|-------------------|
| Track behavioral events | Clicks, scroll depth, rage clicks, dead zones, bounces |
| AI on top of data | AI analyzes patterns → proposes config changes |
| "Data → insights → action" loop | Full loop: track → analyze → generate → preview → deploy |
| Beyond if/else rules | AI finds non-obvious patterns, explains reasoning |
| Self-improving product | Site literally gets better over time automatically |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
│                                                                      │
│   ┌─────────────────────┐         ┌─────────────────────┐          │
│   │     Demo Store      │         │     Dashboard       │          │
│   │  (/store)           │         │  (/dashboard)       │          │
│   │                     │         │                     │          │
│   │  - Config-driven    │         │  - Analytics view   │          │
│   │  - Tracks events    │         │  - AI suggestions   │          │
│   │  - Live/Preview     │         │  - Preview iframe   │          │
│   │    modes            │         │  - Accept/Reject    │          │
│   └──────────┬──────────┘         └──────────┬──────────┘          │
│              │                                │                      │
└──────────────┼────────────────────────────────┼──────────────────────┘
               │                                │
               ▼                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                            BACKEND                                   │
│                                                                      │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│   │ /api/events │  │/api/analyze │  │/api/config  │                │
│   │             │  │             │  │             │                │
│   │ Receives    │  │ AI analyzes │  │ Returns     │                │
│   │ tracking    │  │ patterns &  │  │ site config │                │
│   │ data        │  │ generates   │  │ (live or    │                │
│   │             │  │ suggestions │  │ preview)    │                │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                │
│          │                │                │                        │
│          ▼                ▼                ▼                        │
│   ┌─────────────────────────────────────────────────────────┐      │
│   │                    DATA STORE                            │      │
│   │  - events[]      - suggestions[]     - siteConfig{}     │      │
│   └─────────────────────────────────────────────────────────┘      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Framework | **Next.js 14 (App Router)** | Handles frontend + API in one |
| Styling | **Tailwind CSS** | Fast prototyping |
| Database | **JSON files** | No setup, hackathon-friendly |
| AI | **Claude API** | Analysis + suggestion generation |
| Hosting | **Vercel** | Instant deploys |

---

## 📁 Project Structure

```
/app
  /store
    page.tsx                    # Demo store (renders from config)
  /dashboard
    page.tsx                    # Owner dashboard
  /api
    /events/route.ts            # POST - receive tracking events
    /analytics/route.ts         # GET - aggregated analytics
    /analyze/route.ts           # POST - trigger AI analysis
    /config/route.ts            # GET - site config (live/preview)
    /suggestions/route.ts       # GET - list all suggestions
    /suggestions/[id]
      /accept/route.ts          # POST - accept suggestion
      /reject/route.ts          # POST - reject suggestion

/components
  /store
    Hero.tsx
    ProductGrid.tsx
    Testimonials.tsx
    Footer.tsx
  /dashboard
    AnalyticsOverview.tsx
    SuggestionCard.tsx
    PreviewFrame.tsx
  /tracking
    EventTracker.tsx            # Wraps store, tracks all events

/lib
  tracker.ts                    # Event tracking utilities
  ai.ts                         # AI analysis functions
  db.ts                         # JSON file read/write
  utils.ts                      # Helper functions

/data
  events.json                   # Stored events
  config-live.json              # Current live config
  config-preview.json           # Preview config
  suggestions.json              # All suggestions
```

---

## 📊 Event Schema

### Event Types to Track

```typescript
type EventType =
  // Clicks
  | 'click'              // Any click
  | 'rage_click'         // 3+ clicks same area within 2s
  | 'dead_click'         // Click on non-interactive element
  | 'cta_click'          // CTA button click
  
  // Engagement
  | 'page_view'          // Page loaded
  | 'scroll_depth'       // 25%, 50%, 75%, 100%
  | 'section_view'       // Section entered viewport
  
  // Conversion
  | 'add_to_cart'
  | 'checkout_start'
  | 'purchase'
  
  // Frustration
  | 'bounce'             // Left without interaction
  | 'rapid_scroll'       // Scrolling without reading
```

### Event Object

```typescript
interface AnalyticsEvent {
  id: string;
  type: EventType;
  timestamp: number;
  sessionId: string;
  
  // Click data
  x?: number;
  y?: number;
  elementSelector?: string;
  elementText?: string;
  
  // Scroll data
  scrollDepth?: number;
  
  // Page data
  pageUrl: string;
  viewport: {
    width: number;
    height: number;
  };
}
```

### Example Events

```json
{
  "id": "evt_001",
  "type": "click",
  "timestamp": 1705123456789,
  "sessionId": "sess_abc123",
  "x": 450,
  "y": 320,
  "elementSelector": "button.hero-cta",
  "elementText": "Shop Now",
  "pageUrl": "/",
  "viewport": { "width": 1920, "height": 1080 }
}
```

```json
{
  "id": "evt_002",
  "type": "rage_click",
  "timestamp": 1705123460000,
  "sessionId": "sess_abc123",
  "x": 200,
  "y": 400,
  "elementSelector": "div.product-image",
  "clickCount": 5
}
```

```json
{
  "id": "evt_003",
  "type": "scroll_depth",
  "timestamp": 1705123470000,
  "sessionId": "sess_abc123",
  "scrollDepth": 50
}
```

---

## ⚙️ Site Config Schema

The demo store renders entirely from this config. AI modifies this to make changes.

```typescript
interface SiteConfig {
  id: string;
  version: number;
  status: 'live' | 'preview';
  
  hero: {
    headline: string;
    subheadline: string;
    backgroundColor: string;
    cta: {
      text: string;
      color: string;
      textColor: string;
      position: 'inside-hero' | 'below-hero';
      size: 'small' | 'medium' | 'large';
    };
  };
  
  products: {
    sectionTitle: string;
    layout: 'grid-2' | 'grid-3' | 'grid-4';
    items: Array<{
      id: string;
      name: string;
      price: number;
      image: string;
      badge?: string;
    }>;
  };
  
  testimonials: {
    sectionTitle: string;
    show: boolean;
    items: Array<{
      quote: string;
      author: string;
    }>;
  };
  
  footer: {
    backgroundColor: string;
    showNewsletter: boolean;
    newsletterHeadline?: string;
  };
}
```

### Example Live Config

```json
{
  "id": "config_001",
  "version": 1,
  "status": "live",
  
  "hero": {
    "headline": "Premium Coffee, Delivered Fresh",
    "subheadline": "Roasted within 24 hours of shipping",
    "backgroundColor": "#1a1a1a",
    "cta": {
      "text": "Shop Now",
      "color": "#ff5733",
      "textColor": "#ffffff",
      "position": "below-hero",
      "size": "medium"
    }
  },
  
  "products": {
    "sectionTitle": "Our Bestsellers",
    "layout": "grid-3",
    "items": [
      {
        "id": "prod_001",
        "name": "Ethiopian Yirgacheffe",
        "price": 18.99,
        "image": "/images/coffee-1.jpg",
        "badge": "Best Seller"
      },
      {
        "id": "prod_002",
        "name": "Colombian Supremo",
        "price": 16.99,
        "image": "/images/coffee-2.jpg"
      },
      {
        "id": "prod_003",
        "name": "Sumatra Dark Roast",
        "price": 17.99,
        "image": "/images/coffee-3.jpg"
      }
    ]
  },
  
  "testimonials": {
    "sectionTitle": "What Our Customers Say",
    "show": true,
    "items": [
      {
        "quote": "Best coffee I've ever had at home.",
        "author": "Sarah M."
      },
      {
        "quote": "Finally, a subscription that's worth it.",
        "author": "James K."
      }
    ]
  },
  
  "footer": {
    "backgroundColor": "#0a0a0a",
    "showNewsletter": true,
    "newsletterHeadline": "Get 10% off your first order"
  }
}
```

---

## 💡 AI Suggestion Schema

```typescript
interface Suggestion {
  id: string;
  createdAt: number;
  status: 'pending' | 'accepted' | 'rejected';
  
  analysis: {
    summary: string;
    insights: string[];
    dataPoints: Array<{
      metric: string;
      value: number;
      interpretation: string;
    }>;
  };
  
  recommendation: {
    summary: string;
    rationale: string;
    expectedImpact: string;
  };
  
  changes: Array<{
    field: string;       // dot notation: "hero.cta.position"
    oldValue: any;
    newValue: any;
    reason: string;
  }>;
  
  previewConfig: SiteConfig;
}
```

### Example Suggestion

```json
{
  "id": "sug_001",
  "createdAt": 1705123456789,
  "status": "pending",
  
  "analysis": {
    "summary": "Users are not engaging with the primary CTA",
    "insights": [
      "73% of users never scroll past the hero section",
      "CTA is positioned below the fold on most devices",
      "12 rage clicks detected on product images (not clickable)",
      "Average time on page is 8 seconds before bounce"
    ],
    "dataPoints": [
      {
        "metric": "CTA Click Rate",
        "value": 2.3,
        "interpretation": "Only 2.3% of visitors click the main CTA"
      },
      {
        "metric": "Scroll to CTA",
        "value": 27,
        "interpretation": "Only 27% scroll far enough to see CTA"
      }
    ]
  },
  
  "recommendation": {
    "summary": "Move CTA inside hero and increase visibility",
    "rationale": "The CTA is invisible to 73% of visitors who don't scroll. Moving it above the fold ensures all visitors see the primary action.",
    "expectedImpact": "Could increase CTA engagement by 40-60%"
  },
  
  "changes": [
    {
      "field": "hero.cta.position",
      "oldValue": "below-hero",
      "newValue": "inside-hero",
      "reason": "Place CTA where users actually see it"
    },
    {
      "field": "hero.cta.size",
      "oldValue": "medium",
      "newValue": "large",
      "reason": "Increase visual prominence"
    },
    {
      "field": "hero.cta.color",
      "oldValue": "#ff5733",
      "newValue": "#22c55e",
      "reason": "Green CTAs typically outperform orange"
    }
  ],
  
  "previewConfig": { }
}
```

---

## 🔌 API Endpoints

### `POST /api/events`
Receives tracking events from demo store.

```typescript
// Request
{ events: AnalyticsEvent[] }

// Response
{ success: true, received: 5 }
```

### `GET /api/analytics`
Returns aggregated analytics.

```typescript
// Response
{
  summary: {
    totalSessions: 150,
    totalEvents: 2340,
    bounceRate: 45.2,
    avgTimeOnPage: 12.5,
    ctaClickRate: 2.3
  },
  heatmapData: {
    clicks: [{ x, y, count }],
    rageClicks: [{ x, y, count }],
    deadClicks: [{ x, y, count }]
  },
  scrollData: {
    reached25: 89,
    reached50: 54,
    reached75: 31,
    reached100: 12
  }
}
```

### `POST /api/analyze`
Triggers AI analysis, returns suggestion.

```typescript
// Response
{ suggestion: Suggestion }
```

### `GET /api/config?mode=live|preview`
Returns site config.

```typescript
// Response
{ config: SiteConfig }
```

### `GET /api/suggestions`
Lists all suggestions.

```typescript
// Response
{ suggestions: Suggestion[] }
```

### `POST /api/suggestions/[id]/accept`
Accepts suggestion, swaps preview → live.

```typescript
// Response
{ success: true, newVersion: 2 }
```

### `POST /api/suggestions/[id]/reject`
Rejects suggestion, deletes preview.

```typescript
// Response
{ success: true }
```

---

## 🧩 Key Components

### 1. EventTracker (wraps entire store)

```tsx
// /components/tracking/EventTracker.tsx
'use client';

import { useEffect, useRef } from 'react';

export function EventTracker({ children }: { children: React.ReactNode }) {
  const clickBuffer = useRef<Array<{ time: number; x: number; y: number }>>([]);
  const scrollMilestones = useRef(new Set<number>());
  const sessionId = useRef(generateSessionId());

  useEffect(() => {
    // Track all clicks
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      sendEvent({
        type: 'click',
        x: e.clientX,
        y: e.clientY,
        elementSelector: getSelector(target),
        elementText: target.textContent?.slice(0, 50),
        sessionId: sessionId.current,
      });

      // Detect rage clicks
      const now = Date.now();
      clickBuffer.current.push({ time: now, x: e.clientX, y: e.clientY });
      clickBuffer.current = clickBuffer.current.filter(c => now - c.time < 2000);
      
      if (clickBuffer.current.length >= 3) {
        sendEvent({
          type: 'rage_click',
          x: e.clientX,
          y: e.clientY,
          clickCount: clickBuffer.current.length,
          sessionId: sessionId.current,
        });
      }

      // Detect dead clicks
      const isInteractive = target.closest('a, button, input, [onclick]');
      if (!isInteractive) {
        sendEvent({
          type: 'dead_click',
          x: e.clientX,
          y: e.clientY,
          elementSelector: getSelector(target),
          sessionId: sessionId.current,
        });
      }
    };

    // Track scroll depth
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.round((scrollTop / docHeight) * 100);
      
      [25, 50, 75, 100].forEach(milestone => {
        if (scrollPercent >= milestone && !scrollMilestones.current.has(milestone)) {
          scrollMilestones.current.add(milestone);
          sendEvent({
            type: 'scroll_depth',
            scrollDepth: milestone,
            sessionId: sessionId.current,
          });
        }
      });
    };

    // Track page view
    sendEvent({
      type: 'page_view',
      sessionId: sessionId.current,
    });

    document.addEventListener('click', handleClick);
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      document.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return <>{children}</>;
}

function sendEvent(event: Partial<AnalyticsEvent>) {
  const fullEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    pageUrl: window.location.pathname,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    ...event,
  };
  
  navigator.sendBeacon('/api/events', JSON.stringify({ events: [fullEvent] }));
}

function getSelector(el: HTMLElement): string {
  if (el.id) return `#${el.id}`;
  if (el.className) return `${el.tagName.toLowerCase()}.${el.className.split(' ')[0]}`;
  return el.tagName.toLowerCase();
}

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
```

### 2. Demo Store Page

```tsx
// /app/store/page.tsx
import { EventTracker } from '@/components/tracking/EventTracker';
import { Hero } from '@/components/store/Hero';
import { ProductGrid } from '@/components/store/ProductGrid';
import { Testimonials } from '@/components/store/Testimonials';
import { Footer } from '@/components/store/Footer';
import { getConfig } from '@/lib/db';

export default async function Store({
  searchParams,
}: {
  searchParams: { mode?: string };
}) {
  const mode = searchParams.mode === 'preview' ? 'preview' : 'live';
  const config = await getConfig(mode);

  return (
    <EventTracker>
      <main className="min-h-screen">
        <Hero config={config.hero} />
        <ProductGrid config={config.products} />
        <Testimonials config={config.testimonials} />
        <Footer config={config.footer} />
      </main>
    </EventTracker>
  );
}
```

### 3. Dashboard Page

```tsx
// /app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { AnalyticsOverview } from '@/components/dashboard/AnalyticsOverview';
import { SuggestionCard } from '@/components/dashboard/SuggestionCard';

export default function Dashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/analytics').then(r => r.json()).then(setAnalytics);
    fetch('/api/suggestions').then(r => r.json()).then(d => setSuggestions(d.suggestions));
  }, []);

  const handleAnalyze = async () => {
    const res = await fetch('/api/analyze', { method: 'POST' });
    const data = await res.json();
    setSuggestions(prev => [data.suggestion, ...prev]);
  };

  const handleAccept = async (id: string) => {
    await fetch(`/api/suggestions/${id}/accept`, { method: 'POST' });
    setSuggestions(prev => 
      prev.map(s => s.id === id ? { ...s, status: 'accepted' } : s)
    );
    setPreviewId(null);
  };

  const handleReject = async (id: string) => {
    await fetch(`/api/suggestions/${id}/reject`, { method: 'POST' });
    setSuggestions(prev => 
      prev.map(s => s.id === id ? { ...s, status: 'rejected' } : s)
    );
    setPreviewId(null);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">CRO Dashboard</h1>
      
      <div className="grid grid-cols-2 gap-8">
        {/* Left: Analytics + Preview */}
        <div className="space-y-6">
          <AnalyticsOverview data={analytics} />
          
          <button
            onClick={handleAnalyze}
            className="w-full py-3 bg-blue-600 rounded-lg font-medium"
          >
            🤖 Run AI Analysis
          </button>
          
          {previewId && (
            <div className="border border-gray-700 rounded-lg overflow-hidden">
              <div className="bg-gray-800 px-4 py-2 text-sm">Preview</div>
              <iframe
                src={`/store?mode=preview`}
                className="w-full h-96"
              />
            </div>
          )}
        </div>

        {/* Right: Suggestions */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">AI Suggestions</h2>
          {suggestions.map(suggestion => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onPreview={() => setPreviewId(suggestion.id)}
              onAccept={() => handleAccept(suggestion.id)}
              onReject={() => handleReject(suggestion.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## 🤖 AI Analysis Prompt

```typescript
// /lib/ai.ts
export async function analyzeAndSuggest(
  events: AnalyticsEvent[],
  currentConfig: SiteConfig
): Promise<Suggestion> {
  
  const analytics = aggregateEvents(events);
  
  const prompt = `You are a conversion rate optimization expert. Analyze this behavioral data and suggest specific improvements.

## Current Site Config
${JSON.stringify(currentConfig, null, 2)}

## Analytics Data
- Total sessions: ${analytics.totalSessions}
- Bounce rate: ${analytics.bounceRate}%
- CTA click rate: ${analytics.ctaClickRate}%
- Avg time on page: ${analytics.avgTimeOnPage}s

## Scroll Depth (% of users reaching each milestone)
- 25%: ${analytics.scrollData.reached25}%
- 50%: ${analytics.scrollData.reached50}%
- 75%: ${analytics.scrollData.reached75}%
- 100%: ${analytics.scrollData.reached100}%

## Dead Clicks (non-interactive elements being clicked)
${JSON.stringify(analytics.deadClicks, null, 2)}

## Rage Clicks (frustration signals)
${JSON.stringify(analytics.rageClicks, null, 2)}

## Top Click Areas
${JSON.stringify(analytics.topClickAreas, null, 2)}

Analyze this data and provide:
1. Top 2-3 issues hurting conversion (cite specific data)
2. Specific changes to the site config to fix them
3. Expected impact of each change

Respond with JSON matching this exact schema:
{
  "analysis": {
    "summary": "One sentence summary of main issue",
    "insights": ["insight 1", "insight 2", "insight 3"],
    "dataPoints": [
      { "metric": "name", "value": 0, "interpretation": "what it means" }
    ]
  },
  "recommendation": {
    "summary": "What to change",
    "rationale": "Why this will help",
    "expectedImpact": "Expected improvement"
  },
  "changes": [
    {
      "field": "hero.cta.position",
      "oldValue": "current value",
      "newValue": "new value",
      "reason": "why"
    }
  ]
}

Only output valid JSON, no other text.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  });
  
  const aiResponse = JSON.parse(response.content[0].text);
  const previewConfig = applyChanges(currentConfig, aiResponse.changes);
  
  return {
    id: `sug_${Date.now()}`,
    createdAt: Date.now(),
    status: 'pending',
    ...aiResponse,
    previewConfig
  };
}
```

---

## 🎬 Demo Flow (2-3 min pitch)

### 1. The Problem (30s)
> "Small businesses spend thousands on websites but have no idea why visitors aren't converting. Tools like Hotjar show heatmaps, but owners don't know what to do with that data."

### 2. Show the Demo Store (20s)
> "Here's a typical e-commerce site. Looks fine, but conversions are terrible. Let's see what's happening."

### 3. Show Data Collection (20s)
- Click around the store
- Show events being tracked in console/dashboard
> "We track every click, scroll, rage click, dead zone..."

### 4. AI Analysis (40s)
- Click "Run AI Analysis"
- Show the suggestion card
> "Our AI found that 73% of users never scroll past the hero—they never even see the CTA. It's proposing to move the button above the fold and change the color."

### 5. Preview & Accept (30s)
- Click preview, show side-by-side
- Click accept, site updates
> "The owner doesn't write code, doesn't need to understand analytics. They just approve or reject."

### 6. The Loop (20s)
> "This runs continuously. The site literally improves itself over time based on real user behavior. It's a self-improving product."

---

## ✅ Build Checklist

### Phase 1: Foundation (2 hrs)
- [ ] Next.js project setup
- [ ] Tailwind config
- [ ] Data folder + JSON files
- [ ] Basic store layout (static)

### Phase 2: Config-Driven Store (1.5 hrs)
- [ ] SiteConfig type
- [ ] Hero component (reads from config)
- [ ] ProductGrid component
- [ ] Testimonials component
- [ ] Footer component
- [ ] /api/config endpoint

### Phase 3: Event Tracking (1.5 hrs)
- [ ] EventTracker component
- [ ] Click tracking
- [ ] Scroll depth tracking
- [ ] Rage click detection
- [ ] Dead click detection
- [ ] /api/events endpoint

### Phase 4: Dashboard (2 hrs)
- [ ] Dashboard layout
- [ ] AnalyticsOverview component
- [ ] SuggestionCard component
- [ ] Preview iframe
- [ ] Accept/Reject flow
- [ ] /api/analytics endpoint
- [ ] /api/suggestions endpoints

### Phase 5: AI Layer (2 hrs)
- [ ] Claude API setup
- [ ] Analytics aggregation function
- [ ] AI prompt
- [ ] Parse response + apply changes
- [ ] /api/analyze endpoint

### Phase 6: Polish (1 hr)
- [ ] Seed demo data
- [ ] Nice before/after comparison
- [ ] Error handling
- [ ] Demo prep

---

## 🚀 Quick Start

```bash
# Create project
npx create-next-app@latest cro-agent --typescript --tailwind --app --src-dir

# Install deps
cd cro-agent
npm install @anthropic-ai/sdk

# Create data files
mkdir -p data
echo '[]' > data/events.json
echo '[]' > data/suggestions.json

# Add your live config to data/config-live.json

# Add ANTHROPIC_API_KEY to .env.local
echo 'ANTHROPIC_API_KEY=your-key' > .env.local

# Run
npm run dev
```

---

## 💬 Judging Talking Points

1. **Behavioral Data**: Proper event schema—clicks, scroll depth, rage clicks, dead zones
2. **AI Substantiveness**: Pattern recognition + reasoning, not just if/else rules
3. **Self-Improving**: Site literally gets better without human intervention
4. **Product Impact**: SMBs actually need this—democratizes CRO
5. **Amplitude Fit**: Direct implementation of data → insights → action loop

---

## 🤔 Open Decisions

- [ ] Project name
- [ ] What product does demo store sell (coffee? shirts?)
- [ ] Pre-seed with demo data or collect live during presentation?
- [ ] Team task split

---

**LFG 🚀**
