/**
 * Element Indexer - Crawls pages and indexes all interactable elements
 * Maps each element to its component file for precise fix targeting
 */

import { chromium, Browser, Page } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const INDEX_FILE = path.join(DATA_DIR, 'element-index.json');

export interface IndexedElement {
  id: string;                    // Unique element ID
  selector: string;              // CSS selector
  fullPath: string;              // Full DOM path
  tag: string;                   // HTML tag
  type: 'button' | 'input' | 'link' | 'form' | 'interactive';
  text: string;                  // Visible text content
  attributes: Record<string, string>;  // Key attributes
  componentPath: string;         // Resolved component file path
  componentName: string;         // Component name
  pageUrl: string;               // Page where element was found
  boundingBox: { x: number; y: number; width: number; height: number };
  inputType?: string;            // For inputs: text, email, password, etc.
  placeholder?: string;          // For inputs
  ariaLabel?: string;            // Accessibility label
}

export interface ElementIndex {
  version: number;
  generatedAt: number;
  pages: string[];
  elements: IndexedElement[];
  componentMap: Record<string, string[]>;  // componentPath -> element IDs
}

// Component patterns - maps DOM patterns to component files
const COMPONENT_PATTERNS: Array<{
  pattern: RegExp | ((el: Partial<IndexedElement>) => boolean);
  componentPath: string;
  componentName: string;
}> = [
  // Cart/Checkout forms - shipping and payment inputs (detected by placeholders)
  {
    pattern: (el): boolean =>
      el.tag === 'input' &&
      !!(el.placeholder?.includes('John') ||
       el.placeholder?.includes('example.com') ||
       el.placeholder?.includes('Main Street') ||
       el.placeholder?.includes('New York') ||
       el.placeholder?.includes('10001') ||
       el.placeholder?.includes('4242') ||
       el.placeholder?.includes('MM/YY') ||
       el.placeholder?.includes('123')),
    componentPath: 'components/store/CartDrawer.tsx',
    componentName: 'CartDrawer',
  },
  // Cart buttons (by text content)
  {
    pattern: (el): boolean =>
      !!(el.text?.toLowerCase().includes('checkout') ||
      el.text?.toLowerCase().includes('continue to payment') ||
      el.text?.toLowerCase().includes('back to cart') ||
      el.text?.toLowerCase().includes('back to shipping') ||
      el.text?.toLowerCase().includes('pay $') ||
      el.text?.toLowerCase().includes('continue shopping')),
    componentPath: 'components/store/CartDrawer.tsx',
    componentName: 'CartDrawer',
  },
  // Cart drawer elements (by page URL context)
  {
    pattern: (el): boolean =>
      !!(el.pageUrl?.includes('#shipping') || el.pageUrl?.includes('#payment')) &&
      (el.tag === 'input' || el.tag === 'button' || el.tag === 'form'),
    componentPath: 'components/store/CartDrawer.tsx',
    componentName: 'CartDrawer',
  },
  // Cart item controls (detected by jsx classes used in styled-jsx cart drawer)
  {
    pattern: (el): boolean =>
      !!el.fullPath?.includes('jsx-') &&
      (el.text === '−' || el.text === '+' || el.text?.toLowerCase() === 'remove'),
    componentPath: 'components/store/CartDrawer.tsx',
    componentName: 'CartDrawer',
  },
  // Hero section
  {
    pattern: (el): boolean =>
      !!el.fullPath?.includes('section') &&
      !!(el.text?.toLowerCase().includes('shop') ||
       el.text?.toLowerCase().includes('explore') ||
       el.text?.toLowerCase().includes('collection')),
    componentPath: 'components/store/Hero.tsx',
    componentName: 'Hero',
  },
  // Product grid
  {
    pattern: (el): boolean =>
      !!(el.fullPath?.includes('#products') ||
      el.fullPath?.includes('data-product-id') ||
      el.text?.toLowerCase().includes('add to cart')),
    componentPath: 'components/store/ProductGrid.tsx',
    componentName: 'ProductGrid',
  },
  // Header
  {
    pattern: (el): boolean =>
      !!(el.fullPath?.includes('header') ||
      el.fullPath?.includes('nav')),
    componentPath: 'components/store/Header.tsx',
    componentName: 'Header',
  },
  // Footer
  {
    pattern: (el): boolean =>
      !!(el.fullPath?.includes('footer') ||
      el.text?.toLowerCase().includes('subscribe') ||
      el.text?.toLowerCase().includes('newsletter')),
    componentPath: 'components/store/Footer.tsx',
    componentName: 'Footer',
  },
  // Testimonials
  {
    pattern: (el): boolean =>
      !!(el.fullPath?.includes('testimonial') ||
      el.fullPath?.includes('#testimonials')),
    componentPath: 'components/store/Testimonials.tsx',
    componentName: 'Testimonials',
  },
];

