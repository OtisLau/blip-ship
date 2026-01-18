# Theme Protection Guardrails

**CRITICAL**: These guardrails MUST be enforced for ALL LLM-generated fixes. Any fix that violates these rules MUST be rejected by `fix-validators.ts`.

---

## Purpose

This document defines the immutable visual constraints of the site. When generating UX fixes (loading states, galleries, autocomplete, comparison features, color swatches), the LLM must preserve the existing theme.

---

## Color Palette (STRICT)

### Allowed Background Colors

| Color | Hex | Use Case |
|-------|-----|----------|
| Black | `#111` | Primary buttons, overlays |
| White | `#fff` / `#ffffff` / `white` | Cards, modals |
| Off-white | `#fafafa` | Section backgrounds |
| Light gray | `#f5f5f5` | Image placeholders |
| Hero CTA only | `#3b82f6` | ONLY in Hero component |
| Success state | `#22c55e` | ONLY for "Added to Cart" state |

### Allowed Text Colors

| Color | Hex | Use Case |
|-------|-----|----------|
| Black | `#111` | Primary text, headings |
| Gray | `#374151` | Body text |
| Gray | `#6b7280` | Secondary/muted text |
| White | `#fff` | Text on dark backgrounds |

### Allowed Border Colors

| Color | Hex | Use Case |
|-------|-----|----------|
| Light gray | `#e5e7eb` | Cards, inputs, dividers |
| Black | `#111` | Hover states, focus |

### FORBIDDEN Colors

**NEVER use these for ANY generated UI element:**

- Accent blues (except Hero): `#3b82f6`, `#2563eb`, `#1d4ed8`
- Accent reds: `#dc2626`, `#ef4444`, `#f87171`
- Accent yellows: `#fbbf24`, `#f59e0b`, any `yellow-*`
- Accent pinks: `#ec4899`, `#f472b6`, any `pink-*`
- Accent purples: `#8b5cf6`, `#a855f7`, any `purple-*`
- Accent oranges: `#f97316`, `#fb923c`, any `orange-*`
- Accent teals: `#14b8a6`, `#2dd4bf`, any `teal-*`
- Any color from Tailwind accent palettes

---

## Typography (STRICT)

### Font Weights

| Allowed | Tailwind | CSS |
|---------|----------|-----|
| Medium | `font-medium` | `500` |
| Semibold | `font-semibold` | `600` |

**FORBIDDEN:**
- `font-bold` / `700`
- `font-light` / `300`
- `font-normal` / `400` (for buttons)
- `font-black` / `900`

### Font Sizes for Interactive Elements

| Min | Max | Tailwind |
|-----|-----|----------|
| `12px` | `14px` | `text-xs`, `text-sm` |

**FORBIDDEN:**
- Below `11px` (accessibility)
- Above `16px` for buttons/controls

### Text Transform (REQUIRED for Buttons)

All buttons MUST have:
```css
text-transform: uppercase;
letter-spacing: 0.5px;
```

---

## Border Radius (STRICT)

**This site uses SHARP CORNERS only.**

| Allowed | Value |
|---------|-------|
| None | `rounded-none` / `border-radius: 0` |

**FORBIDDEN (applies to ALL generated elements):**
- `rounded-sm` / `border-radius: 2px`
- `rounded-md` / `border-radius: 6px`
- `rounded-lg` / `border-radius: 8px`
- `rounded-xl` / `border-radius: 12px`
- `rounded-full` / `border-radius: 9999px`
- ANY positive border-radius value

---

## Spacing Constraints

### Button Padding

| Direction | Min | Max |
|-----------|-----|-----|
| Horizontal | `12px` | `32px` |
| Vertical | `12px` | `14px` |

### Tap Target (Accessibility)

- Minimum height: `44px`
- `py-3` + `text-sm` meets this

---

## Animation Constraints

### Allowed Transitions

| Property | Duration |
|----------|----------|
| `all` | `0.2s` |
| `opacity` | `0.2s` |
| `transform` | `0.2s` - `0.4s` |
| `background-color` | `0.2s` |

### Loading Spinner Specifications

When generating loading states:
- Size: `16px` x `16px`
- Color: Match button text color (white on dark, dark on light)
- Animation: `spin 1s linear infinite`
- Position: Replace button text OR inline before/after text

### FORBIDDEN Animations

- Long durations (> 0.5s except loading spinner)
- Bounce effects
- Scale > 1.1
- Color family transitions (e.g., blue to red)

---

## Component-Specific Rules

### Loading States (for Buttons)

```jsx
// CORRECT
<button style={{
  backgroundColor: '#111',
  color: 'white',
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  padding: '12px 24px',
  border: 'none',
  cursor: isLoading ? 'wait' : 'pointer',
}}>
  {isLoading ? <Spinner size={16} /> : 'Add to Cart'}
</button>

// WRONG - Don't change colors during loading
<button style={{ backgroundColor: isLoading ? '#3b82f6' : '#111' }}>
```

### Gallery/Lightbox

- Overlay: `rgba(0, 0, 0, 0.9)` or `#111` with opacity
- Close button: White text, no border radius
- Navigation arrows: Simple, no rounded corners
- Counter text: `#6b7280` or white

### Autocomplete Dropdowns

- Background: `white`
- Border: `1px solid #e5e7eb`
- Hover: `background-color: #f5f5f5`
- Selected: `background-color: #111`, `color: white`
- No border-radius on dropdown or items

### Comparison Features

- Compare checkbox: Standard checkbox (no custom styling)
- Compare drawer: Same styling as CartDrawer
- Background: `white`
- Borders: `#e5e7eb`
- CTAs: `#111` background

### Color Swatches

- Circle size: `20px` - `24px` minimum
- Border: `1px solid #e5e7eb` (or `#111` when selected)
- No border-radius restriction (circles are allowed for swatches specifically)
- Selected indicator: `2px solid #111` or checkmark

---

## Validation Regex Patterns

Use these patterns in `fix-validators.ts`:

```typescript
// Forbidden color patterns
const FORBIDDEN_COLORS = /(?:bg-|background[-:]?\s*#?)(yellow|pink|purple|orange|teal|red|green|blue)(?!-600.*Hero)/gi;

// Allowed background colors
const ALLOWED_BG = /^(#111|#fafafa|#f5f5f5|#fff|#ffffff|white|transparent)$/i;

// Border radius check (must be 0)
const HAS_BORDER_RADIUS = /border-radius:\s*[1-9]|rounded-(?!none)/gi;

// Font weight check
const ALLOWED_WEIGHTS = /font-(?:medium|semibold)|font-weight:\s*(?:500|600)/gi;
```

---

## Pre-Submission Checklist

Before applying ANY generated fix:

- [ ] No forbidden colors in backgrounds or text
- [ ] No border-radius anywhere (except color swatch circles)
- [ ] Font weight is 500 or 600 only
- [ ] Font size between 12-14px for buttons
- [ ] All buttons have uppercase + letter-spacing
- [ ] Transitions use allowed durations
- [ ] No forbidden animation types
- [ ] Loading spinner matches specifications
- [ ] Hover states use allowed patterns

---

## Failure Handling

If a generated fix fails validation:

1. Log the specific violation(s)
2. Attempt one retry with explicit constraint reminder
3. If retry fails, use hardcoded fallback from `fallback-generators.ts`
4. Never apply an invalid fix to the codebase
