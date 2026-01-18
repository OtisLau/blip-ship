/**
 * Deep Element Indexer - Comprehensive page analysis for maximum element detection accuracy
 *
 * Unlike the basic indexer, this captures:
 * - ALL visible elements (not just interactable)
 * - Full DOM hierarchy with parent-child relationships
 * - Computed styles and accessibility attributes
 * - Semantic landmarks and ARIA roles
 * - Visual properties (visibility, position, z-index)
 * - Text content and images
 */

import { chromium, Browser, Page } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DEEP_INDEX_FILE = path.join(DATA_DIR, 'deep-element-index.json');

export interface DeepIndexedElement {
  id: string;                           // Unique element ID
  selector: string;                     // CSS selector
  fullPath: string;                     // Full DOM path from root
  xpath: string;                        // XPath for precise targeting
  tag: string;                          // HTML tag
  type: ElementType;                    // Semantic type
  role: string | null;                  // ARIA role
  ariaLabel: string | null;             // Accessibility label
  text: string;                         // Direct text content
  fullText: string;                     // All nested text content
  attributes: Record<string, string>;   // All attributes
  dataAttributes: Record<string, string>; // data-* attributes
  classes: string[];                    // CSS classes
  styles: ComputedStyles;               // Key computed styles
  boundingBox: BoundingBox;             // Position and dimensions
  visibility: VisibilityInfo;           // Visibility state
  interactivity: InteractivityInfo;     // Click/focus behavior
  parentId: string | null;              // Parent element ID
  childIds: string[];                   // Child element IDs
  siblingIndex: number;                 // Index among siblings
  depth: number;                        // DOM depth
  componentPath: string;                // Resolved component file
  componentName: string;                // Component name
  pageUrl: string;                      // Page where found
  landmarks: string[];                  // Semantic landmarks containing this element
  isLandmark: boolean;                  // Is this a landmark?
  isFocusable: boolean;                 // Can receive focus?
  isClickable: boolean;                 // Likely clickable?
  semanticType: SemanticType | null;    // Inferred semantic type
}

export type ElementType =
  | 'button' | 'link' | 'input' | 'form' | 'image' | 'text'
  | 'heading' | 'list' | 'listItem' | 'table' | 'section'
  | 'navigation' | 'main' | 'aside' | 'footer' | 'header'
  | 'container' | 'interactive' | 'media' | 'other';

export type SemanticType =
  | 'cta' | 'navigation' | 'product' | 'price' | 'cart'
  | 'search' | 'testimonial' | 'hero' | 'footer' | 'header'
  | 'form-field' | 'error-message' | 'notification' | 'modal'
  | 'menu' | 'breadcrumb' | 'pagination' | 'tab' | 'accordion';

export interface ComputedStyles {
  display: string;
  visibility: string;
  opacity: string;
  position: string;
  zIndex: string;
  overflow: string;
  cursor: string;
  pointerEvents: string;
  backgroundColor: string;
  color: string;
  fontSize: string;
  fontWeight: string;
  textAlign: string;
  borderRadius: string;
  boxShadow: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
  centerX: number;
  centerY: number;
}

export interface VisibilityInfo {
  isVisible: boolean;
  isInViewport: boolean;
  isFullyInViewport: boolean;
  percentVisible: number;
  isHidden: boolean;        // display:none or visibility:hidden
  isObscured: boolean;      // Covered by another element
  occludingElement: string | null;
}

export interface InteractivityInfo {
  isInteractive: boolean;
  isFocusable: boolean;
  isDisabled: boolean;
  hasClickHandler: boolean;
  hasHoverEffect: boolean;  // cursor changes on hover
  tabIndex: number | null;
}

export interface DeepElementIndex {
  version: number;
  generatedAt: number;
  duration: number;           // Time to generate in ms
  pages: string[];
  totalElements: number;
  stats: {
    byType: Record<string, number>;
    byComponent: Record<string, number>;
    bySemanticType: Record<string, number>;
    interactiveCount: number;
    visibleCount: number;
    maxDepth: number;
  };
  elements: DeepIndexedElement[];
  tree: ElementTree;          // Hierarchical representation
  landmarks: LandmarkInfo[];  // Page landmarks
}

export interface ElementTree {
  rootId: string;
  nodes: Record<string, {
    id: string;
    tag: string;
    childIds: string[];
    isInteractive: boolean;
  }>;
}