/**
 * Resolve component path for an element based on patterns
 */
function resolveComponentPath(element: Partial<IndexedElement>): { path: string; name: string } {
  for (const pattern of COMPONENT_PATTERNS) {
    const matches = typeof pattern.pattern === 'function'
      ? pattern.pattern(element)
      : pattern.pattern.test(element.fullPath || '');

    if (matches) {
      return { path: pattern.componentPath, name: pattern.componentName };
    }
  }

  return { path: 'unknown', name: 'Unknown' };
}

/**
 * Generate a unique element ID
 */
function generateElementId(element: Partial<IndexedElement>, index: number): string {
  const prefix = element.tag || 'el';
  const typeHint = element.inputType || element.type || '';
  const textHint = (element.text || element.placeholder || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 10);

  return `${prefix}_${typeHint}_${textHint}_${index}`.replace(/_+/g, '_').replace(/_$/, '');
}

/**
 * Extract all interactable elements from a page
 */
async function extractElements(page: Page, pageUrl: string): Promise<IndexedElement[]> {
  const elements: IndexedElement[] = [];

  // Selectors for interactable elements
  const interactableSelectors = [
    'button',
    'a[href]',
    'input',
    'textarea',
    'select',
    '[role="button"]',
    '[onclick]',
    '[tabindex]:not([tabindex="-1"])',
    'label',
    '[data-cta]',
    '[data-add-to-cart]',
  ];

  const selector = interactableSelectors.join(', ');

  const rawElements = await page.evaluate((sel) => {
    const els = document.querySelectorAll(sel);
    const results: Array<{
      tag: string;
      selector: string;
      fullPath: string;
      text: string;
      attributes: Record<string, string>;
      boundingBox: { x: number; y: number; width: number; height: number };
      inputType?: string;
      placeholder?: string;
      ariaLabel?: string;
    }> = [];

    els.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const rect = htmlEl.getBoundingClientRect();

      // Skip invisible elements
      if (rect.width === 0 || rect.height === 0) return;

      // Build CSS selector
      let cssSelector = htmlEl.tagName.toLowerCase();
      if (htmlEl.id) {
        cssSelector = `#${htmlEl.id}`;
      } else if (htmlEl.className && typeof htmlEl.className === 'string') {
        const firstClass = htmlEl.className.trim().split(/\s+/)[0];
        if (firstClass) cssSelector += `.${firstClass}`;
      }

      // Build full path
      const path: string[] = [];
      let current: HTMLElement | null = htmlEl;
      while (current && current !== document.body) {
        let pathPart = current.tagName.toLowerCase();
        if (current.id) {
          pathPart = `#${current.id}`;
          path.unshift(pathPart);
          break;
        }
        if (current.className && typeof current.className === 'string') {
          const classes = current.className.trim().split(/\s+/).slice(0, 2);
          if (classes.length) pathPart += `.${classes.join('.')}`;
        }
        path.unshift(pathPart);
        current = current.parentElement;
      }

      // Extract attributes
      const attrs: Record<string, string> = {};
      for (const attr of htmlEl.attributes) {
        if (['id', 'class', 'name', 'type', 'placeholder', 'aria-label', 'data-product-id', 'href', 'role'].includes(attr.name)) {
          attrs[attr.name] = attr.value.slice(0, 100);
        }
      }

      results.push({
        tag: htmlEl.tagName.toLowerCase(),
        selector: cssSelector,
        fullPath: path.join(' > '),
        text: (htmlEl.textContent || '').trim().slice(0, 100),
        attributes: attrs,
        boundingBox: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
        inputType: (htmlEl as HTMLInputElement).type || undefined,
        placeholder: (htmlEl as HTMLInputElement).placeholder || undefined,
        ariaLabel: htmlEl.getAttribute('aria-label') || undefined,
      });
    });

    return results;
  }, selector);

  // Process and enrich elements
  rawElements.forEach((raw, index) => {
    const elementType = getElementType(raw.tag, raw.inputType);
    const { path: componentPath, name: componentName } = resolveComponentPath({
      ...raw,
      type: elementType,
    });

    const element: IndexedElement = {
      id: generateElementId({ ...raw, type: elementType }, index),
      selector: raw.selector,
      fullPath: raw.fullPath,
      tag: raw.tag,
      type: elementType,
      text: raw.text,
      attributes: raw.attributes,
      componentPath,
      componentName,
      pageUrl,
      boundingBox: raw.boundingBox,
      inputType: raw.inputType,
      placeholder: raw.placeholder,
      ariaLabel: raw.ariaLabel,
    };

    elements.push(element);
  });

  return elements;
}

