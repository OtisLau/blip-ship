# Blip-Ship: Automated UX Fix Engine

## What It Does

Automatically detects UX problems from user behavior and generates code fixes.

```
User clicks/scrolls/forms → Pattern detection → LLM generates fix → Validation → Apply patch
```

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
│     c) Load theme guardrails (.claude/rules/theme-protection-guardrails.md)  │
│     d) Format issue context (lib/llm-formatter.ts)                           │
│     e) Call Gemini API with combined prompt                                  │
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
│  4. VALIDATE                                                                  │
│     lib/fix-validators.ts → validateFixPatches(patches)                      │
│                                                                               │
│     Checks:                                                                   │
│     • No forbidden colors (only #111, white, grays allowed)                  │
│     • No border-radius (sharp corners only)                                  │
│     • Font weight 500 or 600 only                                            │
│     • Font size 12-14px for buttons                                          │
│     • Buttons must be uppercase with letter-spacing                          │
│     • Transitions max 0.2-0.4s                                               │
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

## Theme Guardrails (Strict)

### Colors
```
Allowed BG:    #111, #fafafa, #f5f5f5, white, transparent
Allowed Text:  #111, #374151, #6b7280, white
Allowed Border: #e5e7eb, #111, transparent

FORBIDDEN: Any accent colors (blue, red, yellow, pink, purple, orange, teal)
           Exception: Hero CTA can use #3b82f6
```

### Typography
```
Font Weight: 500 or 600 ONLY (no bold, no light)
Font Size:   12-14px for buttons
Transform:   uppercase + letter-spacing: 0.5px REQUIRED for buttons
```

### Spacing
```
Border Radius: 0 ONLY (sharp corners everywhere)
Button Padding: 12-32px horizontal, 12-14px vertical
Tap Target: 44px minimum height
```

---

## File Structure (Engine Only)

```
lib/
├── issue-detector.ts      # Pattern rules, detectIssues()
├── ux-detection.ts        # LLM pipeline, patch application
├── llm-formatter.ts       # Format issues for LLM context
├── gemini.ts              # Gemini API calls
├── fix-validators.ts      # Theme guardrail validation
├── fallback-generators.ts # Hardcoded fallbacks
├── component-registry.ts  # Map selectors → components
├── db.ts                  # JSON file persistence
└── types.ts               # UIIssue, PatternRule types

.claude/
├── agents/                # LLM prompts per fix type
│   ├── button-loading-generator.md
│   ├── gallery-generator.md
│   ├── autocomplete-generator.md
│   ├── comparison-generator.md
│   ├── color-preview-generator.md
│   └── dead-click-action-mapper.md
└── rules/                 # Guardrails
    ├── theme-protection-guardrails.md
    ├── button-guardrails.md
    ├── ux-config-guardrails.md
    └── click-action-guardrails.md

app/api/
├── events/route.ts        # POST: receive events, trigger detection
└── ux-issues/route.ts     # GET: list detected issues

components/tracking/
└── EventTracker.tsx       # Client-side event capture

data/
├── events.json            # Stored events
└── ui-issues.json         # Detected issues
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
- [x] Theme validation (regex-based)
- [x] Patch application (string replacement)
- [x] Fallback generators (5 fix types)
- [x] File backups and revert

### Needs Work
- [ ] Component registry incomplete (hardcoded to ProductGrid)
- [ ] Some agent prompts need refinement
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
4. Update guardrails if needed

---

*Last Updated: 2026-01-18*
