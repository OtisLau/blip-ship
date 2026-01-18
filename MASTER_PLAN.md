# Blip-Ship: Automated UX Fix Engine

## What It Does

Automatically detects UX problems from user behavior and generates code fixes **for any site**.

```
User clicks/scrolls/forms → Pattern detection → LLM generates fix → Validate against site theme → Apply patch
```

**Key Design Principle**: Guardrails are **dynamic and site-specific**, not hardcoded. The engine extracts theme patterns from each site's codebase and validates generated fixes against that site's unique design system.

---

## Engine Pipeline

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  1. CAPTURE                                                                   │
│     EventTracker.tsx → POST /api/events → data/events.json                   │
│                                                                               │
│     Events: click, dead_click, rage_click, scroll_depth, scroll_reversal,    │
│             product_view, add_to_cart, form_focus, form_blur, exit_intent,   │
│             hover_intent, text_selection, checkout_abandon, etc.             │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│  2. DETECT                                                                    │
│     lib/issue-detector.ts → detectIssues()                                   │
│                                                                               │
│     24 Pattern Rules:                                                         │
│     • click_frustration      → users rage/dead clicking                      │
│     • button_no_feedback     → buttons need loading states                   │
│     • image_gallery_needed   → images need lightbox/zoom                     │
│     • comparison_feature_needed → users comparing products                   │
│     • address_autocomplete_needed → slow address entry                       │
│     • color_preview_needed   → users want color swatches                     │
│     • shipping_cost_surprise → cart abandonment at checkout                  │
│     • scroll_confusion       → users lost on page                            │
│     • poor_visual_hierarchy  → unclear what's clickable                      │
│     ... and more                                                             │
│                                                                               │
│     Output: UIIssue[] with severity, pattern, element, sample events         │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│  3. GENERATE FIX                                                              │
│     lib/ux-detection.ts → processIssueWithLLM(issue)                         │
│                                                                               │
│     Steps:                                                                    │
│     a) Map pattern → fix type (button_no_feedback → loading_state)           │
│     b) Load agent prompt (.claude/agents/button-loading-generator.md)        │
│     c) Load DYNAMIC site guardrails (lib/site-guardrails.ts)                 │
│     d) Format issue context (lib/llm-formatter.ts)                           │
│     e) Call Gemini API with combined prompt + site-specific constraints      │
│     f) Parse JSON response: { newFiles[], patches[], explanation }           │
│                                                                               │
│     Agent Prompts:                                                            │
│     • button-loading-generator.md   → add spinners to buttons                │
│     • gallery-generator.md          → create image lightbox                  │
│     • autocomplete-generator.md     → add address autocomplete               │
│     • comparison-generator.md       → add product comparison                 │
│     • color-preview-generator.md    → add color swatches                     │
│     • dead-click-action-mapper.md   → fix dead click elements                │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│  4. VALIDATE (Dynamic)                                                        │
│     lib/fix-validators.ts → validateFixPatches(patches, siteGuardrails)      │
│                                                                               │
│     Loads guardrails from: data/site-guardrails.json (per-site config)       │
│                                                                               │
│     Dynamic checks based on site config:                                      │
│     • Colors match site's extracted palette                                  │
│     • Border radius matches site's design system                             │
│     • Font weights match site's typography                                   │
│     • Button styles match site's existing patterns                           │
│     • Transitions match site's animation conventions                         │
│                                                                               │
│     If validation fails → use fallback from lib/fallback-generators.ts       │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│  5. APPLY                                                                     │
│     lib/ux-detection.ts → applyCodePatches(patches), writeNewFiles(files)    │
│                                                                               │
│     • Backup original files (in-memory)                                       │
│     • Find oldCode in file (exact string match)                              │
│     • Replace with newCode                                                    │
│     • Write new files if needed (contexts, components)                       │
│     • Record fix in pendingFixes array                                       │
│                                                                               │
│     Revert: DELETE /api/events restores all backups                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Event Types Captured