export interface LandmarkInfo {
  role: string;
  label: string | null;
  elementId: string;
  selector: string;
}

// Component patterns - maps DOM patterns to component files
const COMPONENT_PATTERNS: Array<{
  pattern: (el: Partial<DeepIndexedElement>) => boolean;
  componentPath: string;
  componentName: string;
  priority: number;
}> = [
  // High priority: specific identifiable patterns
  {
    pattern: (el) =>
      !!el.fullPath?.includes('#hero') ||
      el.tag === 'section' && !!el.attributes?.id?.includes('hero'),
    componentPath: 'components/store/Hero.tsx',
    componentName: 'Hero',
    priority: 100,
  },
  {
    pattern: (el) =>
      !!el.fullPath?.includes('#products') ||
      el.tag === 'section' && !!el.attributes?.id?.includes('products'),
    componentPath: 'components/store/ProductGrid.tsx',
    componentName: 'ProductGrid',
    priority: 100,
  },
  {
    pattern: (el) =>
      !!el.fullPath?.includes('#testimonials') ||
      el.tag === 'section' && !!el.attributes?.id?.includes('testimonials'),
    componentPath: 'components/store/Testimonials.tsx',
    componentName: 'Testimonials',
    priority: 100,
  },
  // Cart/Checkout forms
  {
    pattern: (el) =>
      el.tag === 'input' &&
      !!(el.attributes?.placeholder?.includes('John') ||
         el.attributes?.placeholder?.includes('example.com') ||
         el.attributes?.placeholder?.includes('Main Street') ||
         el.attributes?.placeholder?.includes('4242')),
    componentPath: 'components/store/CartDrawer.tsx',
    componentName: 'CartDrawer',
    priority: 90,
  },
  // Cart buttons
  {
    pattern: (el) =>
      !!(el.text?.toLowerCase().includes('checkout') ||
         el.text?.toLowerCase().includes('continue to payment') ||
         el.text?.toLowerCase().includes('pay $') ||
         el.text?.toLowerCase().includes('add to cart')),
    componentPath: 'components/store/CartDrawer.tsx',
    componentName: 'CartDrawer',
    priority: 85,
  },
  // Product-related
  {
    pattern: (el) =>
      !!el.dataAttributes?.['product-id'] ||
      !!el.fullPath?.includes('[data-product-id]'),
    componentPath: 'components/store/ProductGrid.tsx',
    componentName: 'ProductGrid',
    priority: 80,
  },
  // Header/Navigation
  {
    pattern: (el) =>
      el.tag === 'header' ||
      !!el.fullPath?.includes('header') ||
      el.role === 'banner',
    componentPath: 'components/store/Header.tsx',
    componentName: 'Header',
    priority: 70,
  },
  // Footer
  {
    pattern: (el) =>
      el.tag === 'footer' ||
      !!el.fullPath?.includes('footer') ||
      el.role === 'contentinfo',
    componentPath: 'components/store/Footer.tsx',
    componentName: 'Footer',
    priority: 70,
  },
  // Navigation
  {
    pattern: (el) =>
      el.tag === 'nav' ||
      el.role === 'navigation',
    componentPath: 'components/store/Header.tsx',
    componentName: 'Header',
    priority: 60,
  },
];

function resolveComponentPath(element: Partial<DeepIndexedElement>): { path: string; name: string } {
  // Sort patterns by priority (highest first)
  const sorted = [...COMPONENT_PATTERNS].sort((a, b) => b.priority - a.priority);

  for (const pattern of sorted) {
    if (pattern.pattern(element)) {
      return { path: pattern.componentPath, name: pattern.componentName };
    }
  }

  return { path: 'unknown', name: 'Unknown' };
}

function generateElementId(element: Partial<DeepIndexedElement>, index: number): string {
  const prefix = element.tag || 'el';
  const typeHint = element.semanticType || element.type || '';
  const textHint = (element.text || element.ariaLabel || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 15);

  return `${prefix}_${typeHint}_${textHint}_${index}`.replace(/_+/g, '_').replace(/_$/, '');
}

