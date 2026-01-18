'use client';

import { useEffect, useRef, useCallback } from 'react';
import { EventType, InferredBehavior } from '@/lib/types';

interface ElementContext {
  selector: string;
  fullPath: string;
  tag: string;
  text: string;
  attributes: Record<string, string>;
  boundingBox: { top: number; left: number; width: number; height: number };
  viewportPosition: { x: number; y: number; visible: boolean; percentVisible: number };
  computedStyle: { cursor: string; pointerEvents: string; opacity: string; display: string };
  isInteractive: boolean;
  isVisible: boolean;
  isInIframe: boolean;
  nearestInteractive: string | null;
}

interface PageContext {
  scrollX: number;
  scrollY: number;
  scrollPercent: number;
  documentHeight: number;
  documentWidth: number;
  timeOnPage: number;
  url: string;
}

interface PartialEvent {
  type: EventType;
  x?: number;
  y?: number;
  elementSelector?: string;
  elementText?: string;
  elementId?: string; // Indexed element ID for precise targeting
  elementPlaceholder?: string; // For form inputs
  scrollDepth?: number;
  clickCount?: number;
  sectionId?: string;
  productId?: string;
  productName?: string;
  productPrice?: number;
  inferredBehavior?: InferredBehavior;
  behaviorConfidence?: number;
  behaviorContext?: string;
  // Rich context for LLM
  elementContext?: ElementContext;
  pageContext?: PageContext;
  frustrationReason?: string; // Human-readable why this is a problem
}

// Indexed element from element-index.json
interface IndexedElement {
  id: string;
  selector: string;
  fullPath: string;
  tag: string;
  text: string;
  placeholder?: string;
  componentPath: string;
  componentName: string;
}

// Element index cache
let elementIndexCache: IndexedElement[] | null = null;
let elementIndexLoading = false;

// Load element index from API
async function loadElementIndex(): Promise<IndexedElement[]> {
  if (elementIndexCache) return elementIndexCache;
  if (elementIndexLoading) {
    // Wait for existing load to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    return elementIndexCache || [];
  }

  elementIndexLoading = true;
  try {
    const response = await fetch('/api/index-elements');
    if (response.ok) {
      const data = await response.json();
      elementIndexCache = data.elements || [];
      console.log(`📋 [Tracker] Loaded ${elementIndexCache.length} indexed elements`);
    } else {
      elementIndexCache = [];
    }
  } catch {
    console.warn('[Tracker] Could not load element index');
    elementIndexCache = [];
  }
  elementIndexLoading = false;
  return elementIndexCache;
}

// Match an element to an indexed element
function matchToIndexedElement(
  el: HTMLElement,
  fullPath: string
): { id: string; componentPath: string; componentName: string } | null {
  if (!elementIndexCache || elementIndexCache.length === 0) return null;

  const selector = getSelector(el);
  const text = (el.textContent || '').trim().slice(0, 50).toLowerCase();
  const placeholder = (el as HTMLInputElement).placeholder || '';

  // Try exact fullPath match first
  for (const indexed of elementIndexCache) {
    if (indexed.fullPath === fullPath) {
      return { id: indexed.id, componentPath: indexed.componentPath, componentName: indexed.componentName };
    }
  }

  // Try placeholder match for inputs
  if (placeholder) {
    for (const indexed of elementIndexCache) {
      if (indexed.placeholder && indexed.placeholder.toLowerCase() === placeholder.toLowerCase()) {
        return { id: indexed.id, componentPath: indexed.componentPath, componentName: indexed.componentName };
      }
    }
  }

  // Try text + selector match
  for (const indexed of elementIndexCache) {
    const indexedText = indexed.text.toLowerCase().slice(0, 50);
    if (indexedText && text && indexedText === text && indexed.selector === selector) {
      return { id: indexed.id, componentPath: indexed.componentPath, componentName: indexed.componentName };
    }
  }

  // Try selector match with same tag
  const tag = el.tagName.toLowerCase();
  for (const indexed of elementIndexCache) {
    if (indexed.tag === tag && indexed.selector === selector) {
      return { id: indexed.id, componentPath: indexed.componentPath, componentName: indexed.componentName };
    }
  }

  return null;
}

// Session behavior tracking for intent inference
interface BehaviorState {
  productsViewed: string[];
  priceElementsClicked: number;
  searchClicks: number;
  cartOpens: number;
  ctaClicks: number;
  rageClicks: number;
  deadClicks: number;
  addToCartCount: number;
  timeOnProducts: number;
  lastProductViewTime: number;
}

// Generate a session ID that persists for the browser session
function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  let sessionId = sessionStorage.getItem('blip_session_id');
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    sessionStorage.setItem('blip_session_id', sessionId);
  }
  return sessionId;
}

// Get a CSS selector for an element
function getSelector(el: HTMLElement): string {
  if (el.id) return `#${el.id}`;

  const classes = el.className;
  if (typeof classes === 'string' && classes.trim()) {
    const firstClass = classes.trim().split(/\s+/)[0];
    return `${el.tagName.toLowerCase()}.${firstClass}`;
  }

  return el.tagName.toLowerCase();
}

