# Button UI/UX Guardrails

These rules define the constraints for LLM-generated button suggestions to ensure consistency with the website theme. The guardrails are derived from analyzing all store components.

---

## Page Component Context

Before generating suggestions, understand the components on the page:

### Component Inventory

| Component | Location | Primary CTAs | Style Pattern |
|-----------|----------|--------------|---------------|
| Hero | Top of page | "Shop Collection" | Configurable color, large size |
| ProductGrid | Product section | "Add to Cart", "View All" | Black bg, white text, overlay buttons |
| ProductModal | Modal overlay | "Add to Cart" | Full-width, black bg |
| CartDrawer | Right drawer | "Checkout", "Continue Shopping" | Full-width, black bg |
| Testimonials | Social proof | None | No CTAs |
| Footer | Bottom | "Subscribe" | White bg, black text |
| Header | Fixed top | Cart icon | Icon buttons only |

### Component-Specific Rules

**Hero CTA:**
- Position: inside-hero or below-hero
- Size: configurable (small/medium/large)
- Color: from SiteConfig (typically `#3b82f6` blue)
- Hover: opacity 0.9

**ProductGrid CTAs:**
- "Add to Cart": Overlay button, appears on hover
- Background: `#111`, success state `#22c55e`
- Transform animation: translateY on hover
- "View All": Outline style, inverts on hover

**Modal/Drawer CTAs:**
- Full width buttons
- Background: `#111`
- Disabled state: `#9ca3af`

---

## Color Palette (Actual Site Colors)

### Primary Actions (CTA buttons)
Allowed background colors:
- `#111` / `bg-gray-900` (default primary - used in ProductGrid, Modal, Drawer)
- `#3b82f6` / `bg-blue-600` (Hero CTA only, configurable)
- `white` (inverted/outline buttons)

Allowed text colors:
- `white` (on dark backgrounds)
- `#111` (on light/outline buttons)

### Secondary Actions
Allowed:
- `transparent` with `border: 1px solid #111` (outline style)
- Hover: background `#111`, text `white` (color inversion)

### State Colors
- Success/Added: `#22c55e` (green - "Added to Cart" only)
- Disabled: `#9ca3af` (gray)
- Sale/Warning: `#dc2626` (red - navigation text only, NOT buttons)

### Forbidden Colors
Never use for general CTAs:
- Bright colors (`bg-yellow-*`, `bg-pink-*`, `bg-purple-*`)
- Blue on non-Hero components (breaks consistency)
- Green except for success states

---

## Typography

### Font Weights
Allowed:
- `font-medium` / `fontWeight: 500` (standard)
- `font-semibold` / `fontWeight: 600` (emphasis)

Forbidden:
- `font-bold` / `fontWeight: 700` (too heavy)
- `font-light` / `fontWeight: 300` (too weak)

### Font Sizes
Allowed:
- `12px` / `text-xs` (small buttons, badges)
- `13px` (standard button text)
- `14px` / `text-sm` (larger buttons)

Forbidden:
- `11px` or smaller (accessibility)
- `16px` or larger (oversized for buttons)

### Text Transform
**REQUIRED for this site:**
- `uppercase` (ALL buttons use uppercase)
- `letterSpacing: 0.5px` (standard)

---

## Spacing

### Padding Patterns (from components)

| Context | Horizontal | Vertical |
|---------|-----------|----------|
| Overlay buttons | `12px` | `12px` |
| Standard buttons | `14px-28px` | `12px-14px` |
| Full-width buttons | full | `14px` |

### Allowed Ranges
- Horizontal: `12px` to `32px`
- Vertical: `12px` to `14px`

### Forbidden
- `py-1`, `py-2` (too small for tap targets)
- `px-4` or less (too cramped)
- `px-12` or more (too wide for inline buttons)

---

## Border Radius

**IMPORTANT: This site uses sharp corners (no border-radius)**

Allowed:
- `rounded-none` / `border-radius: 0` (default for this site)

Forbidden:
- `rounded-md`, `rounded-lg`, `rounded-xl` (breaks site aesthetic)
- `rounded-full` (pill buttons not used)

---

## Text Content

### Length Constraints
- Maximum: 25 characters (shorter is better)
- Minimum: 2 characters
- Ideal: 8-15 characters

### Existing Button Text Patterns
| Component | Text | Pattern |
|-----------|------|---------|
| ProductGrid | "Add to Cart" | Action + Object |
| ProductGrid | "View All Products" | Action + Scope |
| CartDrawer | "Checkout" | Single action word |
| CartDrawer | "Continue Shopping" | Action + Context |
| Footer | "Subscribe" | Single action word |

### Tone
- Action-oriented verbs: "Add", "View", "Shop", "Get", "Continue"
- Professional and clear
- No punctuation (no !, ?)

### Forbidden Text Patterns
- Questions ("Want to buy?")
- Generic ("Click here", "Submit")
- Prices alone ("$9.99")
- Emojis
- ALL CAPS beyond the uppercase transform

---

## Hover States

### Required Patterns
All buttons MUST have hover states.

### Hover Patterns by Type

**Solid dark buttons (`#111`):**
```css
opacity: 0.9  /* or */
background: #333
```

**Outline buttons:**
```css
background: #111
color: white
```

**Hero CTA:**
```css
opacity: 0.9
```

### Forbidden
- Color family changes (blue → red)
- No hover state
- Dramatic scale changes

---

## Animation & Transitions

### Standard Transitions
- `transition: all 0.2s` (buttons)
- `transition: opacity 0.2s` (subtle)

### Overlay Button Pattern (ProductGrid)
```css
opacity: 0 → 1 on parent hover
transform: translateY(8px) → translateY(0)
```

---

## Hierarchy Preservation

### Button Hierarchy (highest to lowest)
1. **Primary CTA**: Hero "Shop Collection" - largest, most prominent
2. **Action buttons**: "Add to Cart", "Checkout" - dark solid
3. **Secondary actions**: "View All", "Continue Shopping" - outline or smaller
4. **Tertiary**: Remove, quantity controls - text links

### Rules
- Never elevate tertiary to primary styling
- Never demote primary to tertiary styling
- Maintain visual weight order on page

---

## Accessibility Requirements

### Minimum Tap Target
- Height: 44px minimum
- `py-3` with `text-sm` meets this

### Contrast (WCAG AA)
- White text on `#111`: ✓ 17.1:1 ratio
- `#111` text on white: ✓ 17.1:1 ratio
- White text on `#3b82f6`: ✓ 4.5:1 ratio

### Focus States
- Must be visible
- Use outline or ring pattern

---

## Validation Checklist

Before approving a button suggestion, verify:

### Colors
- [ ] Background matches component context (Hero=configurable, others=`#111`)
- [ ] Text color has sufficient contrast
- [ ] Not using forbidden accent colors

### Typography
- [ ] Font weight is 500 or 600
- [ ] Font size is 12-14px
- [ ] Uses uppercase + letter-spacing

### Spacing
- [ ] Padding within allowed ranges
- [ ] No border-radius (sharp corners)

### Content
- [ ] Text length under 25 characters
- [ ] Action-oriented verb
- [ ] No forbidden patterns

### States
- [ ] Hover state included
- [ ] Hover follows correct pattern for button type
- [ ] Disabled state if applicable

### Context
- [ ] Matches hierarchy position
- [ ] Consistent with same component's other buttons
- [ ] Doesn't conflict with nearby CTAs