function inferSemanticType(element: Partial<DeepIndexedElement>): SemanticType | null {
  const text = (element.text || '').toLowerCase();
  const fullText = (element.fullText || '').toLowerCase();
  const classes = element.classes?.join(' ').toLowerCase() || '';
  const id = element.attributes?.id?.toLowerCase() || '';

  // CTA detection
  if (
    element.tag === 'button' ||
    element.role === 'button' ||
    text.includes('shop') ||
    text.includes('buy') ||
    text.includes('add to cart') ||
    text.includes('get started') ||
    text.includes('sign up') ||
    classes.includes('cta') ||
    element.dataAttributes?.cta
  ) {
    return 'cta';
  }

  // Price detection
  if (/\$[\d,.]+/.test(element.text || '') || classes.includes('price')) {
    return 'price';
  }

  // Cart detection
  if (text.includes('cart') || id.includes('cart') || classes.includes('cart')) {
    return 'cart';
  }

  // Search detection
  if (
    element.tag === 'input' && element.attributes?.type === 'search' ||
    classes.includes('search') ||
    id.includes('search')
  ) {
    return 'search';
  }

  // Hero detection
  if (id.includes('hero') || classes.includes('hero')) {
    return 'hero';
  }

  // Testimonial detection
  if (id.includes('testimonial') || classes.includes('testimonial') || classes.includes('review')) {
    return 'testimonial';
  }

  // Product detection
  if (
    element.dataAttributes?.['product-id'] ||
    classes.includes('product') ||
    id.includes('product')
  ) {
    return 'product';
  }

  // Navigation detection
  if (element.tag === 'nav' || element.role === 'navigation' || classes.includes('nav')) {
    return 'navigation';
  }

  // Form field detection
  if (element.tag === 'input' || element.tag === 'textarea' || element.tag === 'select') {
    return 'form-field';
  }

  // Header/Footer detection
  if (element.tag === 'header' || element.role === 'banner') return 'header';
  if (element.tag === 'footer' || element.role === 'contentinfo') return 'footer';

  return null;
}

function getElementType(tag: string, role: string | null, attrs: Record<string, string>): ElementType {
  // By tag
  switch (tag) {
    case 'a': return 'link';
    case 'button': return 'button';
    case 'input':
    case 'textarea':
    case 'select': return 'input';
    case 'form': return 'form';
    case 'img':
    case 'picture':
    case 'svg': return 'image';
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6': return 'heading';
    case 'ul':
    case 'ol': return 'list';
    case 'li': return 'listItem';
    case 'table': return 'table';
    case 'section': return 'section';
    case 'nav': return 'navigation';
    case 'main': return 'main';
    case 'aside': return 'aside';
    case 'footer': return 'footer';
    case 'header': return 'header';
    case 'video':
    case 'audio': return 'media';
    case 'p':
    case 'span':
    case 'label': return 'text';
    case 'div':
      // Check if it's a container or interactive
      if (attrs.role === 'button' || attrs.onclick) return 'interactive';
      if (attrs.tabindex) return 'interactive';
      return 'container';
    default:
      if (role === 'button') return 'button';
      if (role === 'link') return 'link';
      if (role === 'navigation') return 'navigation';
      return 'other';
  }
}

/**
 * Extract comprehensive element data from a page
 */