// Get FULL unique CSS path to element (for precise LLM context)
function getFullPath(el: HTMLElement): string {
  const path: string[] = [];
  let current: HTMLElement | null = el;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      selector = `#${current.id}`;
      path.unshift(selector);
      break; // ID is unique, stop here
    }

    // Add classes
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).slice(0, 2).join('.');
      if (classes) selector += `.${classes}`;
    }

    // Add nth-child if needed for uniqueness
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(c => c.tagName === current!.tagName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}

// Get detailed element info for LLM context
function getElementContext(el: HTMLElement): {
  selector: string;
  fullPath: string;
  tag: string;
  text: string;
  attributes: Record<string, string>;
  boundingBox: { top: number; left: number; width: number; height: number };
  viewportPosition: { x: number; y: number; visible: boolean; percentVisible: number };
  computedStyle: { cursor: string; pointerEvents: string; opacity: string; display: string };
  isInteractive: boolean;
  isVisible: boolean;
  isInIframe: boolean;
  nearestInteractive: string | null;
} {
  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);

  // Check if element is in viewport
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  const visibleTop = Math.max(0, rect.top);
  const visibleBottom = Math.min(viewportHeight, rect.bottom);
  const visibleLeft = Math.max(0, rect.left);
  const visibleRight = Math.min(viewportWidth, rect.right);
  const visibleArea = Math.max(0, visibleRight - visibleLeft) * Math.max(0, visibleBottom - visibleTop);
  const totalArea = rect.width * rect.height;
  const percentVisible = totalArea > 0 ? Math.round((visibleArea / totalArea) * 100) : 0;

  // Get all data attributes
  const attributes: Record<string, string> = {};
  for (const attr of el.attributes) {
    if (attr.name.startsWith('data-') || ['id', 'class', 'href', 'src', 'type', 'name', 'placeholder', 'role', 'aria-label'].includes(attr.name)) {
      attributes[attr.name] = attr.value.slice(0, 100);
    }
  }

  // Find nearest interactive parent/ancestor
  let nearestInteractive: string | null = null;
  const interactiveParent = el.closest('a, button, input, [onclick], [role="button"], [tabindex]');
  if (interactiveParent && interactiveParent !== el) {
    nearestInteractive = getSelector(interactiveParent as HTMLElement);
  }

  // Check if in iframe
  const isInIframe = window.self !== window.top;

  return {
    selector: getSelector(el),
    fullPath: getFullPath(el),
    tag: el.tagName.toLowerCase(),
    text: (el.textContent || '').slice(0, 150).trim(),
    attributes,
    boundingBox: {
      top: Math.round(rect.top + window.scrollY),
      left: Math.round(rect.left + window.scrollX),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    },
    viewportPosition: {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      visible: percentVisible > 0,
      percentVisible,
    },
    computedStyle: {
      cursor: style.cursor,
      pointerEvents: style.pointerEvents,
      opacity: style.opacity,
      display: style.display,
    },
    isInteractive: isInteractive(el),
    isVisible: style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) > 0,
    isInIframe,
    nearestInteractive,
  };
}

// Get current page context
function getPageContext(pageEntryTime: number): PageContext {
  const docHeight = document.documentElement.scrollHeight;
  const viewportHeight = window.innerHeight;
  const scrollPercent = docHeight > viewportHeight
    ? Math.round((window.scrollY / (docHeight - viewportHeight)) * 100)
    : 0;

  return {
    scrollX: Math.round(window.scrollX),
    scrollY: Math.round(window.scrollY),
    scrollPercent,
    documentHeight: docHeight,
    documentWidth: document.documentElement.scrollWidth,
    timeOnPage: Date.now() - pageEntryTime,
    url: window.location.pathname,
  };
}

// Generate human-readable frustration reason
function describeFrustration(type: string, el: HTMLElement, context: ElementContext): string {
  switch (type) {
    case 'dead_click':
      if (context.tag === 'img') {
        return `User clicked on image expecting it to be interactive (enlarge/open). Image at ${context.fullPath} has cursor:${context.computedStyle.cursor}, not clickable.`;
      }
      if (context.nearestInteractive) {
        return `User clicked near but missed the interactive element "${context.nearestInteractive}". Clicked on ${context.tag} instead. May need larger click target.`;
      }
      return `User clicked on non-interactive ${context.tag} element "${context.text.slice(0, 30)}...". Expected it to do something. Element path: ${context.fullPath}`;

    case 'rage_click':
      return `User rage-clicked ${context.tag} element multiple times rapidly. Likely no visual feedback on click. Element: ${context.fullPath}, cursor: ${context.computedStyle.cursor}`;

    case 'double_click':
      if (context.tag === 'button' || context.attributes['role'] === 'button') {
        return `User double-clicked button "${context.text.slice(0, 30)}". Suggests no loading state or feedback - user unsure if click registered.`;
      }
      return `User double-clicked on ${context.tag}. May expect different behavior than single click.`;

    case 'slow_form_fill':
      return `User spent excessive time on form field. Field: ${context.attributes['name'] || context.attributes['placeholder'] || context.selector}. May need better autofill support, clearer instructions, or simpler input.`;

    case 'scroll_reversal':
      return `User scrolling up and down repeatedly - searching for something they can't find. Consider better navigation, search, or content organization.`;

    default:
      return `Frustration signal: ${type} on ${context.tag} at ${context.fullPath}`;
  }
}

