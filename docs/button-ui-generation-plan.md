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