async function extractDeepElements(page: Page, pageUrl: string): Promise<{
  elements: DeepIndexedElement[];
  tree: ElementTree;
  landmarks: LandmarkInfo[];
}> {
  console.log(`🔬 [Deep Indexer] Extracting all elements from ${pageUrl}...`);

  const result = await page.evaluate(() => {
    const elements: Array<{
      tag: string;
      selector: string;
      fullPath: string;
      xpath: string;
      role: string | null;
      ariaLabel: string | null;
      text: string;
      fullText: string;
      attributes: Record<string, string>;
      dataAttributes: Record<string, string>;
      classes: string[];
      styles: {
        display: string;
        visibility: string;
        opacity: string;
        position: string;
        zIndex: string;
        overflow: string;
        cursor: string;
        pointerEvents: string;
        backgroundColor: string;
        color: string;
        fontSize: string;
        fontWeight: string;
        textAlign: string;
        borderRadius: string;
        boxShadow: string;
      };
      boundingBox: {
        x: number; y: number; width: number; height: number;
        top: number; right: number; bottom: number; left: number;
        centerX: number; centerY: number;
      };
      visibility: {
        isVisible: boolean;
        isInViewport: boolean;
        isFullyInViewport: boolean;
        percentVisible: number;
        isHidden: boolean;
        isObscured: boolean;
        occludingElement: string | null;
      };
      interactivity: {
        isInteractive: boolean;
        isFocusable: boolean;
        isDisabled: boolean;
        hasClickHandler: boolean;
        hasHoverEffect: boolean;
        tabIndex: number | null;
      };
      parentSelector: string | null;
      siblingIndex: number;
      depth: number;
      isLandmark: boolean;
      landmarks: string[];
    }> = [];

    const landmarks: Array<{
      role: string;
      label: string | null;
      selector: string;
    }> = [];

    // Helper to build selector
    function getSelector(el: HTMLElement): string {
      if (el.id) return `#${el.id}`;
      let selector = el.tagName.toLowerCase();
      if (el.className && typeof el.className === 'string') {
        const firstClass = el.className.trim().split(/\s+/)[0];
        if (firstClass) selector += `.${firstClass}`;
      }
      return selector;
    }

    // Helper to build full path
    function getFullPath(el: HTMLElement): string {
      const path: string[] = [];
      let current: HTMLElement | null = el;
      while (current && current !== document.body) {
        let part = current.tagName.toLowerCase();
        if (current.id) {
          path.unshift(`#${current.id}`);
          break;
        }
        if (current.className && typeof current.className === 'string') {
          const classes = current.className.trim().split(/\s+/).slice(0, 2);
          if (classes.length) part += `.${classes.join('.')}`;
        }
        path.unshift(part);
        current = current.parentElement;
      }
      return path.join(' > ');
    }

    // Helper to build XPath
    function getXPath(el: HTMLElement): string {
      if (el.id) return `//*[@id="${el.id}"]`;
      const parts: string[] = [];
      let current: HTMLElement | null = el;
      while (current && current.nodeType === Node.ELEMENT_NODE) {
        let index = 0;
        let sibling: Node | null = current.previousSibling;
        while (sibling) {
          if (sibling.nodeType === Node.ELEMENT_NODE &&
              (sibling as HTMLElement).tagName === current.tagName) {
            index++;
          }
          sibling = sibling.previousSibling;
        }
        const tagName = current.tagName.toLowerCase();
        const pathPart = index > 0 ? `${tagName}[${index + 1}]` : tagName;
        parts.unshift(pathPart);
        current = current.parentElement;
      }
      return '/' + parts.join('/');
    }

    // Helper to check if element is in viewport
    function getVisibilityInfo(el: HTMLElement, rect: DOMRect): typeof elements[0]['visibility'] {
      const style = window.getComputedStyle(el);
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const isHidden = style.display === 'none' ||
                       style.visibility === 'hidden' ||
                       parseFloat(style.opacity) === 0;

      const isInViewport = rect.top < viewportHeight &&
                          rect.bottom > 0 &&
                          rect.left < viewportWidth &&
                          rect.right > 0;

      const isFullyInViewport = rect.top >= 0 &&
                                rect.bottom <= viewportHeight &&
                                rect.left >= 0 &&
                                rect.right <= viewportWidth;

      // Calculate percent visible
      let percentVisible = 0;
      if (isInViewport && !isHidden) {
        const visibleTop = Math.max(0, rect.top);
        const visibleBottom = Math.min(viewportHeight, rect.bottom);
        const visibleLeft = Math.max(0, rect.left);
        const visibleRight = Math.min(viewportWidth, rect.right);
        const visibleArea = Math.max(0, visibleRight - visibleLeft) *
                            Math.max(0, visibleBottom - visibleTop);
        const totalArea = rect.width * rect.height;
        percentVisible = totalArea > 0 ? Math.round((visibleArea / totalArea) * 100) : 0;
      }

      // Check if element is obscured by another element
      let isObscured = false;
      let occludingElement: string | null = null;
      if (!isHidden && rect.width > 0 && rect.height > 0) {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const topElement = document.elementFromPoint(centerX, centerY);
        if (topElement && topElement !== el && !el.contains(topElement)) {
          isObscured = true;
          occludingElement = getSelector(topElement as HTMLElement);
        }
      }

      return {
        isVisible: !isHidden && rect.width > 0 && rect.height > 0,
        isInViewport,
        isFullyInViewport,
        percentVisible,
        isHidden,
        isObscured,
        occludingElement,
      };
    }

    // Helper to check interactivity
    function getInteractivityInfo(el: HTMLElement): typeof elements[0]['interactivity'] {
      const style = window.getComputedStyle(el);
      const tag = el.tagName.toLowerCase();

      const isNativelyInteractive = ['a', 'button', 'input', 'textarea', 'select'].includes(tag);
      const hasRole = el.getAttribute('role') === 'button' || el.getAttribute('role') === 'link';
      const hasOnClick = el.hasAttribute('onclick') || (el as unknown as { onclick: unknown }).onclick !== null;
      const hasTabIndex = el.hasAttribute('tabindex') && el.getAttribute('tabindex') !== '-1';

      const isDisabled = el.hasAttribute('disabled') ||
                         el.getAttribute('aria-disabled') === 'true';

      return {
        isInteractive: isNativelyInteractive || hasRole || hasOnClick || hasTabIndex,
        isFocusable: isNativelyInteractive || hasTabIndex,
        isDisabled,
        hasClickHandler: hasOnClick,
        hasHoverEffect: style.cursor === 'pointer',
        tabIndex: el.hasAttribute('tabindex') ? parseInt(el.getAttribute('tabindex') || '0') : null,
      };
    }

    // Landmark roles
    const landmarkRoles = ['banner', 'navigation', 'main', 'contentinfo', 'complementary', 'search', 'form', 'region'];
    const landmarkTags: Record<string, string> = {
      'header': 'banner',
      'nav': 'navigation',
      'main': 'main',
      'footer': 'contentinfo',
      'aside': 'complementary',
    };

    // Get all elements
    const allElements = document.querySelectorAll('*');
    let elementIndex = 0;

    allElements.forEach((node) => {
      const el = node as HTMLElement;
      if (!el.tagName) return;

      const tag = el.tagName.toLowerCase();
      // Skip script, style, meta, etc.
      if (['script', 'style', 'meta', 'link', 'noscript', 'template', 'head', 'html', 'body'].includes(tag)) {
        return;
      }

      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);

      // Skip invisible elements (but keep hidden ones for complete tree)
      if (rect.width === 0 && rect.height === 0 && style.display === 'none') {
        return;
      }

      const selector = getSelector(el);
      const fullPath = getFullPath(el);

      // Get all attributes
      const attributes: Record<string, string> = {};
      const dataAttributes: Record<string, string> = {};
      for (const attr of el.attributes) {
        if (attr.name.startsWith('data-')) {
          dataAttributes[attr.name.replace('data-', '')] = attr.value.slice(0, 200);
        } else {
          attributes[attr.name] = attr.value.slice(0, 200);
        }
      }

      // Get classes
      const classes = el.className && typeof el.className === 'string'
        ? el.className.trim().split(/\s+/).filter(Boolean)
        : [];

      // Get direct text content (not from children)
      let directText = '';
      for (const child of el.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          directText += child.textContent;
        }
      }
      directText = directText.trim().slice(0, 200);

      // Get parent selector
      const parent = el.parentElement;
      const parentSelector = parent ? getSelector(parent) : null;

      // Calculate depth
      let depth = 0;
      let current: HTMLElement | null = el;
      while (current && current !== document.body) {
        depth++;
        current = current.parentElement;
      }

      // Check if landmark
      const role = el.getAttribute('role');
      const isLandmark = (role && landmarkRoles.includes(role)) ||
                          Object.keys(landmarkTags).includes(tag);

      if (isLandmark) {
        landmarks.push({
          role: role || landmarkTags[tag] || 'region',
          label: el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || null,
          selector,
        });
      }

      // Get containing landmarks
      const containingLandmarks: string[] = [];
      let ancestor: HTMLElement | null = el.parentElement;
      while (ancestor && ancestor !== document.body) {
        const ancestorRole = ancestor.getAttribute('role');
        const ancestorTag = ancestor.tagName.toLowerCase();
        if ((ancestorRole && landmarkRoles.includes(ancestorRole)) ||
            Object.keys(landmarkTags).includes(ancestorTag)) {
          containingLandmarks.push(ancestorRole || landmarkTags[ancestorTag] || 'region');
        }
        ancestor = ancestor.parentElement;
      }

      // Calculate sibling index
      let siblingIndex = 0;
      if (parent) {
        siblingIndex = Array.from(parent.children).indexOf(el);
      }

      elements.push({
        tag,
        selector,
        fullPath,
        xpath: getXPath(el),
        role: el.getAttribute('role'),
        ariaLabel: el.getAttribute('aria-label') || el.getAttribute('aria-labelledby'),
        text: directText,
        fullText: (el.textContent || '').trim().slice(0, 500),
        attributes,
        dataAttributes,
        classes,
        styles: {
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          position: style.position,
          zIndex: style.zIndex,
          overflow: style.overflow,
          cursor: style.cursor,
          pointerEvents: style.pointerEvents,
          backgroundColor: style.backgroundColor,
          color: style.color,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          textAlign: style.textAlign,
          borderRadius: style.borderRadius,
          boxShadow: style.boxShadow,
        },
        boundingBox: {
          x: Math.round(rect.x),
          y: Math.round(rect.y + window.scrollY),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          top: Math.round(rect.top + window.scrollY),
          right: Math.round(rect.right),
          bottom: Math.round(rect.bottom + window.scrollY),
          left: Math.round(rect.left),
          centerX: Math.round(rect.left + rect.width / 2),
          centerY: Math.round(rect.top + window.scrollY + rect.height / 2),
        },
        visibility: getVisibilityInfo(el, rect),
        interactivity: getInteractivityInfo(el),
        parentSelector,
        siblingIndex,
        depth,
        isLandmark,
        landmarks: containingLandmarks,
      });

      elementIndex++;
    });

    return { elements, landmarks };
  });

  // Process elements and build tree
  const processedElements: DeepIndexedElement[] = [];
  const idMap = new Map<string, number>(); // selector -> index for ID lookup
  const tree: ElementTree = {
    rootId: '',
    nodes: {},
  };

  // First pass: assign IDs and basic processing
  result.elements.forEach((raw, index) => {
    const elementType = getElementType(raw.tag, raw.role, raw.attributes);
    const semanticType = inferSemanticType({
      ...raw,
      type: elementType,
    });
    const { path: componentPath, name: componentName } = resolveComponentPath({
      ...raw,
      type: elementType,
      semanticType,
    });

    const id = generateElementId({ ...raw, type: elementType, semanticType }, index);
    idMap.set(raw.selector + '|' + raw.fullPath, index);

    const element: DeepIndexedElement = {
      id,
      selector: raw.selector,
      fullPath: raw.fullPath,
      xpath: raw.xpath,
      tag: raw.tag,
      type: elementType,
      role: raw.role,
      ariaLabel: raw.ariaLabel,
      text: raw.text,
      fullText: raw.fullText,
      attributes: raw.attributes,
      dataAttributes: raw.dataAttributes,
      classes: raw.classes,
      styles: raw.styles,
      boundingBox: raw.boundingBox,
      visibility: raw.visibility,
      interactivity: raw.interactivity,
      parentId: null, // Will be resolved in second pass
      childIds: [],   // Will be resolved in second pass
      siblingIndex: raw.siblingIndex,
      depth: raw.depth,
      componentPath,
      componentName,
      pageUrl,
      landmarks: raw.landmarks,
      isLandmark: raw.isLandmark,
      isFocusable: raw.interactivity.isFocusable,
      isClickable: raw.interactivity.isInteractive || raw.styles.cursor === 'pointer',
      semanticType,
    };

    processedElements.push(element);

    // Add to tree
    tree.nodes[id] = {
      id,
      tag: raw.tag,
      childIds: [],
      isInteractive: element.isClickable,
    };

    if (raw.depth === 1) {
      tree.rootId = id;
    }
  });

  // Second pass: resolve parent-child relationships
  for (let i = 0; i < processedElements.length; i++) {
    const element = processedElements[i];
    const raw = result.elements[i];

    // Find parent by matching selector pattern in fullPath
    if (raw.parentSelector) {
      for (let j = i - 1; j >= 0; j--) {
        const potentialParent = processedElements[j];
        if (potentialParent.depth === raw.depth - 1 &&
            element.fullPath.includes(potentialParent.selector)) {
          element.parentId = potentialParent.id;
          potentialParent.childIds.push(element.id);

          // Update tree
          if (tree.nodes[potentialParent.id]) {
            tree.nodes[potentialParent.id].childIds.push(element.id);
          }
          break;
        }
      }
    }
  }

  // Convert landmarks
  const landmarkInfos: LandmarkInfo[] = result.landmarks.map((l, i) => ({
    role: l.role,
    label: l.label,
    elementId: `landmark_${i}`,
    selector: l.selector,
  }));

  console.log(`   ✅ Extracted ${processedElements.length} elements`);

  return {
    elements: processedElements,
    tree,
    landmarks: landmarkInfos,
  };
}

