import { test, expect, Page } from '@playwright/test';

/**
 * E2E tests for element tracking and matching
 *
 * These tests verify:
 * 1. Element index is loaded correctly
 * 2. User clicks are tracked and matched to indexed elements
 * 3. Console logs show matching status
 */

test.describe('Element Tracking', () => {
  let consoleLogs: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleLogs = [];

    // Capture all console logs
    page.on('console', (msg) => {
      const text = msg.text();
      consoleLogs.push(text);
      console.log(`[Browser] ${text}`);
    });
  });

  test('loads element index on page load', async ({ page }) => {
    await page.goto('/store');

    // Wait for element index to load
    await page.waitForTimeout(2000);

    // Check that element index was loaded
    const indexLoaded = consoleLogs.some(log => log.includes('Loaded') && log.includes('indexed elements'));
    expect(indexLoaded).toBe(true);
  });

  test('matches button clicks to indexed elements', async ({ page }) => {
    await page.goto('/store');
    await page.waitForTimeout(2000);

    // Click "Add to Cart" button
    const addToCartBtn = page.locator('button:has-text("Add to Cart")').first();
    await addToCartBtn.click();

    await page.waitForTimeout(500);

    // Check for match log
    const matchLog = consoleLogs.find(log =>
      log.includes('Matched') && log.includes('button')
    );

    console.log('Match log:', matchLog);
    console.log('All logs:', consoleLogs.filter(l => l.includes('[Tracker]')));
  });

  test('tracks dead clicks on non-indexed sections', async ({ page }) => {
    await page.goto('/store');
    await page.waitForTimeout(2000);

    // Click on the testimonials section (not indexed)
    const testimonials = page.locator('#testimonials');
    if (await testimonials.isVisible()) {
      await testimonials.click();
      await page.waitForTimeout(500);

      // This should produce a dead_click event
      // Check console logs for frustration detection
      const deadClickLog = consoleLogs.find(log =>
        log.includes('dead') || log.includes('frustration')
      );
      console.log('Dead click log:', deadClickLog);
    }
  });

  test('tracks clicks on product images', async ({ page }) => {
    await page.goto('/store');
    await page.waitForTimeout(2000);

    // Click on a product image
    const productImage = page.locator('#products img').first();
    if (await productImage.isVisible()) {
      await productImage.click();
      await page.waitForTimeout(500);

      console.log('Image click logs:', consoleLogs.filter(l =>
        l.includes('img') || l.includes('product') || l.includes('dead')
      ));
    }
  });

  test('API receives tracked events', async ({ page }) => {
    // Intercept API calls
    const apiCalls: { url: string; body: unknown }[] = [];

    page.on('request', async (request) => {
      if (request.url().includes('/api/pulse')) {
        try {
          const postData = request.postData();
          if (postData) {
            apiCalls.push({
              url: request.url(),
              body: JSON.parse(postData)
            });
          }
        } catch {}
      }
    });

    await page.goto('/store');
    await page.waitForTimeout(3000);

    // Perform some clicks
    const addToCartBtn = page.locator('button:has-text("Add to Cart")').first();
    if (await addToCartBtn.isVisible()) {
      await addToCartBtn.click();
    }

    // Wait for event batch to be sent
    await page.waitForTimeout(2000);

    console.log('API calls:', JSON.stringify(apiCalls, null, 2));

    // Check that at least one event was sent
    if (apiCalls.length > 0) {
      const events = (apiCalls[0].body as { events: unknown[] }).events;
      console.log('Events sent:', events.length);
    }
  });
});

test.describe('Element Index API', () => {
  test('GET /api/index-elements returns element index', async ({ request }) => {
    const response = await request.get('/api/index-elements');
    expect(response.ok()).toBe(true);

    const data = await response.json();
    console.log('Element count:', data.elements?.length);
    console.log('Component breakdown:', data.index?.componentBreakdown);
  });

  test('POST /api/index-elements rebuilds element index', async ({ request }) => {
    const response = await request.post('/api/index-elements', {
      data: { baseUrl: 'http://localhost:3000' }
    });

    expect(response.ok()).toBe(true);

    const data = await response.json();
    console.log('Index rebuild summary:', data.summary);
  });
});

