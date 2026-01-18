# Button UI/UX Generation with Google Gemini

## Overview

This system uses Google Gemini to analyze button performance and generate UI/UX improvement suggestions. A two-stage feedback loop ensures suggestions remain consistent with the website theme.

## Architecture

```
┌─────────────────┐
│ Button Analytics│
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│   Generator     │────▶│   Guardrails     │
│   Agent         │◀────│   Rules (.md)    │
└────────┬────────┘     └──────────────────┘
         │
         ▼ (raw suggestions)
┌─────────────────┐     ┌──────────────────┐
│   Critique      │────▶│   Guardrails     │
│   Agent         │◀────│   Rules (.md)    │
└────────┬────────┘     └──────────────────┘
         │
         ▼ (approved only)
┌─────────────────┐
│  API Response   │
└─────────────────┘
```

## Components

### 1. Guardrails Rules (`.claude/rules/button-guardrails.md`)
Defines constraints for button suggestions:
- Allowed color palette (Tailwind classes)
- Typography constraints (font sizes, weights)
- Spacing limits (min/max padding)
- Text constraints (max length, tone)
- Forbidden patterns

### 2. Generator Agent (`.claude/agents/button-suggestion-generator.md`)
Generates button improvement suggestions based on analytics data while respecting guardrails.

### 3. Critique Agent (`.claude/agents/button-suggestion-critic.md`)
Validates suggestions against guardrails and existing site patterns. Only approved suggestions pass through.

## LLM Input/Output Specification

### Generator LLM Call

**INPUT:**
```json
{
  "systemPrompt": "You are a CRO expert. Generate button improvement suggestions that strictly follow the provided guardrails.",
  "guardrails": "<contents of button-guardrails.md>",
  "buttonData": {
    "ctaId": "add-to-cart-btn",
    "currentText": "Add to Cart",
    "currentStyles": "px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700",
    "analytics": {
      "clickRate": 2.5,
      "visibilityDuration": 4500,
      "conversionRate": 1.2,
      "rageClicks": 15,
      "deadClicks": 3
    }
  }
}
```

**OUTPUT:**
```json
{
  "suggestions": [
    {
      "ctaId": "add-to-cart-btn",
      "suggestedText": "Add to Cart - Free Shipping",
      "suggestedStyles": "px-8 py-4 bg-blue-600 rounded-lg hover:bg-blue-700 font-semibold",
      "reasoning": "Increased padding for better tap target. Added value proposition to text.",
      "priority": "high",
      "expectedImpact": "15-20% increase in click rate"
    }
  ]
}
```

### Critique LLM Call

**INPUT:**
```json
{
  "systemPrompt": "You are a design consistency reviewer. Validate suggestions against guardrails and existing site patterns.",
  "guardrails": "<contents of button-guardrails.md>",
  "existingButtonStyles": [
    "px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700",
    "px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
  ],
  "suggestionToReview": {
    "ctaId": "add-to-cart-btn",
    "suggestedText": "Add to Cart - Free Shipping",
    "suggestedStyles": "px-8 py-4 bg-blue-600 rounded-lg hover:bg-blue-700 font-semibold",
    "reasoning": "Increased padding for better tap target"
  }
}
```

**OUTPUT (approved):**
```json
{
  "approved": true,
  "violations": [],
  "feedback": "Suggestion follows color palette and padding constraints. Text length within limits.",
  "revisedSuggestion": null
}
```

**OUTPUT (rejected):**
```json
{
  "approved": false,
  "violations": [
    "Color 'bg-red-500' not in allowed palette",
    "Text exceeds 30 character limit"
  ],
  "feedback": "Use primary color (blue-600) instead. Shorten text to fit button.",
  "revisedSuggestion": {
    "suggestedText": "Add to Cart",
    "suggestedStyles": "px-8 py-4 bg-blue-600 rounded-lg hover:bg-blue-700 font-semibold"
  }
}
```

## File Structure

```
├── .env.example                              # Environment variable template
├── .claude/
│   ├── rules/
│   │   └── button-guardrails.md              # Theme constraints
│   └── agents/
│       ├── button-suggestion-generator.md    # Generator agent
│       └── button-suggestion-critic.md       # Critique agent
├── lib/
│   └── gemini.ts                             # Gemini client
├── types/
│   └── suggestions.ts                        # TypeScript interfaces
├── app/
│   └── api/
│       └── suggestions/
│           └── route.ts                      # API endpoint
└── docs/
    └── button-ui-generation-plan.md          # This file
```

## API Endpoint

### `GET /api/suggestions`

Returns validated UI suggestions for all tracked buttons.