/**
 * Determine element type
 */
function getElementType(tag: string, inputType?: string): IndexedElement['type'] {
  if (tag === 'a') return 'link';
  if (tag === 'button' || tag === 'input' && inputType === 'submit') return 'button';
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return 'input';
  if (tag === 'form') return 'form';
  return 'interactive';
}

/**
 * Crawl pages and build element index
 */
export async function buildElementIndex(
  baseUrl: string,
  pages: string[] = ['/store']
): Promise<ElementIndex> {
  console.log('🔍 [Indexer] Starting element indexing...');

  let browser: Browser | null = null;
  const allElements: IndexedElement[] = [];

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1200, height: 800 },
    });

    for (const pagePath of pages) {
      const page = await context.newPage();
      const url = `${baseUrl}${pagePath}`;

      console.log(`📄 [Indexer] Crawling: ${url}`);

      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000); // Wait for dynamic content

      // Navigate through cart/checkout flow to capture all form elements
      try {
        console.log('   🛒 Starting checkout flow navigation...');

        // First, add an item to cart to enable checkout
        const addToCartBtn = page.locator('button:has-text("Add to Cart")').first();
        if (await addToCartBtn.isVisible({ timeout: 3000 })) {
          console.log('   ✓ Found Add to Cart button, clicking via JS...');
          await addToCartBtn.evaluate((el: HTMLElement) => el.click());
          await page.waitForTimeout(1000);
        } else {
          console.log('   ⚠ Add to Cart button not visible');
        }

        // Open cart drawer - the cart button shows item count after adding
        await page.waitForTimeout(500);
        // Look for cart button more broadly - could be shopping bag icon or count badge
        const cartButton = page.locator('button').filter({ hasText: /^[0-9]+$/ }).first();
        const cartButtonAlt = page.locator('header button').last();

        let cartOpened = false;
        if (await cartButton.isVisible({ timeout: 2000 })) {
          console.log('   ✓ Found cart button with count, clicking via JS...');
          // Use JavaScript click to bypass SVG pointer event interception
          await cartButton.evaluate((el: HTMLElement) => el.click());
          cartOpened = true;
        } else if (await cartButtonAlt.isVisible({ timeout: 1000 })) {
          console.log('   ✓ Found cart button (alt), clicking via JS...');
          await cartButtonAlt.evaluate((el: HTMLElement) => el.click());
          cartOpened = true;
        }

        if (cartOpened) {
          await page.waitForTimeout(800);

          // Click checkout to reveal shipping form
          const checkoutBtn = page.locator('button:has-text("Checkout")').first();
          if (await checkoutBtn.isVisible({ timeout: 2000 })) {
            console.log('   ✓ Found Checkout button, clicking via JS...');
            await checkoutBtn.evaluate((el: HTMLElement) => el.click());

            // Wait for shipping form to appear - look for the Full Name input
            try {
              await page.waitForSelector('input[placeholder="John Doe"]', { timeout: 3000 });
              console.log('   ✓ Shipping form appeared');
              await page.waitForTimeout(300);

              // Capture shipping form elements
              const shippingElements = await extractElements(page, pagePath + '#shipping');
              allElements.push(...shippingElements);
              console.log(`   ✓ Found ${shippingElements.length} elements in shipping form`);

              // Fill required fields to enable Continue button
              await page.fill('input[placeholder="John Doe"]', 'Test User');
              await page.fill('input[placeholder="john@example.com"]', 'test@example.com');
              await page.fill('input[placeholder="123 Main Street"]', '123 Test St');
              await page.fill('input[placeholder="New York"]', 'Test City');
              await page.fill('input[placeholder="10001"]', '12345');
              console.log('   ✓ Filled shipping form fields');

              // Click continue to payment to reveal payment form
              const continueBtn = page.locator('button:has-text("Continue to Payment")').first();
              if (await continueBtn.isVisible({ timeout: 2000 })) {
                console.log('   ✓ Found Continue to Payment button, clicking via JS...');
                await continueBtn.evaluate((el: HTMLElement) => el.click());

                // Wait for payment form to appear - look for card number input
                try {
                  await page.waitForSelector('input[placeholder="4242 4242 4242 4242"]', { timeout: 3000 });
                  console.log('   ✓ Payment form appeared');
                  await page.waitForTimeout(300);

                  // Capture payment form elements
                  const paymentElements = await extractElements(page, pagePath + '#payment');
                  allElements.push(...paymentElements);
                  console.log(`   ✓ Found ${paymentElements.length} elements in payment form`);
                } catch {
                  console.log('   ⚠ Payment form did not appear');
                }
              } else {
                console.log('   ⚠ Continue to Payment button not visible');
              }
            } catch {
              console.log('   ⚠ Shipping form did not appear after clicking Checkout');
            }
          } else {
            console.log('   ⚠ Checkout button not visible (cart may be empty)');
          }
        } else {
          console.log('   ⚠ Could not find cart button');
        }
      } catch (err) {
        console.log('   ❌ Error navigating checkout flow:', err);
      }

      const elements = await extractElements(page, pagePath);
      allElements.push(...elements);

      console.log(`   Found ${elements.length} interactable elements`);

      await page.close();
    }

    await context.close();
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Deduplicate elements by selector + placeholder
  const seen = new Set<string>();
  const dedupedElements = allElements.filter(el => {
    const key = `${el.selector}|${el.placeholder || ''}|${el.text.slice(0, 30)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`   Deduped: ${allElements.length} -> ${dedupedElements.length} elements`);

  // Reassign to allElements for downstream processing
  allElements.length = 0;
  allElements.push(...dedupedElements);

  // Build component map
  const componentMap: Record<string, string[]> = {};
  for (const el of allElements) {
    if (!componentMap[el.componentPath]) {
      componentMap[el.componentPath] = [];
    }
    componentMap[el.componentPath].push(el.id);
  }

  const index: ElementIndex = {
    version: 1,
    generatedAt: Date.now(),
    pages,
    elements: allElements,
    componentMap,
  };

  console.log(`✅ [Indexer] Indexed ${allElements.length} elements across ${pages.length} page(s)`);
  console.log(`   Components found: ${Object.keys(componentMap).join(', ')}`);

  return index;
}

/**
 * Save element index to file
 */
export async function saveElementIndex(index: ElementIndex): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(INDEX_FILE, JSON.stringify(index, null, 2));
  console.log(`💾 [Indexer] Saved index to ${INDEX_FILE}`);
}

/**
 * Load element index from file
 */
export async function loadElementIndex(): Promise<ElementIndex | null> {
  try {
    const data = await fs.readFile(INDEX_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Find element by selector or text
 */
export function findElement(
  index: ElementIndex,
  query: { selector?: string; text?: string; placeholder?: string }
): IndexedElement | null {
  for (const el of index.elements) {
    if (query.selector && (el.selector.includes(query.selector) || el.fullPath.includes(query.selector))) {
      return el;
    }
    if (query.text && el.text.toLowerCase().includes(query.text.toLowerCase())) {
      return el;
    }
    if (query.placeholder && el.placeholder?.toLowerCase().includes(query.placeholder.toLowerCase())) {
      return el;
    }
  }
  return null;
}

/**
 * Get all elements for a component
 */
export function getElementsByComponent(
  index: ElementIndex,
  componentPath: string
): IndexedElement[] {
  return index.elements.filter(el => el.componentPath === componentPath);
}

/**
 * Resolve component path from event data
 */
export function resolveComponentFromEvent(
  index: ElementIndex,
  eventData: { elementSelector?: string; elementText?: string; placeholder?: string }
): { componentPath: string; componentName: string; elementId?: string } {
  const element = findElement(index, {
    selector: eventData.elementSelector,
    text: eventData.elementText,
    placeholder: eventData.placeholder,
  });

  if (element) {
    return {
      componentPath: element.componentPath,
      componentName: element.componentName,
      elementId: element.id,
    };
  }

  return { componentPath: 'unknown', componentName: 'Unknown' };
}