/**
 * Build comprehensive deep element index
 */
export async function buildDeepElementIndex(
  baseUrl: string,
  pages: string[] = ['/store']
): Promise<DeepElementIndex> {
  console.log('🔬 [Deep Indexer] Starting comprehensive page analysis...');
  const startTime = Date.now();

  let browser: Browser | null = null;
  const allElements: DeepIndexedElement[] = [];
  let globalTree: ElementTree = { rootId: '', nodes: {} };
  let allLandmarks: LandmarkInfo[] = [];

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1200, height: 800 },
    });

    for (const pagePath of pages) {
      const page = await context.newPage();
      const url = `${baseUrl}${pagePath}`;

      console.log(`📄 [Deep Indexer] Analyzing: ${url}`);

      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000); // Wait for dynamic content

      // Scroll to capture all elements (triggers lazy loading)
      await autoScroll(page);

      // Extract elements
      const { elements, tree, landmarks } = await extractDeepElements(page, pagePath);

      allElements.push(...elements);
      if (Object.keys(globalTree.nodes).length === 0) {
        globalTree = tree;
      } else {
        // Merge trees
        Object.assign(globalTree.nodes, tree.nodes);
      }
      allLandmarks.push(...landmarks);

      // Navigate through checkout flow for form elements
      await captureCheckoutFlow(page, pagePath, allElements);

      await page.close();
    }

    await context.close();
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Calculate statistics
  const stats = {
    byType: {} as Record<string, number>,
    byComponent: {} as Record<string, number>,
    bySemanticType: {} as Record<string, number>,
    interactiveCount: 0,
    visibleCount: 0,
    maxDepth: 0,
  };

  for (const el of allElements) {
    stats.byType[el.type] = (stats.byType[el.type] || 0) + 1;
    stats.byComponent[el.componentName] = (stats.byComponent[el.componentName] || 0) + 1;
    if (el.semanticType) {
      stats.bySemanticType[el.semanticType] = (stats.bySemanticType[el.semanticType] || 0) + 1;
    }
    if (el.isClickable) stats.interactiveCount++;
    if (el.visibility.isVisible) stats.visibleCount++;
    stats.maxDepth = Math.max(stats.maxDepth, el.depth);
  }

  const duration = Date.now() - startTime;

  const index: DeepElementIndex = {
    version: 2, // Deep index version
    generatedAt: Date.now(),
    duration,
    pages,
    totalElements: allElements.length,
    stats,
    elements: allElements,
    tree: globalTree,
    landmarks: allLandmarks,
  };

  console.log(`✅ [Deep Indexer] Analysis complete in ${duration}ms`);
  console.log(`   Total elements: ${allElements.length}`);
  console.log(`   Interactive: ${stats.interactiveCount}`);
  console.log(`   Visible: ${stats.visibleCount}`);
  console.log(`   Max depth: ${stats.maxDepth}`);
  console.log(`   Components: ${Object.keys(stats.byComponent).join(', ')}`);

  return index;
}