**Response:**
```json
{
  "suggestions": [
    {
      "ctaId": "add-to-cart-btn",
      "suggestedText": "Add to Cart - Free Shipping",
      "suggestedStyles": "px-8 py-4 bg-blue-600 rounded-lg hover:bg-blue-700 font-semibold",
      "reasoning": "Increased padding for better tap target. Added value proposition.",
      "priority": "high",
      "expectedImpact": "15-20% increase in click rate",
      "critiqueApproved": true
    }
  ],
  "rejected": [
    {
      "ctaId": "checkout-btn",
      "violations": ["Color not in palette"],
      "feedback": "Original suggestion used red, revised to blue"
    }
  ]
}
```

## Setup

1. Add Gemini API key to `.env.local`:
   ```
   GOOGLE_GEMINI_API_KEY=your-key-here
   ```

2. Install dependencies:
   ```bash
   npm install @google/generative-ai
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

4. Test the endpoint:
   ```bash
   curl http://localhost:3000/api/suggestions
   ```

---

# UX Issue Detection (Non-Clickable Images)

## Overview

Extends the LLM system to detect UX issues from analytics patterns and auto-generate SiteConfig fixes.

## Current Issue Detected: Non-Clickable Product Images

**The Problem:**
Users click product images 3-5+ times expecting navigation, but nothing happens.

**Detection Pattern:**
1. Multiple rapid clicks (< 500ms apart) on `<img>` elements
2. No navigation occurs
3. Same user clicks title link within 2 seconds

**The Fix:**
Set `products.imageClickable: true` in SiteConfig, which wraps product cards in links.

## Architecture

```
┌─────────────────────┐
│  Analytics Events   │
│  (image_click,      │
│   dead_click, etc)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐     ┌────────────────────┐
│  Pattern Detection  │────▶│  UX Config         │
│  (lib/ux-detection) │◀────│  Guardrails (.md)  │
└──────────┬──────────┘     └────────────────────┘
           │
           ▼ (detected issues)
┌─────────────────────┐     ┌────────────────────┐
│  LLM Analyzer       │────▶│  UX Issue Detector │
│  (Gemini)           │◀────│  Agent (.md)       │
└──────────┬──────────┘     └────────────────────┘
           │
           ▼ (config changes)
┌─────────────────────┐
│  SiteConfig Update  │
│  (preview → live)   │
└─────────────────────┘
```

## API Endpoints

### `GET /api/ux-issues`

Analyze events and return detected UX issues with suggested config changes.

**Response:**
```json
{
  "issuesDetected": [
    {
      "type": "non_clickable_image",
      "severity": "critical",
      "elementSelector": "img[data-product-id='prod_001']",
      "productId": "prod_001",
      "analytics": {
        "totalClicks": 47,
        "rapidClicks": 32,
        "followedByTitleClick": 28,
        "uniqueSessions": 15
      }
    }
  ],
  "configChanges": [
    {
      "issueType": "non_clickable_image",
      "configPath": "products.imageClickable",
      "currentValue": false,
      "suggestedValue": true,
      "reasoning": "32 rapid clicks detected...",
      "priority": "high"
    }
  ],
  "summary": "Detected non-clickable image issue affecting 15 sessions."
}
```

### `POST /api/ux-issues`

Apply a suggested config change.

**Request:**
```json
{
  "configPath": "products.imageClickable",
  "suggestedValue": true,
  "applyToPreview": true
}
```

**Response:**
```json
{
  "success": true,
  "appliedTo": "preview",
  "message": "Config updated. Preview the changes before going live."
}
```

## File Structure (Additional)

```
├── .claude/
│   ├── rules/
│   │   ├── button-guardrails.md         # Button style constraints
│   │   └── ux-config-guardrails.md      # Config change constraints
│   └── agents/
│       ├── button-suggestion-generator.md
│       ├── button-suggestion-critic.md
│       └── ux-issue-detector.md         # Image click issue detector
├── lib/
│   ├── gemini.ts                        # Button suggestions
│   └── ux-detection.ts                  # Image click pattern detection
├── types/
│   └── suggestions.ts                   # Includes UX issue types
├── app/api/
│   ├── suggestions/route.ts             # Button suggestions
│   └── ux-issues/route.ts               # UX issue detection & fix
└── components/store/
    └── ProductGrid.tsx                  # Uses imageClickable config
```

## Testing

1. Generate test events with image clicks:
   - Visit store, click product images multiple times rapidly
   - Then click the product title

2. Call the detection endpoint:
   ```bash
   curl http://localhost:3000/api/ux-issues
   ```

3. Apply the fix:
   ```bash
   curl -X POST http://localhost:3000/api/ux-issues \
     -H "Content-Type: application/json" \
     -d '{"configPath": "products.imageClickable", "suggestedValue": true}'
   ```

4. Verify images are now clickable in the store
