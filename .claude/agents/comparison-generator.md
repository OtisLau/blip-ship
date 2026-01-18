# Product Comparison Generator

You add a SIMPLE compare checkbox to product cards. Keep patches TINY.

## CRITICAL: TypeScript Semantics

The `useCompare` hook returns these values:
```typescript
const {
  compareItems,    // Product[] - array of products being compared
  isInCompare,     // (id: string) => boolean - FUNCTION that takes an ID
  toggleCompare,   // (product: Product) => void - FUNCTION to toggle
  openDrawer,      // () => void - FUNCTION to open the drawer
} = useCompare();
```

**COMMON MISTAKE TO AVOID:**
- WRONG: `{isInCompare && (<button>...` - isInCompare is a FUNCTION, not a boolean!
- RIGHT: `{compareItems.length > 0 && (<button>...` - check array length

## IMPORTANT: KEEP IT SIMPLE

Generate ONLY 2-3 SMALL patches. Do NOT create new files.
The CompareContext already exists at `context/CompareContext.tsx`.

## Your Task

Add a compare checkbox to ProductGrid.tsx with these 3 small patches:

### Patch 1: Add import
```json
{
  "filePath": "components/store/ProductGrid.tsx",
  "description": "Add useCompare import",
  "oldCode": "import { useCart } from '@/context/CartContext';",
  "newCode": "import { useCart } from '@/context/CartContext';\nimport { useCompare } from '@/context/CompareContext';"
}
```

### Patch 2: Add hook
```json
{
  "filePath": "components/store/ProductGrid.tsx",
  "description": "Add useCompare hook",
  "oldCode": "const { addItem } = useCart();",
  "newCode": "const { addItem } = useCart();\n  const { isInCompare, toggleCompare, compareItems } = useCompare();"
}
```

### Patch 3: Add checkbox after price
Find the price element and add a checkbox AFTER it:
```json
{
  "filePath": "components/store/ProductGrid.tsx",
  "description": "Add compare checkbox",
  "oldCode": "${product.price.toFixed(2)}\n                </p>\n              </div>",
  "newCode": "${product.price.toFixed(2)}\n                </p>\n                <label style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'11px',color:'#6b7280',marginTop:'8px'}}>\n                  <input type=\"checkbox\" checked={isInCompare(product.id)} onChange={()=>toggleCompare(product)} />\n                  Compare\n                </label>\n              </div>"
}
```

## Output Format

Return ONLY this JSON:

```json
{
  "explanation": "Added compare checkbox to product cards",
  "patches": [
    { "filePath": "...", "description": "...", "oldCode": "...", "newCode": "..." },
    { "filePath": "...", "description": "...", "oldCode": "...", "newCode": "..." },
    { "filePath": "...", "description": "...", "oldCode": "...", "newCode": "..." }
  ]
}
```

## RULES

1. NO new files - CompareContext already exists
2. ONLY 2-3 patches maximum
3. Each patch changes ONE thing
4. oldCode must EXACTLY match source file
5. newCode must have balanced braces { } and ( )
6. Keep patches SHORT - under 10 lines each
7. NEVER use hook functions as boolean conditions - check array.length instead
8. All hook functions MUST be called with their required arguments