/**
 * Auto-scroll page to trigger lazy loading and capture all elements
 */
async function autoScroll(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
    const totalHeight = document.documentElement.scrollHeight;
    const viewportHeight = window.innerHeight;
    let currentPosition = 0;

    while (currentPosition < totalHeight) {
      window.scrollTo(0, currentPosition);
      await delay(100);
      currentPosition += viewportHeight / 2;
    }

    // Scroll back to top
    window.scrollTo(0, 0);
    await delay(200);
  });
}

/**
 * Navigate through checkout flow to capture form elements
 */
async function captureCheckoutFlow(
  page: Page,
  pagePath: string,
  elements: DeepIndexedElement[]
): Promise<void> {
  try {
    console.log('   🛒 [Deep Indexer] Capturing checkout flow elements...');

    // Add item to cart
    const addToCartBtn = page.locator('button:has-text("Add to Cart")').first();
    if (await addToCartBtn.isVisible({ timeout: 2000 })) {
      await addToCartBtn.evaluate((el: HTMLElement) => el.click());
      await page.waitForTimeout(500);

      // Open cart
      const cartButton = page.locator('button').filter({ hasText: /^[0-9]+$/ }).first();
      if (await cartButton.isVisible({ timeout: 1000 })) {
        await cartButton.evaluate((el: HTMLElement) => el.click());
        await page.waitForTimeout(500);

        // Click checkout
        const checkoutBtn = page.locator('button:has-text("Checkout")').first();
        if (await checkoutBtn.isVisible({ timeout: 1000 })) {
          await checkoutBtn.evaluate((el: HTMLElement) => el.click());

          // Wait for form
          await page.waitForSelector('input', { timeout: 2000 }).catch(() => {});
          await page.waitForTimeout(500);

          // Capture shipping form elements
          const { elements: shippingElements } = await extractDeepElements(page, pagePath + '#shipping');
          elements.push(...shippingElements);
          console.log(`   ✅ Captured ${shippingElements.length} shipping form elements`);

          // Fill form to enable continue
          await page.fill('input[placeholder="John Doe"]', 'Test User').catch(() => {});
          await page.fill('input[placeholder="john@example.com"]', 'test@test.com').catch(() => {});
          await page.fill('input[placeholder="123 Main Street"]', '123 Test St').catch(() => {});
          await page.fill('input[placeholder="New York"]', 'Test City').catch(() => {});
          await page.fill('input[placeholder="10001"]', '12345').catch(() => {});

          // Continue to payment
          const continueBtn = page.locator('button:has-text("Continue to Payment")').first();
          if (await continueBtn.isVisible({ timeout: 1000 })) {
            await continueBtn.evaluate((el: HTMLElement) => el.click());
            await page.waitForTimeout(500);

            // Capture payment form elements
            const { elements: paymentElements } = await extractDeepElements(page, pagePath + '#payment');
            elements.push(...paymentElements);
            console.log(`   ✅ Captured ${paymentElements.length} payment form elements`);
          }
        }
      }
    }
  } catch (err) {
    console.log('   ⚠️ [Deep Indexer] Checkout flow capture incomplete:', err);
  }
}