| Category | Events | What It Detects |
|----------|--------|-----------------|
| **Clicks** | `click`, `dead_click`, `rage_click`, `double_click`, `cta_click` | Frustration, broken UX |
| **Scroll** | `scroll_depth`, `scroll_reversal` | Confusion, lost users |
| **E-commerce** | `product_view`, `add_to_cart`, `checkout_start`, `checkout_abandon`, `purchase` | Conversion issues |
| **Forms** | `form_focus`, `form_blur`, `slow_form_fill`, `form_error` | Form friction |
| **Intent** | `exit_intent`, `hover_intent`, `text_selection` | User frustration |
| **Product** | `image_click`, `color_select`, `product_compare` | Missing features |

---

## Pattern → Fix Type Mapping

| Pattern ID | Fix Type | Agent Prompt |
|------------|----------|--------------|
| `button_no_feedback` | `loading_state` | `button-loading-generator.md` |
| `click_frustration` | `loading_state` | `button-loading-generator.md` |
| `image_gallery_needed` | `image_gallery` | `gallery-generator.md` |
| `address_autocomplete_needed` | `address_autocomplete` | `autocomplete-generator.md` |
| `comparison_feature_needed` | `product_comparison` | `comparison-generator.md` |
| `color_preview_needed` | `color_preview` | `color-preview-generator.md` |

---

## Thresholds (from guardrails)

| Condition | Minimum Required |
|-----------|------------------|
| Rapid clicks | 5+ within 500ms |
| Unique sessions | 3+ |
| Events for detection | 10+ total |

| Severity | Rapid Clicks | Sessions |
|----------|--------------|----------|
| Critical | >30 | >10 |
| High | 15-30 | 5-10 |
| Medium | 5-15 | 2-5 |
| Low | <5 | 1 |

---

## Dynamic Site Guardrails

Guardrails are **NOT hardcoded**. Each site has its own guardrails config that the engine uses for validation.

### Guardrails Config Schema (`data/site-guardrails.json`)

```json
{
  "siteId": "my-store",
  "extractedAt": "2026-01-18T00:00:00Z",
  "source": "auto-extracted",

  "colors": {
    "backgrounds": ["#111", "#fafafa", "#f5f5f5", "#fff", "transparent"],
    "text": ["#111", "#374151", "#6b7280", "#fff"],
    "borders": ["#e5e7eb", "#111", "transparent"],
    "accents": ["#3b82f6"],
    "accentContexts": ["hero-cta"]
  },

  "typography": {
    "allowedFontWeights": [500, 600],
    "buttonFontSizeRange": [12, 14],
    "requireUppercaseButtons": true,
    "letterSpacing": "0.5px"
  },

  "spacing": {
    "borderRadiusAllowed": [0],
    "buttonPaddingH": [12, 32],
    "buttonPaddingV": [12, 14],
    "minTapTarget": 44
  },

  "animations": {
    "maxTransitionDuration": "0.4s",
    "allowedEasings": ["ease", "ease-in-out", "linear"]
  },

  "components": {
    "buttonPatterns": ["uppercase", "letter-spacing"],
    "loadingSpinnerSize": 16
  }
}
```

### How Guardrails Are Populated

1. **Auto-extraction** (preferred): `lib/theme-extractor.ts` scans the codebase
   - Parses CSS/Tailwind classes from components
   - Extracts color palette from inline styles
   - Detects typography patterns
   - Outputs to `data/site-guardrails.json`

2. **Manual config**: Site owner provides guardrails JSON

3. **Hybrid**: Auto-extract + manual overrides

### Validator Uses Dynamic Config

```typescript
// lib/fix-validators.ts
export function validateFix(code: string, guardrails: SiteGuardrails) {
  // Check colors against guardrails.colors (not hardcoded!)
  // Check typography against guardrails.typography
  // etc.
}
```

---

## File Structure (Engine Only)

