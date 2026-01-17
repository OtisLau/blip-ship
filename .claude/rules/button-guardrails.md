# Button UI/UX Guardrails

These rules define the constraints for LLM-generated button suggestions to ensure consistency with the website theme.

## Color Palette

### Primary Actions (CTA buttons)
Allowed background colors:
- `bg-blue-600` (default primary)
- `bg-blue-700` (hover state)
- `bg-blue-500` (lighter variant)

Allowed text colors:
- `text-white` (on primary backgrounds)

### Secondary Actions
Allowed background colors:
- `bg-gray-200`
- `bg-gray-300` (hover state)
- `bg-gray-100` (lighter variant)

Allowed text colors:
- `text-gray-800`
- `text-gray-700`

### Forbidden Colors
Never use:
- Red backgrounds (`bg-red-*`) - reserved for errors/destructive actions only
- Green backgrounds (`bg-green-*`) - avoid for general CTAs
- Neon/bright colors (`bg-yellow-400`, `bg-pink-500`, etc.)
- Pure black backgrounds (`bg-black`)

## Typography

### Font Weights
Allowed:
- `font-normal` (default)
- `font-medium`
- `font-semibold`

Forbidden:
- `font-bold` (too heavy)
- `font-black` (too heavy)
- `font-light` (too weak for CTAs)

### Font Sizes
Allowed:
- `text-sm` (small buttons)
- `text-base` (default)
- `text-lg` (large buttons)

Forbidden:
- `text-xs` (too small for accessibility)
- `text-xl` or larger (oversized)

### Text Transform
Forbidden:
- `uppercase` (ALL CAPS looks aggressive)
- `capitalize` on entire phrases

## Spacing

### Padding (horizontal)
Allowed range:
- Minimum: `px-4`
- Maximum: `px-10`
- Default: `px-6`

### Padding (vertical)
Allowed range:
- Minimum: `py-2`
- Maximum: `py-4`
- Default: `py-3`

### Forbidden Spacing
- Asymmetric padding that looks unbalanced
- `px-1`, `px-2` (too cramped)
- `py-1` (too cramped for tap targets)
- `px-12` or larger (too wide)
- `py-6` or larger (too tall)

## Border Radius

Allowed:
- `rounded` (slight rounding)
- `rounded-md`
- `rounded-lg` (default)
- `rounded-xl`

Forbidden:
- `rounded-none` (too sharp)
- `rounded-full` (pill shape - use sparingly)
- `rounded-3xl` or larger (excessive)

## Text Content

### Length Constraints
- Maximum: 30 characters
- Minimum: 2 characters
- Ideal: 10-20 characters

### Tone
- Professional and clear
- Action-oriented (verbs preferred: "Add", "Buy", "Get", "Start")
- No excessive punctuation (!!!)
- No all caps

### Forbidden Text Patterns
- Questions in button text
- More than one emoji
- Prices alone (e.g., "$9.99" without context)
- "Click here" or "Submit" (generic)

## Hover States

### Required Patterns
- Must include hover variant
- Hover should be darker shade of same color family

### Examples
```
bg-blue-600 hover:bg-blue-700  ✓
bg-gray-200 hover:bg-gray-300  ✓
bg-blue-600 hover:bg-red-600   ✗ (color family mismatch)
bg-blue-600 (no hover)         ✗ (missing hover state)
```

## Consistency Rules

### Match Existing Patterns
Suggestions should:
1. Use the same color family as existing buttons
2. Maintain similar padding ratios
3. Keep border-radius consistent across button types
4. Follow the same font-weight patterns

### Hierarchy Preservation
- Primary CTAs: Bold colors (blue-600)
- Secondary actions: Muted colors (gray-200)
- Do not elevate secondary buttons to primary styling
- Do not demote primary CTAs to secondary styling

## Accessibility Requirements

### Minimum Tap Target
- Combined padding must result in at least 44px height
- `py-2` with `text-base` is minimum acceptable

### Contrast
- Primary buttons: white text on blue (WCAG AA compliant)
- Secondary buttons: dark text on light gray (WCAG AA compliant)

## Validation Checklist

Before approving a suggestion, verify:
- [ ] Background color is in allowed palette
- [ ] Text color has sufficient contrast
- [ ] Font weight is allowed
- [ ] Font size is allowed
- [ ] Padding is within range
- [ ] Border radius is appropriate
- [ ] Text length under 30 characters
- [ ] Hover state included and consistent
- [ ] Matches existing button hierarchy