/**
 * Save deep element index to file
 */
export async function saveDeepElementIndex(index: DeepElementIndex): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DEEP_INDEX_FILE, JSON.stringify(index, null, 2));
  console.log(`💾 [Deep Indexer] Saved deep index to ${DEEP_INDEX_FILE}`);
}

/**
 * Load deep element index from file
 */
export async function loadDeepElementIndex(): Promise<DeepElementIndex | null> {
  try {
    const data = await fs.readFile(DEEP_INDEX_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Find element by various criteria
 */
export function findDeepElement(
  index: DeepElementIndex,
  query: {
    selector?: string;
    fullPath?: string;
    text?: string;
    semanticType?: SemanticType;
    boundingBox?: { x: number; y: number }; // Find by click position
    xpath?: string;
  }
): DeepIndexedElement | null {
  for (const el of index.elements) {
    if (query.selector && (el.selector === query.selector || el.fullPath.includes(query.selector))) {
      return el;
    }
    if (query.fullPath && el.fullPath === query.fullPath) {
      return el;
    }
    if (query.text && el.text.toLowerCase().includes(query.text.toLowerCase())) {
      return el;
    }
    if (query.semanticType && el.semanticType === query.semanticType) {
      return el;
    }
    if (query.xpath && el.xpath === query.xpath) {
      return el;
    }
    if (query.boundingBox) {
      const { x, y } = query.boundingBox;
      const box = el.boundingBox;
      if (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) {
        return el;
      }
    }
  }
  return null;
}

/**
 * Get all elements by component
 */
export function getDeepElementsByComponent(
  index: DeepElementIndex,
  componentPath: string
): DeepIndexedElement[] {
  return index.elements.filter(el => el.componentPath === componentPath);
}

/**
 * Get all elements by semantic type
 */
export function getDeepElementsBySemanticType(
  index: DeepElementIndex,
  semanticType: SemanticType
): DeepIndexedElement[] {
  return index.elements.filter(el => el.semanticType === semanticType);
}

/**
 * Find element at click position
 */
export function findElementAtPosition(
  index: DeepElementIndex,
  x: number,
  y: number
): DeepIndexedElement | null {
  // Find all elements containing the point
  const candidates = index.elements.filter(el => {
    const box = el.boundingBox;
    return el.visibility.isVisible &&
           x >= box.left && x <= box.right &&
           y >= box.top && y <= box.bottom;
  });

  if (candidates.length === 0) return null;

  // Return the most specific (deepest) element
  return candidates.reduce((a, b) => a.depth > b.depth ? a : b);
}