// Check if element or its parent is interactive
function isInteractive(el: HTMLElement): boolean {
  const interactiveSelector = 'a, button, input, textarea, select, [onclick], [role="button"], [tabindex]';
  return el.matches(interactiveSelector) || el.closest(interactiveSelector) !== null;
}

// Check if element is price-related
function isPriceElement(el: HTMLElement): boolean {
  const text = el.textContent || '';
  return /\$[\d,.]+/.test(text) ||
         el.closest('[data-price], .price, [class*="price"]') !== null;
}

// Check if element is search-related
function isSearchElement(el: HTMLElement): boolean {
  return el.matches('input[type="search"], [data-search], .search, [class*="search"]') ||
         el.closest('input[type="search"], [data-search], .search, [class*="search"]') !== null;
}

// Check if element is cart-related
function isCartElement(el: HTMLElement): boolean {
  const text = (el.textContent || '').toLowerCase();
  return text.includes('cart') ||
         el.closest('[data-cart], .cart, [class*="cart"]') !== null;
}

// Check if element is navigation-related
function isNavigationElement(el: HTMLElement): boolean {
  return el.closest('nav, header, [role="navigation"], .nav, .navigation') !== null;
}

// Session behavior state
const behaviorState: BehaviorState = {
  productsViewed: [],
  priceElementsClicked: 0,
  searchClicks: 0,
  cartOpens: 0,
  ctaClicks: 0,
  rageClicks: 0,
  deadClicks: 0,
  addToCartCount: 0,
  timeOnProducts: 0,
  lastProductViewTime: 0,
};

// Infer what the user is trying to do based on their behavior
function inferBehavior(): { behavior: InferredBehavior; confidence: number; context: string } {
  const {
    productsViewed,
    priceElementsClicked,
    searchClicks,
    cartOpens,
    ctaClicks,
    rageClicks,
    deadClicks,
    addToCartCount,
  } = behaviorState;

  // High frustration signals = confused
  if (rageClicks >= 2 || deadClicks >= 3) {
    return {
      behavior: 'confused',
      confidence: 0.8,
      context: `User shows frustration: ${rageClicks} rage clicks, ${deadClicks} dead clicks`,
    };
  }

  // Added to cart = ready to buy
  if (addToCartCount > 0) {
    return {
      behavior: 'ready_to_buy',
      confidence: 0.85,
      context: `User added ${addToCartCount} item(s) to cart`,
    };
  }

  // Opened cart multiple times without adding = abandoning or comparison shopping
  if (cartOpens >= 2 && addToCartCount === 0) {
    return {
      behavior: 'abandoning',
      confidence: 0.6,
      context: `Opened cart ${cartOpens}x but hasn't added items`,
    };
  }

  // Multiple products viewed = comparison shopping
  if (productsViewed.length >= 3) {
    return {
      behavior: 'comparison_shopping',
      confidence: 0.75,
      context: `Compared ${productsViewed.length} products: ${productsViewed.slice(-3).join(', ')}`,
    };
  }

  // Clicked on prices multiple times = price sensitive
  if (priceElementsClicked >= 2) {
    return {
      behavior: 'price_sensitive',
      confidence: 0.7,
      context: `Checked prices ${priceElementsClicked} times`,
    };
  }

  // Used search = hunting for something specific
  if (searchClicks >= 1) {
    return {
      behavior: 'product_hunting',
      confidence: 0.7,
      context: 'User is searching for a specific product',
    };
  }

  // CTA clicks without conversion = interested but hesitant
  if (ctaClicks >= 1 && addToCartCount === 0) {
    return {
      behavior: 'browsing',
      confidence: 0.6,
      context: `Clicked ${ctaClicks} CTA(s) but hasn't added to cart`,
    };
  }

  // Default: just browsing
  return {
    behavior: 'browsing',
    confidence: 0.5,
    context: 'User is casually browsing the store',
  };
}

// Emoji indicators for different event types
const eventEmojis: Record<string, string> = {
  click: '👆',
  cta_click: '🎯',
  add_to_cart: '🛒',
  product_view: '👀',
  product_compare: '⚖️',
  price_check: '💰',
  search_intent: '🔍',
  navigation_browse: '🧭',
  cart_review: '🛍️',
  rage_click: '😤',
  dead_click: '❌',
  scroll_depth: '📜',
  section_view: '📍',
  page_view: '📄',
  bounce: '💨',
  rapid_scroll: '⚡',
  exit_intent: '🚪',
  checkout_start: '💳',
  purchase: '✅',
  // New event types
  hover_intent: '🎯',
  text_selection: '📋',
  text_copy: '📝',
  tab_hidden: '👁️‍🗨️',
  tab_visible: '👁️',
  scroll_reversal: '🔄',
  form_focus: '✏️',
  form_blur: '📤',
  image_click: '🖼️',
  link_hover: '🔗',
  keyboard_shortcut: '⌨️',
  right_click: '🖱️',
  double_click: '👆👆',
};