```
lib/
├── issue-detector.ts      # Pattern rules, detectIssues()
├── ux-detection.ts        # LLM pipeline, patch application
├── llm-formatter.ts       # Format issues for LLM context
├── gemini.ts              # Gemini API calls
├── fix-validators.ts      # DYNAMIC guardrail validation (uses site config)
├── site-guardrails.ts     # Load/save/merge site guardrails
├── theme-extractor.ts     # Auto-extract theme from codebase
├── fallback-generators.ts # Hardcoded fallbacks
├── component-registry.ts  # Map selectors → components
├── db.ts                  # JSON file persistence
└── types.ts               # UIIssue, PatternRule, SiteGuardrails types

.claude/
├── agents/                # LLM prompts per fix type (generic, not site-specific)
│   ├── button-loading-generator.md
│   ├── gallery-generator.md
│   ├── autocomplete-generator.md
│   ├── comparison-generator.md
│   ├── color-preview-generator.md
│   └── dead-click-action-mapper.md
└── rules/                 # Static rules (behavior, not theme)
    ├── ux-config-guardrails.md
    └── click-action-guardrails.md

app/api/
├── events/route.ts        # POST: receive events, trigger detection
├── ux-issues/route.ts     # GET: list detected issues
└── guardrails/route.ts    # GET/POST: manage site guardrails

components/tracking/
└── EventTracker.tsx       # Client-side event capture

data/
├── events.json            # Stored events
├── ui-issues.json         # Detected issues
└── site-guardrails.json   # DYNAMIC site-specific theme config
```

---

## API Endpoints

```
POST /api/events
  Body: { events: AnalyticsEvent[] }
  Triggers: Detection if 10+ events, LLM analysis if dead clicks detected
  Returns: { received, totalEvents, deadClickCount, pendingFixes }

GET /api/events
  Returns: { eventCounts, pendingFixes, appliedFixes }

DELETE /api/events
  Reverts all applied fixes from backups
  Returns: { revertedFiles }

GET /api/ux-issues
  Runs detection and returns issues
  Returns: { issues: UIIssue[] }

GET /api/guardrails
  Returns current site guardrails config
  Returns: { guardrails: SiteGuardrails }

POST /api/guardrails
  Update or regenerate site guardrails
  Body: { action: 'extract' | 'update', overrides?: Partial<SiteGuardrails> }
  Returns: { guardrails: SiteGuardrails, extractedFrom?: string[] }

POST /api/guardrails/extract
  Auto-extract guardrails from codebase
  Body: { paths?: string[], merge?: boolean }
  Returns: { guardrails: SiteGuardrails, sources: string[] }
```

---

## LLM Output Format

The LLM must return JSON in this format:

```json
{
  "diagnosis": "Why this is happening",
  "explanation": "What the fix does",
  "newFiles": [
    {
      "path": "context/CompareContext.tsx",
      "content": "// Full file content...",
      "description": "What this file does"
    }
  ],
  "patches": [
    {
      "filePath": "components/store/ProductGrid.tsx",
      "description": "What this patch does",
      "oldCode": "EXACT code to find",
      "newCode": "Replacement code"
    }
  ]
}
```

---

## Current Status

### Working
- [x] Event capture (20+ event types)
- [x] Issue detection (24 pattern rules)
- [x] LLM fix generation (Gemini integration)
- [x] Patch application (string replacement)
- [x] Fallback generators (5 fix types)
- [x] File backups and revert

### In Progress
- [ ] **Dynamic guardrails system** - make validation site-agnostic
  - [ ] Create `SiteGuardrails` type schema
  - [ ] Implement `lib/site-guardrails.ts` (load/save)
  - [ ] Implement `lib/theme-extractor.ts` (auto-extract from codebase)
  - [ ] Update `lib/fix-validators.ts` to use dynamic config
  - [ ] Create `/api/guardrails` endpoints
  - [ ] Update LLM prompts to include site-specific constraints

