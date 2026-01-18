import { ComponentMapping } from '@/types';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Static registry mapping CSS selectors to component source files.
 * Order matters - more specific selectors should come first.
 */
export const COMPONENT_REGISTRY: ComponentMapping[] = [
  // Product Grid - most specific first
  {
    selector: '[data-product-id] img',
    componentPath: 'components/store/ProductGrid.tsx',
    componentName: 'ProductGrid',
    dataAttributes: ['data-product-id'],
  },
  {
    selector: '[data-add-to-cart]',
    componentPath: 'components/store/ProductGrid.tsx',
    componentName: 'ProductGrid',
    dataAttributes: ['data-add-to-cart', 'data-cta', 'data-product-id'],
  },
  {
    selector: '[data-product-id]',
    componentPath: 'components/store/ProductGrid.tsx',
    componentName: 'ProductGrid',
    dataAttributes: ['data-product-id'],
  },
  {
    selector: '#products',
    componentPath: 'components/store/ProductGrid.tsx',
    componentName: 'ProductGrid',
    dataAttributes: ['data-product-id', 'data-add-to-cart'],
  },

  // Hero section
  {
    selector: '.hero-cta',
    componentPath: 'components/store/Hero.tsx',
    componentName: 'Hero',
    dataAttributes: ['data-cta'],
  },
  {
    selector: '#hero [data-cta]',
    componentPath: 'components/store/Hero.tsx',
    componentName: 'Hero',
    dataAttributes: ['data-cta'],
  },
  {
    selector: '#hero',
    componentPath: 'components/store/Hero.tsx',
    componentName: 'Hero',
    dataAttributes: ['data-cta'],
  },

  // Header / Navigation
  {
    selector: 'header nav',
    componentPath: 'components/store/Header.tsx',
    componentName: 'Header',
    dataAttributes: [],
  },
  {
    selector: 'header',
    componentPath: 'components/store/Header.tsx',
    componentName: 'Header',
    dataAttributes: [],
  },

  // Cart Drawer
  {
    selector: '[data-cart]',
    componentPath: 'components/store/CartDrawer.tsx',
    componentName: 'CartDrawer',
    dataAttributes: ['data-cart'],
  },

  // Testimonials
  {
    selector: '#testimonials',
    componentPath: 'components/store/Testimonials.tsx',
    componentName: 'Testimonials',
    dataAttributes: ['data-section'],
  },

  // Footer
  {
    selector: '#footer',
    componentPath: 'components/store/Footer.tsx',
    componentName: 'Footer',
    dataAttributes: ['data-section'],
  },
  {
    selector: 'footer',
    componentPath: 'components/store/Footer.tsx',
    componentName: 'Footer',
    dataAttributes: [],
  },
];

/**
 * Resolve a CSS selector to its component mapping.
 * Tries to match the most specific selector first.
 */
export function resolveComponent(
  selector: string,
  elementText?: string
): ComponentMapping | null {
  // Normalize selector
  const normalizedSelector = selector.toLowerCase().trim();

  // Try exact match first
  for (const mapping of COMPONENT_REGISTRY) {
    if (normalizedSelector.includes(mapping.selector.toLowerCase())) {
      return mapping;
    }
  }

  // Try to match by data attributes mentioned in selector
  for (const mapping of COMPONENT_REGISTRY) {
    for (const attr of mapping.dataAttributes) {
      if (normalizedSelector.includes(attr.toLowerCase())) {
        return mapping;
      }
    }
  }

  // Try to match by ID
  const idMatch = normalizedSelector.match(/#([a-z0-9_-]+)/i);
  if (idMatch) {
    const id = idMatch[1];
    for (const mapping of COMPONENT_REGISTRY) {
      if (mapping.selector.includes(`#${id}`)) {
        return mapping;
      }
    }
  }

  // Try to match by class
  const classMatch = normalizedSelector.match(/\.([a-z0-9_-]+)/i);
  if (classMatch) {
    const className = classMatch[1];
    for (const mapping of COMPONENT_REGISTRY) {
      if (mapping.selector.includes(`.${className}`)) {
        return mapping;
      }
    }
  }

  // Try to infer from element text
  if (elementText) {
    const text = elementText.toLowerCase();
    if (text.includes('add to cart') || text.includes('$')) {
      return COMPONENT_REGISTRY.find(m => m.componentName === 'ProductGrid') || null;
    }
    if (text.includes('shop') || text.includes('browse')) {
      return COMPONENT_REGISTRY.find(m => m.componentName === 'Hero') || null;
    }
    if (text.includes('cart') || text.includes('checkout')) {
      return COMPONENT_REGISTRY.find(m => m.componentName === 'CartDrawer') || null;
    }
  }

  return null;
}

/**
 * Read the source code of a component file.
 */
export async function readComponentCode(componentPath: string): Promise<string | null> {
  try {
    const fullPath = path.join(process.cwd(), componentPath);
    const content = await fs.readFile(fullPath, 'utf-8');
    return content;
  } catch {
    return null;
  }
}

/**
 * Get component code with context for LLM consumption.
 */
export async function getComponentContext(mapping: ComponentMapping): Promise<{
  path: string;
  name: string;
  code: string | null;
  lineCount: number;
}> {
  const code = await readComponentCode(mapping.componentPath);
  return {
    path: mapping.componentPath,
    name: mapping.componentName,
    code,
    lineCount: code ? code.split('\n').length : 0,
  };
}