// Batch events before sending to reduce API calls
const eventQueue: PartialEvent[] = [];
let flushTimeout: NodeJS.Timeout | null = null;

function queueEvent(event: PartialEvent) {
  // Get current inferred behavior
  const { behavior, confidence, context } = inferBehavior();

  // Attach behavior inference to event
  event.inferredBehavior = behavior;
  event.behaviorConfidence = confidence;
  event.behaviorContext = context;

  // Get emoji for event type
  const emoji = eventEmojis[event.type] || '📊';

  // Build rich log output
  const eventInfo: Record<string, unknown> = {
    event: event.type,
  };

  if (event.productId || event.productName) {
    eventInfo.product = event.productName || event.productId;
  }
  if (event.productPrice) {
    eventInfo.price = `$${event.productPrice}`;
  }
  if (event.x !== undefined) {
    eventInfo.position = `(${event.x}, ${event.y})`;
  }
  if (event.elementSelector) {
    eventInfo.element = event.elementSelector;
  }
  if (event.elementText) {
    eventInfo.text = event.elementText.slice(0, 40);
  }
  if (event.scrollDepth !== undefined) {
    eventInfo.depth = `${event.scrollDepth}%`;
  }
  if (event.clickCount) {
    eventInfo.clicks = event.clickCount;
  }

  // Log the event with inferred behavior
  console.log(
    `${emoji} [${event.type}]`,
    eventInfo
  );

  // Log behavior inference on significant events
  const significantEvents = ['cta_click', 'add_to_cart', 'product_view', 'rage_click', 'cart_review', 'search_intent'];
  if (significantEvents.includes(event.type)) {
    const behaviorEmojis: Record<InferredBehavior, string> = {
      browsing: '🛒',
      product_hunting: '🎯',
      comparison_shopping: '⚖️',
      ready_to_buy: '💳',
      price_sensitive: '💰',
      confused: '😕',
      abandoning: '🚪',
    };
    console.log(
      `   ${behaviorEmojis[behavior]} Inferred behavior: ${behavior} (${Math.round(confidence * 100)}% confident)`,
      `\n   └─ ${context}`
    );
  }

  eventQueue.push(event);

  // Debounce: flush after 1 second of no new events, or immediately if we hit 10 events
  if (flushTimeout) clearTimeout(flushTimeout);

  if (eventQueue.length >= 10) {
    flushEvents();
  } else {
    flushTimeout = setTimeout(flushEvents, 1000);
  }
}

function flushEvents() {
  if (eventQueue.length === 0) return;

  const sessionId = getSessionId();
  const events = eventQueue.splice(0, eventQueue.length).map(event => ({
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    timestamp: Date.now(),
    sessionId,
    pageUrl: window.location.pathname,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    ...event,
  }));

  console.log(`📤 [Flush] Sending ${events.length} event(s) to /api/pulse`, events.map(e => e.type));

  // Use sendBeacon for reliability (works even if page is closing)
  const success = navigator.sendBeacon('/api/pulse', JSON.stringify({ events }));

  // Fallback to fetch if sendBeacon fails
  if (!success) {
    fetch('/api/pulse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
      keepalive: true,
    }).catch(console.error);
  }
}

