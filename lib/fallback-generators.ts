/**
 * Fallback Generators
 *
 * Hardcoded fallback fixes when LLM generation fails validation.
 * These are guaranteed to pass theme guardrail checks.
 */

import { FixType } from './fix-validators';

export interface FallbackPatch {
  filePath: string;
  description: string;
  oldCodePattern: RegExp;
  newCodeTemplate: string;
}

export interface FallbackFix {
  type: FixType;
  patches: FallbackPatch[];
  explanation: string;
  imports?: string[];
}

// ============================================
// LOADING STATE FALLBACKS
// ============================================

export const loadingStateFallback: FallbackFix = {
  type: 'loading_state',
  explanation: 'Added loading state with spinner to button for immediate user feedback',
  imports: ["import { LoadingSpinner } from '@/components/ui/LoadingSpinner';"],
  patches: [
    {
      filePath: 'components/store/ProductGrid.tsx',
      description: 'Add loading state to Add to Cart button',
      oldCodePattern: /onClick=\{.*handleAddToCart.*\}/,
      newCodeTemplate: `onClick={async (e) => {
        e.stopPropagation();
        setAddingId(product.id);
        try {
          await handleAddToCart(product);
        } finally {
          setAddingId(null);
        }
      }}`,
    },
  ],
};

// ============================================
// IMAGE GALLERY FALLBACKS
// ============================================

export const galleryFallback: FallbackFix = {
  type: 'image_gallery',
  explanation: 'Made product images clickable to open fullscreen gallery',
  imports: ["import { ProductGallery } from '@/components/store/ProductGallery';"],
  patches: [
    {
      filePath: 'components/store/ProductGrid.tsx',
      description: 'Add gallery trigger to product image',
      oldCodePattern: /<Image[^>]*src=\{.*product\.image.*\}[^>]*\/>/,
      newCodeTemplate: `<Image
        src={product.image}
        alt={product.name}
        fill
        style={{ cursor: 'zoom-in' }}
        onClick={(e) => {
          e.stopPropagation();
          setGalleryProduct(product);
        }}
      />`,
    },
  ],
};

// ============================================
// ADDRESS AUTOCOMPLETE FALLBACKS
// ============================================

export const autocompleteFallback: FallbackFix = {
  type: 'address_autocomplete',
  explanation: 'Replaced address input with autocomplete component',
  imports: ["import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';"],
  patches: [
    {
      filePath: 'components/store/CartDrawer.tsx',
      description: 'Replace address input with autocomplete',
      oldCodePattern: /<input[^>]*name="address"[^>]*\/>/,
      newCodeTemplate: `<AddressAutocomplete
        value={address}
        onChange={setAddress}
        onSelect={handleAddressSelect}
        placeholder="Start typing your address..."
      />`,
    },
  ],
};

// ============================================
// COMPARISON FALLBACKS
// ============================================

export const comparisonFallback: FallbackFix = {
  type: 'product_comparison',
  explanation: 'Added compare checkbox to product cards with CompareContext integration',
  imports: ["import { useCompare } from '@/context/CompareContext';"],
  patches: [
    {
      filePath: 'components/store/ProductGrid.tsx',
      description: 'Add useCompare import',
      // Match existing cart context import
      oldCodePattern: /import \{ useCart \} from '@\/context\/CartContext';/,
      newCodeTemplate: `import { useCart } from '@/context/CartContext';
import { useCompare } from '@/context/CompareContext';`,
    },
    {
      filePath: 'components/store/ProductGrid.tsx',
      description: 'Add useCompare hook call',
      // Match the useCart hook call
      oldCodePattern: /const \{ addItem \} = useCart\(\);/,
      newCodeTemplate: `const { addItem } = useCart();
  const { isInCompare, toggleCompare } = useCompare();`,
    },
    {
      filePath: 'components/store/ProductGrid.tsx',
      description: 'Add compare checkbox to product card after price',
      // Match the closing </p> and </div> after the price
      oldCodePattern: /\$\{product\.price\.toFixed\(2\)\}\s*<\/p>\s*<\/div>/,
      newCodeTemplate: `\${product.price.toFixed(2)}
                </p>
                <label
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#6b7280',
                    cursor: 'pointer',
                    marginTop: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isInCompare(product.id)}
                    onChange={() => toggleCompare(product)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  Compare
                </label>
              </div>`,
    },
  ],
};

// ============================================
// COLOR PREVIEW FALLBACKS
// ============================================

export const colorPreviewFallback: FallbackFix = {
  type: 'color_preview',
  explanation: 'Added color swatches below product price',
  imports: ["import { ColorSwatches } from '@/components/ui/ColorSwatches';"],
  patches: [
    {
      filePath: 'components/store/ProductGrid.tsx',
      description: 'Add color swatches to product card',
      oldCodePattern: /\$\{product\.price\.toFixed\(2\)\}\s*<\/p>/,
      newCodeTemplate: `\${product.price.toFixed(2)}
                </p>
                {product.colors && product.colors.length > 0 && (
                  <ColorSwatches
                    colors={product.colors}
                    selectedColor={selectedColors[product.id]}
                    onSelect={(color) => handleColorSelect(product.id, color)}
                    maxVisible={5}
                    size="small"
                  />
                )}`,
    },
  ],
};

// ============================================
// FALLBACK REGISTRY
// ============================================

const fallbackRegistry: Record<FixType, FallbackFix | null> = {
  loading_state: loadingStateFallback,
  image_gallery: galleryFallback,
  address_autocomplete: autocompleteFallback,
  product_comparison: comparisonFallback,
  color_preview: colorPreviewFallback,
  unknown: null,
};

/**
 * Get fallback fix for a given fix type
 */
export function getFallbackFix(fixType: FixType): FallbackFix | null {
  return fallbackRegistry[fixType] || null;
}

/**
 * Check if a fallback exists for the given fix type
 */
export function hasFallback(fixType: FixType): boolean {
  return fallbackRegistry[fixType] !== null;
}

/**
 * Apply a fallback fix to code content
 */
export function applyFallbackPatch(
  content: string,
  patch: FallbackPatch
): { success: boolean; result: string; error?: string } {
  try {
    if (!patch.oldCodePattern.test(content)) {
      return {
        success: false,
        result: content,
        error: `Pattern not found: ${patch.oldCodePattern.source}`,
      };
    }

    const result = content.replace(patch.oldCodePattern, patch.newCodeTemplate);
    return { success: true, result };
  } catch (err) {
    return {
      success: false,
      result: content,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Generate the complete import statement for a fallback fix
 */
export function generateImports(fallback: FallbackFix): string {
  return fallback.imports?.join('\n') || '';
}
