/**
 * Screenshot Service - Playwright-based screenshot capture
 *
 * Captures screenshots of the store in both current and preview states.
 * Can return base64-encoded images or upload to Cloudinary and return URLs.
 */

import { chromium, Browser, Page } from 'playwright';
import { uploadToCloudinary, isCloudinaryConfigured, getOptimizedUrl } from './cloudinary-service';

export interface CapturedScreenshots {
  current: string; // base64 encoded PNG
  preview: string; // base64 encoded PNG
}

export interface UploadedScreenshots {
  currentUrl: string; // Cloudinary URL
  previewUrl: string; // Cloudinary URL
  isHosted: true;
}

let browserInstance: Browser | null = null;

/**
 * Get or create a browser instance
 */
async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({
      headless: true,
    });
  }
  return browserInstance;
}

/**
 * Close the browser instance (for cleanup)
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

/**
 * Capture a screenshot of a URL and return as base64
 */
async function captureScreenshot(
  page: Page,
  url: string,
  options?: {
    width?: number;
    height?: number;
    waitForSelector?: string;
    delay?: number;
  }
): Promise<string> {
  const { width = 1200, height = 800, waitForSelector, delay = 1000 } = options || {};

  // Set viewport
  await page.setViewportSize({ width, height });

  // Navigate to the URL
  await page.goto(url, { waitUntil: 'networkidle' });

  // Wait for specific selector if provided
  if (waitForSelector) {
    await page.waitForSelector(waitForSelector, { timeout: 5000 }).catch(() => {
      console.log(`[Screenshot] Selector ${waitForSelector} not found, continuing...`);
    });
  }

  // Additional delay to ensure everything is rendered
  await page.waitForTimeout(delay);

  // Capture screenshot as base64
  const buffer = await page.screenshot({
    type: 'png',
    fullPage: false, // Only capture viewport
  });

  return buffer.toString('base64');
}

/**
 * Capture before/after screenshots for a fix suggestion
 */
export async function captureFixScreenshots(
  baseUrl: string,
  suggestionId: string,
  options?: {
    width?: number;
    height?: number;
  }
): Promise<CapturedScreenshots> {
  const { width = 1200, height = 800 } = options || {};

  console.log(`[Screenshot] Capturing screenshots for suggestion: ${suggestionId}`);
  console.log(`[Screenshot] Base URL: ${baseUrl}`);

  const browser = await getBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Capture current store
    console.log('[Screenshot] Capturing current store...');
    const currentUrl = `${baseUrl}/store`;
    const current = await captureScreenshot(page, currentUrl, {
      width,
      height,
      waitForSelector: '#hero', // Wait for hero section
      delay: 1500,
    });
    console.log(`[Screenshot] Current screenshot captured (${Math.round(current.length / 1024)}KB)`);

    // Capture preview with fix applied
    console.log('[Screenshot] Capturing preview store...');
    const previewUrl = `${baseUrl}/store?mode=preview`;
    const preview = await captureScreenshot(page, previewUrl, {
      width,
      height,
      waitForSelector: '#hero',
      delay: 1500,
    });
    console.log(`[Screenshot] Preview screenshot captured (${Math.round(preview.length / 1024)}KB)`);

    return { current, preview };
  } finally {
    await context.close();
  }
}

/**
 * Generate data URI from base64 screenshot
 */
export function toDataUri(base64: string): string {
  return `data:image/png;base64,${base64}`;
}

/**
 * Capture screenshots and upload to Cloudinary
 * Returns URLs suitable for email embedding (avoids Gmail clipping)
 */
export async function captureAndUploadScreenshots(
  baseUrl: string,
  suggestionId: string,
  options?: {
    width?: number;
    height?: number;
  }
): Promise<UploadedScreenshots | null> {
  // Check if Cloudinary is configured
  if (!isCloudinaryConfigured()) {
    console.log('[Screenshot] Cloudinary not configured, cannot upload');
    return null;
  }

  console.log(`[Screenshot] Capturing and uploading for suggestion: ${suggestionId}`);

  // First capture the screenshots
  const screenshots = await captureFixScreenshots(baseUrl, suggestionId, options);

  // Convert base64 to buffers
  const currentBuffer = Buffer.from(screenshots.current, 'base64');
  const previewBuffer = Buffer.from(screenshots.preview, 'base64');

  // Upload to Cloudinary in parallel
  const timestamp = Date.now();
  const [currentResult, previewResult] = await Promise.all([
    uploadToCloudinary(currentBuffer, {
      folder: 'blip-ship-screenshots',
      publicId: `${suggestionId}-current-${timestamp}`,
    }),
    uploadToCloudinary(previewBuffer, {
      folder: 'blip-ship-screenshots',
      publicId: `${suggestionId}-preview-${timestamp}`,
    }),
  ]);

  if (!currentResult.success || !previewResult.success) {
    console.error('[Screenshot] Upload failed:', {
      current: currentResult.error,
      preview: previewResult.error,
    });
    return null;
  }

  // Get optimized URLs (smaller, auto-format)
  const currentUrl = getOptimizedUrl(currentResult.url!, { width: 600, quality: 80 });
  const previewUrl = getOptimizedUrl(previewResult.url!, { width: 600, quality: 80 });

  console.log('[Screenshot] Successfully uploaded to Cloudinary');
  console.log('[Screenshot] Current URL:', currentUrl);
  console.log('[Screenshot] Preview URL:', previewUrl);

  return {
    currentUrl,
    previewUrl,
    isHosted: true,
  };
}

/**
 * Check if screenshot service is available
 * (Playwright may not work in all environments)
 */
export async function isScreenshotServiceAvailable(): Promise<boolean> {
  try {
    const browser = await getBrowser();
    return browser.isConnected();
  } catch (error) {
    console.error('[Screenshot] Service not available:', error);
    return false;
  }
}