export function EventTracker({ children }: { children: React.ReactNode }) {
  // Track clicks for rage click detection
  const clickBuffer = useRef<Array<{ time: number; x: number; y: number }>>([]);

  // Track which scroll milestones we've already recorded
  const scrollMilestones = useRef(new Set<number>());

  // Track sections that have entered viewport
  const viewedSections = useRef(new Set<string>());

  // Track page entry time for bounce detection
  const pageEntryTime = useRef<number>(Date.now());

  // Track if user has interacted
  const hasInteracted = useRef(false);

  // Track last scroll position and time for rapid scroll detection
  const lastScrollPosition = useRef(0);
  const lastScrollTime = useRef(Date.now());
  const rapidScrollCount = useRef(0);

  // Track scroll direction for reversal detection
  const lastScrollDirection = useRef<'up' | 'down' | null>(null);
  const scrollReversalCount = useRef(0);

  // Track hover for hover intent detection
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);
  const hoveredElement = useRef<HTMLElement | null>(null);

  // Track form field timing (for slow_form_fill detection)
  const formFieldStartTime = useRef<Map<string, number>>(new Map());
  const SLOW_FORM_THRESHOLD = 10000; // 10 seconds = slow

  // Track checkout flow state
  const checkoutStarted = useRef(false);
  const lastClickedElement = useRef<string | null>(null);
  const lastClickTime = useRef<number>(0);

  // Auto-fix timer: triggers CRO flow 10 seconds after first interaction
  const autoFixTimer = useRef<NodeJS.Timeout | null>(null);
  const autoFixTriggered = useRef(false);

  const startAutoFixTimer = useCallback(() => {
    if (autoFixTimer.current || autoFixTriggered.current) return;

    console.log('⏱️ [AutoFix] Starting 10-second collection window...');
    autoFixTimer.current = setTimeout(async () => {
      autoFixTriggered.current = true;
      console.log('⏱️ [AutoFix] Collection complete. Triggering CRO flow...');

      // Flush any remaining events
      flushEvents();

      // Small delay to ensure events are processed
      await new Promise(resolve => setTimeout(resolve, 500));

      // Detect issues then trigger fix
      try {
        console.log('🔍 [AutoFix] Detecting issues...');
        const detectRes = await fetch('/api/detect-issues');
        const detectData = await detectRes.json();
        console.log('🔍 [AutoFix] Detection result:', detectData);

        if (detectData.issuesFound > 0) {
          console.log('🤖 [AutoFix] Issues found! Triggering fix flow...');
          const fixRes = await fetch('/api/analyze-and-fix', { method: 'POST' });
          const fixData = await fixRes.json();
          console.log('🤖 [AutoFix] Fix result:', fixData);
        } else {
          console.log('✅ [AutoFix] No issues detected.');
        }
      } catch (err) {
        console.error('❌ [AutoFix] Error:', err);
      }
    }, 10000);
  }, []);

  // Send event helper
  const sendEvent = useCallback((event: PartialEvent) => {
    // Start auto-fix timer on first real interaction
    if (event.type !== 'page_view') {
      startAutoFixTimer();
    }
    queueEvent(event);
  }, [startAutoFixTimer]);

  useEffect(() => {
    // Load element index for precise element matching
    loadElementIndex().catch(() => {});

    // Track page view on mount
    sendEvent({ type: 'page_view' });
    pageEntryTime.current = Date.now();

    // Click handler
    const handleClick = (e: MouseEvent) => {
      hasInteracted.current = true;
      const target = e.target as HTMLElement;
      const now = Date.now();

      // Extract product info if clicking on/within a product
      const productCard = target.closest('[data-product-id]');
      const productId = productCard?.getAttribute('data-product-id') || undefined;
      const productName = productCard?.querySelector('[data-product-name], .product-name, h3, h4')?.textContent?.trim();

      // Find price - try data-price, .price, or any element containing $XX.XX pattern
      let priceEl = productCard?.querySelector('[data-price], .price');
      let productPrice: number | undefined;
      if (priceEl) {
        productPrice = parseFloat(priceEl.textContent?.replace(/[^0-9.]/g, '') || '0');
      } else if (productCard) {
        // Look for any element with price-like text ($XX.XX)
        const allElements = productCard.querySelectorAll('*');
        for (const el of allElements) {
          const text = el.textContent || '';
          const priceMatch = text.match(/\$(\d+(?:\.\d{2})?)/);
          if (priceMatch && el.children.length === 0) { // Only leaf nodes
            productPrice = parseFloat(priceMatch[1]);
            break;
          }
        }
      }

      // Get full path for element matching
      const fullPath = getFullPath(target);
      const indexedMatch = matchToIndexedElement(target, fullPath);

      // Basic click event
      const clickEvent: PartialEvent = {
        type: 'click',
        x: e.clientX,
        y: e.clientY,
        elementSelector: getSelector(target),
        elementText: target.textContent?.slice(0, 100)?.trim() || undefined,
        elementId: indexedMatch?.id,
        elementPlaceholder: (target as HTMLInputElement).placeholder || undefined,
        productId,
        productName,
        productPrice,
      };

      // Log indexed element match for debugging
      if (indexedMatch) {
        console.log(`🎯 [Matched] ${indexedMatch.id} → ${indexedMatch.componentName}`);
      }

      // === E-COMMERCE BEHAVIOR DETECTION ===

      // Check if clicking on a product (product view behavior)
      if (productCard && !target.closest('[data-add-to-cart], button')) {
        clickEvent.type = 'product_view';
        if (productId && !behaviorState.productsViewed.includes(productId)) {
          behaviorState.productsViewed.push(productId);
          // Check if comparison shopping (multiple products viewed quickly)
          if (behaviorState.productsViewed.length >= 2) {
            const timeSinceLastProduct = now - behaviorState.lastProductViewTime;
            if (timeSinceLastProduct < 30000) { // Within 30 seconds
              sendEvent({
                type: 'product_compare',
                productId,
                productName,
                productPrice,
                elementText: `Comparing: ${behaviorState.productsViewed.slice(-2).join(' vs ')}`,
              });
            }
          }
          behaviorState.lastProductViewTime = now;
        }
      }

      // Check if clicking on price element
      if (isPriceElement(target)) {
        clickEvent.type = 'price_check';
        behaviorState.priceElementsClicked++;
      }

      // Check if search interaction
      if (isSearchElement(target)) {
        clickEvent.type = 'search_intent';
        behaviorState.searchClicks++;
      }

      // Check if cart interaction
      if (isCartElement(target) && !target.closest('[data-add-to-cart]')) {
        clickEvent.type = 'cart_review';
        behaviorState.cartOpens++;
      }

      // Check if navigation browsing
      if (isNavigationElement(target) && clickEvent.type === 'click') {
        clickEvent.type = 'navigation_browse';
      }

      // Check if it's a CTA click
      const isCTA = target.closest('[data-cta], .cta, button[type="submit"]') !== null ||
                    target.textContent?.toLowerCase().includes('shop') ||
                    target.textContent?.toLowerCase().includes('buy') ||
                    target.textContent?.toLowerCase().includes('add to cart');

      if (isCTA && clickEvent.type === 'click') {
        clickEvent.type = 'cta_click';
        behaviorState.ctaClicks++;
      }

      // Check if it's an add to cart action
      const isAddToCart = target.closest('[data-add-to-cart]') !== null ||
                          target.textContent?.toLowerCase().includes('add to cart');

      if (isAddToCart) {
        clickEvent.type = 'add_to_cart';
        clickEvent.productId = productId;
        clickEvent.productName = productName;
        clickEvent.productPrice = productPrice;
        behaviorState.addToCartCount++;
      }

      sendEvent(clickEvent);

      // Track last click for "click then exit" detection
      lastClickedElement.current = getSelector(target);
      lastClickTime.current = now;

      // Rage click detection: 3+ clicks in same area within 2 seconds
      clickBuffer.current.push({ time: now, x: e.clientX, y: e.clientY });
      clickBuffer.current = clickBuffer.current.filter(c => now - c.time < 2000);

      // Check if clicks are clustered (within 50px of each other)
      const recentClicks = clickBuffer.current;
      if (recentClicks.length >= 3) {
        const avgX = recentClicks.reduce((sum, c) => sum + c.x, 0) / recentClicks.length;
        const avgY = recentClicks.reduce((sum, c) => sum + c.y, 0) / recentClicks.length;
        const allClustered = recentClicks.every(c =>
          Math.abs(c.x - avgX) < 50 && Math.abs(c.y - avgY) < 50
        );

        if (allClustered) {
          behaviorState.rageClicks++;
          const elemContext = getElementContext(target);
          sendEvent({
            type: 'rage_click',
            x: Math.round(avgX),
            y: Math.round(avgY),
            elementSelector: getSelector(target),
            clickCount: recentClicks.length,
            elementContext: elemContext,
            pageContext: getPageContext(pageEntryTime.current),
            frustrationReason: describeFrustration('rage_click', target, elemContext),
          });
          // Clear buffer after detecting rage click to avoid duplicate reports
          clickBuffer.current = [];
        }
      }

      // Dead click detection: click on non-interactive element
      if (!isInteractive(target)) {
        behaviorState.deadClicks++;
        const elemContext = getElementContext(target);
        sendEvent({
          type: 'dead_click',
          x: e.clientX,
          y: e.clientY,
          elementSelector: getSelector(target),
          elementText: target.textContent?.slice(0, 100)?.trim() || undefined,
          elementContext: elemContext,
          pageContext: getPageContext(pageEntryTime.current),
          frustrationReason: describeFrustration('dead_click', target, elemContext),
        });
      }
    };

    // Scroll handler
    const handleScroll = () => {
      hasInteracted.current = true;
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;

      if (docHeight <= 0) return;

      const scrollPercent = Math.round((scrollTop / docHeight) * 100);

      // Track scroll milestones
      [25, 50, 75, 100].forEach(milestone => {
        if (scrollPercent >= milestone && !scrollMilestones.current.has(milestone)) {
          scrollMilestones.current.add(milestone);
          sendEvent({
            type: 'scroll_depth',
            scrollDepth: milestone,
          });
        }
      });

      // Rapid scroll detection: scrolling > 1000px in < 500ms multiple times
      const now = Date.now();
      const scrollDelta = Math.abs(scrollTop - lastScrollPosition.current);
      const timeDelta = now - lastScrollTime.current;

      if (timeDelta < 500 && scrollDelta > 1000) {
        rapidScrollCount.current++;
        if (rapidScrollCount.current >= 2) {
          sendEvent({ type: 'rapid_scroll' });
          rapidScrollCount.current = 0;
        }
      } else if (timeDelta > 1000) {
        rapidScrollCount.current = 0;
      }

      // Scroll direction reversal detection (user scrolling up and down = confusion/searching)
      const currentDirection = scrollTop > lastScrollPosition.current ? 'down' : 'up';
      if (lastScrollDirection.current && currentDirection !== lastScrollDirection.current) {
        scrollReversalCount.current++;
        // Log after 3+ reversals in quick succession (indicates confusion)
        if (scrollReversalCount.current >= 3) {
          sendEvent({
            type: 'scroll_reversal',
            scrollDepth: scrollPercent,
            elementText: `User reversed scroll direction ${scrollReversalCount.current} times`,
          });
          scrollReversalCount.current = 0;
        }
      }
      lastScrollDirection.current = currentDirection;

      // Reset reversal count after 2 seconds of no reversals
      if (timeDelta > 2000) {
        scrollReversalCount.current = 0;
      }

      lastScrollPosition.current = scrollTop;
      lastScrollTime.current = now;

      // Section view tracking using IntersectionObserver would be better,
      // but for simplicity we'll check on scroll
      const sections = document.querySelectorAll('[data-section]');
      sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        const sectionId = section.getAttribute('data-section');

        if (sectionId &&
            rect.top < window.innerHeight * 0.5 &&
            rect.bottom > window.innerHeight * 0.5 &&
            !viewedSections.current.has(sectionId)) {
          viewedSections.current.add(sectionId);
          sendEvent({
            type: 'section_view',
            sectionId,
          });
        }
      });
    };

    // Bounce and checkout abandonment detection on page unload
    const handleBeforeUnload = () => {
      // Flush any remaining events
      flushEvents();

      const timeOnPage = Date.now() - pageEntryTime.current;
      const eventsToSend: Array<Record<string, unknown>> = [];

      // If user spent < 10 seconds and didn't interact meaningfully, it's a bounce
      if (timeOnPage < 10000 && !hasInteracted.current) {
        eventsToSend.push({
          id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          type: 'bounce',
          timestamp: Date.now(),
          sessionId: getSessionId(),
          pageUrl: window.location.pathname,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
        });
      }

      // If user started checkout but is leaving, it's checkout abandonment
      if (checkoutStarted.current) {
        eventsToSend.push({
          id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          type: 'checkout_abandon',
          timestamp: Date.now(),
          sessionId: getSessionId(),
          pageUrl: window.location.pathname,
          elementText: 'User left during checkout flow',
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
        });
        console.log('🚨 [Checkout Abandon] User left during checkout');
      }

      // If user clicked something and left within 2 seconds, the click didn't do what they expected
      const timeSinceLastClick = Date.now() - lastClickTime.current;
      if (lastClickedElement.current && timeSinceLastClick < 2000 && timeSinceLastClick > 100) {
        eventsToSend.push({
          id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          type: 'dead_click',
          timestamp: Date.now(),
          sessionId: getSessionId(),
          pageUrl: window.location.pathname,
          elementSelector: lastClickedElement.current,
          elementText: `Click then exit within ${timeSinceLastClick}ms - click likely failed expectations`,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
        });
        console.log(`⚠️ [Click→Exit] User clicked "${lastClickedElement.current}" then left within ${timeSinceLastClick}ms`);
      }

      if (eventsToSend.length > 0) {
        navigator.sendBeacon('/api/pulse', JSON.stringify({ events: eventsToSend }));
      }
    };

    // === NEW EVENT HANDLERS ===

    // Mouseover handler for hover intent detection
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const productCard = target.closest('[data-product-id]');
      const interactiveEl = target.closest('a, button, [data-cta]');

      // Clear previous hover timeout
      if (hoverTimeout.current) {
        clearTimeout(hoverTimeout.current);
      }

      // Track hover intent on products (hover for 1.5+ seconds = interest)
      if (productCard || interactiveEl) {
        hoveredElement.current = (productCard || interactiveEl) as HTMLElement;
        hoverTimeout.current = setTimeout(() => {
          if (hoveredElement.current) {
            const productId = hoveredElement.current.getAttribute('data-product-id');
            const productName = hoveredElement.current.querySelector('[data-product-name], .product-name, h3, h4')?.textContent?.trim();
            sendEvent({
              type: 'hover_intent',
              elementSelector: getSelector(hoveredElement.current),
              elementText: hoveredElement.current.textContent?.slice(0, 100)?.trim(),
              productId: productId || undefined,
              productName,
            });
          }
        }, 1500);
      }
    };

    // Mouseout handler to clear hover tracking
    const handleMouseOut = () => {
      if (hoverTimeout.current) {
        clearTimeout(hoverTimeout.current);
        hoverTimeout.current = null;
      }
      hoveredElement.current = null;
    };

    // Exit intent detection (mouse moving toward top of viewport)
    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger if mouse leaves from the top (exit intent)
      if (e.clientY <= 5 && e.clientX > 0 && e.clientX < window.innerWidth) {
        sendEvent({
          type: 'exit_intent',
          y: e.clientY,
        });
      }
    };

    // Text selection handler (debounced)
    let selectionTimeout: NodeJS.Timeout | null = null;
    let lastSelection = '';
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();
      if (selectedText && selectedText.length > 3 && selectedText.length < 200 && selectedText !== lastSelection) {
        // Debounce selection events - only fire after 500ms of no changes
        if (selectionTimeout) clearTimeout(selectionTimeout);
        selectionTimeout = setTimeout(() => {
          lastSelection = selectedText;
          sendEvent({
            type: 'text_selection',
            elementText: selectedText.slice(0, 100),
          });
        }, 500);
      }
    };

    // Copy handler
    const handleCopy = () => {
      const selection = window.getSelection();
      const copiedText = selection?.toString().trim();
      if (copiedText) {
        sendEvent({
          type: 'text_copy',
          elementText: copiedText.slice(0, 100),
        });
      }
    };

    // Tab visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        sendEvent({ type: 'tab_hidden' });
      } else {
        sendEvent({ type: 'tab_visible' });
      }
    };

    // Double click handler - especially important on buttons (indicates no feedback)
    const handleDoubleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const buttonEl = target.closest('button, [role="button"], input[type="submit"], .btn, [data-cta]') as HTMLElement || target;
      const isButton = target.matches('button, [role="button"], input[type="submit"], .btn, [data-cta]') ||
                       target.closest('button, [role="button"], input[type="submit"], .btn, [data-cta]') !== null;

      const elemContext = getElementContext(isButton ? buttonEl : target);

      sendEvent({
        type: 'double_click',
        x: e.clientX,
        y: e.clientY,
        elementSelector: getSelector(target),
        elementText: target.textContent?.slice(0, 100)?.trim(),
        elementContext: elemContext,
        pageContext: getPageContext(pageEntryTime.current),
        frustrationReason: isButton ? describeFrustration('double_click', buttonEl, elemContext) : undefined,
      });

      // Double-click on button = user unsure if click registered (missing loading state)
      if (isButton) {
        console.log('⚠️ [Double-click on button] User may be unsure if click registered - consider adding loading state');
      }
    };

    // Right click / context menu handler
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      sendEvent({
        type: 'right_click',
        x: e.clientX,
        y: e.clientY,
        elementSelector: getSelector(target),
        elementText: target.textContent?.slice(0, 100)?.trim(),
      });
    };

    // Form focus handler - track start time
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.matches('input, textarea, select')) {
        const selector = getSelector(target);
        const fullPath = getFullPath(target);
        const indexedMatch = matchToIndexedElement(target, fullPath);

        formFieldStartTime.current.set(selector, Date.now());

        // Detect if this is a checkout form
        const isCheckoutField = target.closest('[data-checkout], .checkout, form') !== null;
        if (isCheckoutField && !checkoutStarted.current) {
          checkoutStarted.current = true;
          sendEvent({ type: 'checkout_start' });
        }

        const placeholder = (target as HTMLInputElement).placeholder;

        sendEvent({
          type: 'form_focus',
          elementSelector: selector,
          elementText: placeholder || target.getAttribute('name') || undefined,
          elementId: indexedMatch?.id,
          elementPlaceholder: placeholder || undefined,
        });

        if (indexedMatch) {
          console.log(`✏️ [Form Focus] ${indexedMatch.id} → ${indexedMatch.componentName}`);
        }
      }
    };

    // Form blur handler - detect slow fills and empty abandonment
    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.matches('input, textarea, select')) {
        const selector = getSelector(target);
        const fullPath = getFullPath(target);
        const indexedMatch = matchToIndexedElement(target, fullPath);
        const value = (target as HTMLInputElement).value;
        const placeholder = (target as HTMLInputElement).placeholder;
        const startTime = formFieldStartTime.current.get(selector);

        // Calculate time spent on field
        let timeSpent = 0;
        if (startTime) {
          timeSpent = Date.now() - startTime;
          formFieldStartTime.current.delete(selector);

          // Detect slow form fill (user struggling)
          if (timeSpent > SLOW_FORM_THRESHOLD && value.length > 0) {
            sendEvent({
              type: 'slow_form_fill',
              elementSelector: selector,
              elementText: `Took ${Math.round(timeSpent / 1000)}s to fill`,
              elementId: indexedMatch?.id,
              elementPlaceholder: placeholder || undefined,
            });
          }
        }

        sendEvent({
          type: 'form_blur',
          elementSelector: selector,
          elementText: value ? `[filled: ${value.length} chars, ${Math.round(timeSpent / 1000)}s]` : '[empty]',
          elementId: indexedMatch?.id,
          elementPlaceholder: placeholder || undefined,
        });
      }
    };

    // Keyboard shortcut detection
    const handleKeyDown = (e: KeyboardEvent) => {
      // Detect common shortcuts
      if (e.metaKey || e.ctrlKey) {
        const shortcuts: Record<string, string> = {
          'f': 'find',
          'p': 'print',
          's': 'save',
          'c': 'copy',
          'v': 'paste',
          'a': 'select_all',
        };
        const action = shortcuts[e.key.toLowerCase()];
        if (action) {
          sendEvent({
            type: 'keyboard_shortcut',
            elementText: `${e.metaKey ? 'Cmd' : 'Ctrl'}+${e.key.toUpperCase()} (${action})`,
          });
        }
      }
    };

    // Add event listeners
    document.addEventListener('click', handleClick);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('beforeunload', handleBeforeUnload);

    // New event listeners
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('dblclick', handleDoubleClick);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', handleBeforeUnload);

      // New event listeners cleanup
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('dblclick', handleDoubleClick);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      document.removeEventListener('keydown', handleKeyDown);

      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
      if (selectionTimeout) clearTimeout(selectionTimeout);
      if (flushTimeout) clearTimeout(flushTimeout);
      flushEvents(); // Flush remaining events on unmount
    };
  }, [sendEvent]);

  return <>{children}</>;
}
