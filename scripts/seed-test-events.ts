/**
 * Seed test events for UI issue detection testing
 * Run with: npx ts-node scripts/seed-test-events.ts
 */

import { appendEvents } from '../lib/db';
import type { AnalyticsEvent } from '../types/events';

const now = Date.now();
const hour = 60 * 60 * 1000;

// Generate session IDs
const sessions = [
  `sess_${now - 5 * hour}_abc123`,
  `sess_${now - 4 * hour}_def456`,
  `sess_${now - 3 * hour}_ghi789`,
  `sess_${now - 2 * hour}_jkl012`,
  `sess_${now - 1 * hour}_mno345`,
  `sess_${now}_pqr678`,
];

async function seedEvents() {
  const events: Partial<AnalyticsEvent>[] = [];

  // Simulate dead clicks on product images (6 users clicking images expecting them to work)
  for (let i = 0; i < 6; i++) {
    events.push({
      id: `evt_${now - i * hour}_img${i}`,
      type: 'dead_click',
      timestamp: now - i * hour,
      sessionId: sessions[i % sessions.length],
      x: 300 + Math.random() * 50,
      y: 400 + Math.random() * 50,
      elementSelector: 'div[data-product-id] img',
      elementText: '',
      pageUrl: '/store',
      viewport: { width: 1920, height: 1080 },
    });
  }

  // Add some double clicks on images too
  for (let i = 0; i < 4; i++) {
    events.push({
      id: `evt_${now - i * hour}_dbl${i}`,
      type: 'double_click',
      timestamp: now - i * hour - 1000,
      sessionId: sessions[i % sessions.length],
      x: 310 + Math.random() * 50,
      y: 410 + Math.random() * 50,
      elementSelector: 'div[data-product-id] img',
      elementText: '',
      pageUrl: '/store',
      viewport: { width: 1920, height: 1080 },
    });
  }

  // Simulate rage clicks on a button that seems broken (4 users)
  for (let i = 0; i < 5; i++) {
    events.push({
      id: `evt_${now - i * hour}_rage${i}`,
      type: 'rage_click',
      timestamp: now - i * hour,
      sessionId: sessions[i % sessions.length],
      x: 600,
      y: 500,
      elementSelector: 'button.hero-cta',
      elementText: 'Shop Now',
      clickCount: 5,
      pageUrl: '/store',
      viewport: { width: 1920, height: 1080 },
    });
  }

  // Simulate price comparison behavior (users viewing multiple products)
  for (let i = 0; i < 20; i++) {
    events.push({
      id: `evt_${now - i * hour}_compare${i}`,
      type: 'product_compare',
      timestamp: now - (i % 10) * hour,
      sessionId: sessions[i % sessions.length],
      elementSelector: '#products',
      productId: `prod_${i % 4}`,
      productName: ['Classic Hoodie', 'Urban Tee', 'Street Joggers', 'Minimal Cap'][i % 4],
      productPrice: [89, 45, 75, 35][i % 4],
      pageUrl: '/store',
      viewport: { width: 1920, height: 1080 },
    });
  }

  // Add some price checks
  for (let i = 0; i < 15; i++) {
    events.push({
      id: `evt_${now - i * hour}_price${i}`,
      type: 'price_check',
      timestamp: now - (i % 8) * hour,
      sessionId: sessions[i % sessions.length],
      elementSelector: 'p.price',
      elementText: '$89.00',
      pageUrl: '/store',
      viewport: { width: 1920, height: 1080 },
    });
  }

  await appendEvents(events as AnalyticsEvent[]);
  console.log(`✅ Seeded ${events.length} test events`);
  console.log('\nTest the API:');
  console.log('  curl http://localhost:3000/api/ui-issues | jq');
  console.log('  curl http://localhost:3000/api/ui-issues?format=summary');
}

seedEvents().catch(console.error);