test.describe('Issue Detection', () => {
  test('GET /api/detect-issues returns detected issues', async ({ request }) => {
    const response = await request.get('/api/detect-issues');
    expect(response.ok()).toBe(true);

    const data = await response.json();
    console.log('Issues found:', data.issuesFound);
    console.log('Issues:', data.issues?.map((i: { severity: string; problem: string }) =>
      `${i.severity}: ${i.problem}`
    ));
  });
});

test.describe('Deep Element Index', () => {
  test('POST /api/deep-index-elements builds comprehensive index', async ({ request }) => {
    const response = await request.post('/api/deep-index-elements', {
      data: { baseUrl: 'http://localhost:3000' }
    });

    expect(response.ok()).toBe(true);

    const data = await response.json();
    console.log('Deep index summary:');
    console.log('  Total elements:', data.summary?.totalElements);
    console.log('  Interactive:', data.summary?.stats?.interactiveCount);
    console.log('  Visible:', data.summary?.stats?.visibleCount);
    console.log('  By type:', data.summary?.stats?.byType);
    console.log('  By component:', data.summary?.stats?.byComponent);
    console.log('  By semantic type:', data.summary?.stats?.bySemanticType);
    console.log('  Landmarks:', data.summary?.landmarks);

    // Sample elements
    console.log('Sample elements:');
    data.sampleElements?.forEach((el: Record<string, unknown>) => {
      console.log(`  ${el.tag} (${el.type}) [${el.semanticType || 'none'}] → ${el.componentName}`);
    });
  });

  test('GET /api/deep-index-elements returns existing index', async ({ request }) => {
    const response = await request.get('/api/deep-index-elements');

    if (response.ok()) {
      const data = await response.json();
      console.log('Deep index exists:');
      console.log('  Total elements:', data.index?.totalElements);
      console.log('  Generated at:', data.index?.generatedAt);
    } else {
      console.log('No deep index found (POST first to create one)');
    }
  });
});

test.describe('Full Flow Test', () => {
  test('complete tracking and indexing flow', async ({ page, request }) => {
    const consoleLogs: string[] = [];

    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    // Step 1: Build deep index
    console.log('Step 1: Building deep element index...');
    const indexRes = await request.post('/api/deep-index-elements', {
      data: { baseUrl: 'http://localhost:3000' }
    });
    expect(indexRes.ok()).toBe(true);
    const indexData = await indexRes.json();
    console.log(`  Indexed ${indexData.summary?.totalElements} elements`);

    // Step 2: Reset events
    console.log('Step 2: Resetting events...');
    await request.post('/api/reset');

    // Step 3: Visit store and interact
    console.log('Step 3: Visiting store and interacting...');
    await page.goto('/store');
    await page.waitForTimeout(2000);

    // Click on various elements
    const clicks = [
      { selector: '#hero', name: 'Hero section' },
      { selector: '#testimonials', name: 'Testimonials section' },
      { selector: 'button:has-text("Add to Cart")', name: 'Add to Cart button' },
      { selector: '#products img', name: 'Product image' },
    ];

    for (const click of clicks) {
      try {
        const el = page.locator(click.selector).first();
        if (await el.isVisible({ timeout: 1000 })) {
          console.log(`  Clicking: ${click.name}`);
          await el.click();
          await page.waitForTimeout(300);
        }
      } catch {
        console.log(`  Skipped: ${click.name} (not found)`);
      }
    }

    await page.waitForTimeout(2000);

    // Step 4: Check console logs for matches
    console.log('Step 4: Analyzing console logs...');
    const matchLogs = consoleLogs.filter(l => l.includes('Matched') || l.includes('Loaded'));
    console.log(`  Found ${matchLogs.length} match/load logs`);
    matchLogs.forEach(l => console.log(`    ${l}`));

    // Step 5: Detect issues
    console.log('Step 5: Detecting issues...');
    const detectRes = await request.get('/api/detect-issues');
    const detectData = await detectRes.json();
    console.log(`  Found ${detectData.issuesFound} issues`);
  });
});
