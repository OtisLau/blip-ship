# Click Action Mapping Guardrails

These rules govern how the LLM maps dead clicks to appropriate actions, ensuring it doesn't break existing functionality when adding click handlers to elements within compound components (like product cards).

---

## Core Principle: Intent-Preserving Action Mapping

When users click an element and nothing happens (dead click), we need to:
1. Identify what the user INTENDED to do
2. Map that intent to an EXISTING action in the component
3. Add the handler WITHOUT breaking other interactive elements

---

## Scope Limitation Rules

### Rule 1: Single Element Targeting

**ONLY** add click handlers to the SPECIFIC element that received dead clicks.

✅ Allowed:
```
Add onClick to: img[data-product-id="prod_001"]
Add onClick to: .product-image-container
```

❌ Forbidden:
```
Add onClick to: .product-card (would intercept child buttons)
Add onClick to: [data-product-id] (too broad)
```

### Rule 2: Action Exclusivity Matrix

Different elements within a product card have different allowed actions:

| Element Type | Allowed Actions | Forbidden Actions |
|-------------|-----------------|-------------------|
| Product Image | `open-modal`, `navigate-to-pdp` | `add-to-cart`, `remove-item` |
| Product Image Container | `open-modal`, `navigate-to-pdp` | `add-to-cart`, `remove-item` |
| Add to Cart Button | `add-to-cart` | `open-modal`, `navigate-away` |
| Product Info (name/price) | `open-modal`, `navigate-to-pdp` | `add-to-cart` |
| Badge/Label | NONE (keep non-interactive) | Any action |
| Quantity Controls | `increment`, `decrement` | `open-modal`, `add-to-cart` |

### Rule 3: Handler Mirroring Preference

When the dead click intent matches an existing nearby handler:

1. **PREFER** mirroring the existing handler over creating new logic
2. **USE** the same function/state setter as the equivalent element
3. **ENSURE** consistent behavior across semantically similar interactions

Example:
- Dead click on product image → User wants to see product details
- Product info already has: `onClick={() => setSelectedProduct(product)}`
- Solution: Add SAME handler to image container

### Rule 4: Event Propagation Management

When adding onClick to an element inside a container with multiple click targets:

**MUST include `e.stopPropagation()`** when:
- Parent has its own onClick handler
- Sibling elements have onClick that could be affected by bubbling

**Example structure requiring stopPropagation:**
```jsx
<div className="product-card">
  <div className="image-container" onClick={...}> {/* NEW - needs stopPropagation */}
    <img src="..." />
    <button onClick={handleAddToCart}> {/* Already has stopPropagation */}
      Add to Cart
    </button>
  </div>
  <div className="product-info" onClick={openModal}>
    ...
  </div>
</div>
```

---

## Product Card Specific Rules

### Understanding Product Card Hierarchy

```
ProductCard
├── ImageContainer (target for dead click fix)
│   ├── ProductImage <img> (receives dead clicks)
│   ├── Badge (non-interactive)
│   └── AddToCartButton (PRESERVE - has its own action)
└── ProductInfo (already opens modal)
    ├── ProductName
    └── ProductPrice
```

### Allowed Modifications

1. **Add onClick to ImageContainer or Image**
   - Action: Open product modal
   - Handler: Same as ProductInfo onClick
   - Must NOT interfere with AddToCartButton

2. **Add cursor: pointer to ImageContainer**
   - Visual affordance that element is clickable

### Forbidden Modifications

1. **Never remove or modify AddToCartButton's onClick**
2. **Never add onClick to ProductCard root** (would intercept AddToCart)
3. **Never change the modal-opening logic** (only mirror it)
4. **Never add navigation that leaves the page** (unless explicitly requested)

---

## Validation Checklist

Before approving a click action suggestion, verify:

### Target Selection
- [ ] Target element is the SPECIFIC element receiving dead clicks (not a parent)
- [ ] Target element is NOT an existing interactive element
- [ ] Target is appropriate for the suggested action type

### Action Appropriateness
- [ ] Action matches inferred user intent
- [ ] Action is in the "allowed" list for this element type
- [ ] Action mirrors existing equivalent handler (if one exists)

### Sibling Preservation
- [ ] All existing onClick handlers on siblings are preserved
- [ ] stopPropagation is included if needed
- [ ] AddToCart button behavior is unchanged

### Code Quality
- [ ] Handler follows existing code patterns
- [ ] Cursor style updated for clickable affordance
- [ ] No duplicate event listeners

---

## Example Scenarios

### Scenario 1: Dead Click on Product Image (COMMON)

**Context:**
- Users clicking product images
- Product info below opens modal
- AddToCart button overlays on image

**Correct Solution:**
```jsx
// Add to image container
<div
  onClick={(e) => {
    e.stopPropagation();
    setSelectedProduct(product);
  }}
  style={{ cursor: 'pointer' }}
>
  <img src={product.image} />
  <button onClick={(e) => { e.stopPropagation(); handleAddToCart(); }}>
    Add to Cart
  </button>
</div>
```

**Why stopPropagation:** AddToCart button already has it, but image container needs it too to prevent bubbling to any parent handlers.

### Scenario 2: Dead Click on Product Name (RARE)

**Context:**
- Product name not clickable
- Image opens modal

**Correct Solution:**
- Mirror the image's onClick handler
- Same principle: match existing behavior

---

## Anti-Patterns to Reject

### Anti-Pattern 1: Card-Level Click Handler
```jsx
// ❌ WRONG - intercepts AddToCart
<div className="product-card" onClick={openModal}>
```

### Anti-Pattern 2: Missing stopPropagation
```jsx
// ❌ WRONG - may cause double-firing
<div onClick={() => setSelectedProduct(product)}>
  <img />
</div>
```

### Anti-Pattern 3: Different Action Than Intent
```jsx
// ❌ WRONG - user clicked image to see details, not buy
<img onClick={handleAddToCart} />
```

### Anti-Pattern 4: Removing Existing Handlers
```jsx
// ❌ WRONG - don't touch working elements
// Suggestion: "Remove onClick from product-info and add to image instead"
```

---

## Technical Implementation Notes

### For React/Next.js Components

When generating code changes:

1. **Use same state setter:** If `setSelectedProduct` opens modal, use it for image too
2. **Preserve TypeScript types:** Ensure event handlers have correct types
3. **Match existing style patterns:** If inline styles, use inline styles; if Tailwind, use Tailwind

### For Config-Based Changes

If the system uses config to control clickability:

```typescript
// Preferred: Boolean flag in config
products: {
  imageClickable: true,  // Enable this
  imageClickAction: 'open-modal'  // Specify action
}
```

This allows runtime toggling without code changes.