### Needs Work
- [ ] Component registry incomplete (hardcoded to ProductGrid)
- [ ] Agent prompts need to be generic (not site-specific)
- [ ] LLM sometimes generates invalid patches (oldCode doesn't match)
- [ ] No persistent backup storage (in-memory only)

---

## Testing the Engine

1. **Generate events**: Browse the store, click products, images, buttons
2. **Check detection**: `GET /api/ux-issues`
3. **View events**: `GET /api/events`
4. **Revert fixes**: `DELETE /api/events`

Console logs show the full pipeline:
```
📊 [Auto-Detect] Threshold reached...
🚨 [Auto-Detect] Found X new UI issues!
🤖 [Auto-Fix] Sending to LLM...
✅ [Auto-Fix] LLM generated: X patches
🔍 [Auto-Fix] Validating against guardrails...
🔧 [Auto-Fix] Applying patches...
✅ [Auto-Fix] Fix applied successfully!
```

---

## Adding New Pattern Rules

In `lib/issue-detector.ts`, add to `PATTERN_RULES`:

```typescript
{
  id: 'your_pattern_id',
  name: 'Human Readable Name',
  category: 'frustration' | 'missing_feature' | 'conversion_blocker',
  eventTypes: ['event_type_1', 'event_type_2'],
  groupBy: 'elementSelector' | 'sectionId' | 'componentPath',
  timeWindowHours: 24,
  minOccurrences: 5,
  minUniqueSessions: 3,
  severityThresholds: { low: 5, medium: 10, high: 20, critical: 40 },
  problemTemplate: 'What is happening',
  intentTemplate: 'What user expected',
  outcomeTemplate: 'What actually happened',
  fixTemplate: 'Suggested fix approach',
}
```

Then map it in `ux-detection.ts`:

```typescript
const PATTERN_TO_FIX_TYPE: Record<string, string> = {
  your_pattern_id: 'your_fix_type',
  // ...
};
```

And create an agent prompt at `.claude/agents/your-fix-generator.md`.

---

## Adding New Fix Types

1. Create agent prompt: `.claude/agents/your-fix-generator.md`
2. Add mapping in `ux-detection.ts`: `FIX_TYPE_TO_AGENT_PROMPT`
3. Add fallback in `lib/fallback-generators.ts`

---

## Setting Up for a New Site

### Option 1: Auto-Extract (Recommended)

```bash
# Run theme extraction on the codebase
curl -X POST http://localhost:3000/api/guardrails/extract \
  -H "Content-Type: application/json" \
  -d '{"paths": ["components/", "app/"], "merge": false}'
```

The extractor scans for:
- Inline styles (`backgroundColor: '#111'`)
- Tailwind classes (`bg-gray-900`, `rounded-none`)
- CSS variables (`--primary-color`)
- Font declarations
- Animation/transition patterns

### Option 2: Manual Config

Create `data/site-guardrails.json` with your site's theme:

```json
{
  "siteId": "my-ecommerce-site",
  "colors": {
    "backgrounds": ["#fff", "#f8f9fa", "#212529"],
    "text": ["#212529", "#6c757d", "#fff"],
    "borders": ["#dee2e6", "#212529"],
    "accents": ["#0d6efd"],
    "accentContexts": ["primary-cta", "links"]
  },
  "typography": {
    "allowedFontWeights": [400, 500, 700],
    "buttonFontSizeRange": [14, 16],
    "requireUppercaseButtons": false,
    "letterSpacing": "normal"
  },
  "spacing": {
    "borderRadiusAllowed": [0, 4, 8],
    "buttonPaddingH": [16, 24],
    "buttonPaddingV": [8, 12],
    "minTapTarget": 44
  }
}
```

### Option 3: Hybrid

Auto-extract, then override specific values:

```bash
curl -X POST http://localhost:3000/api/guardrails \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update",
    "overrides": {
      "typography": { "requireUppercaseButtons": true }
    }
  }'
```

---

## Theme Extractor Details

`lib/theme-extractor.ts` uses these strategies:

| Pattern Type | Detection Method |
|-------------|------------------|
| Colors | Regex for hex, rgb(), hsl(), Tailwind color classes |
| Font Weights | CSS `font-weight`, Tailwind `font-*` classes |
| Border Radius | CSS `border-radius`, Tailwind `rounded-*` classes |
| Spacing | CSS padding/margin values, Tailwind spacing classes |
| Animations | CSS `transition`, `animation`, Tailwind `duration-*` |

The extractor outputs confidence scores for each extracted value based on frequency of occurrence.

---

*Last Updated: 2026-01-18*
