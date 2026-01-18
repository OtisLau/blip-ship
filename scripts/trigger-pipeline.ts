/**
 * Trigger the full UX fix pipeline for testing
 *
 * This script:
 * 1. Clears existing events
 * 2. Sends simulated dead click events
 * 3. Triggers issue detection
 * 4. Watches for LLM-generated fixes
 *
 * Run with: npx tsx scripts/trigger-pipeline.ts
 */

const BASE_URL = 'http://localhost:3000';

interface SimulatedEvent {
  id: string;
  type: string;
  timestamp: number;
  sessionId: string;
  elementSelector: string;
  elementText?: string;
  productId?: string;
  productName?: string;
  pageUrl: string;
  viewport: { width: number; height: number };
  x?: number;
  y?: number;
}

async function clearEvents() {
  console.log('🧹 Clearing existing events and fixes...');
  try {
    const res = await fetch(`${BASE_URL}/api/events`, { method: 'DELETE' });
    const data = await res.json();
    console.log(`   Reverted ${data.revertedFiles?.length || 0} files`);
  } catch (err) {
    console.log('   (No events to clear or server not running)');
  }
}

function generateDeadClickEvents(count: number): SimulatedEvent[] {
  const events: SimulatedEvent[] = [];
  const sessionId = `session_${Date.now()}`;

  for (let i = 0; i < count; i++) {
    // Rapid dead clicks on product image (triggers the fix)
    events.push({
      id: `evt_${Date.now()}_${i}`,
      type: 'dead_click',
      timestamp: Date.now() + (i * 100), // 100ms apart = rapid clicks
      sessionId,
      elementSelector: 'img[data-product-id="prod_001"]',
      elementText: '',
      productId: 'prod_001',
      productName: 'Classic White Tee',
      pageUrl: '/store',
      viewport: { width: 1920, height: 1080 },
      x: 400 + Math.random() * 50,
      y: 300 + Math.random() * 50,
    });
  }

  // Add some variety - different products
  events.push({
    id: `evt_${Date.now()}_extra1`,
    type: 'dead_click',
    timestamp: Date.now() + 500,
    sessionId: `session_${Date.now()}_2`,
    elementSelector: 'img[data-product-id="prod_002"]',
    productId: 'prod_002',
    productName: 'Black Hoodie',
    pageUrl: '/store',
    viewport: { width: 1920, height: 1080 },
  });

  return events;
}

function generateButtonNoFeedbackEvents(count: number): SimulatedEvent[] {
  const events: SimulatedEvent[] = [];
  const sessionId = `session_btn_${Date.now()}`;

  for (let i = 0; i < count; i++) {
    events.push({
      id: `evt_btn_${Date.now()}_${i}`,
      type: 'click',
      timestamp: Date.now() + (i * 200),
      sessionId,
      elementSelector: 'button[data-add-to-cart]',
      elementText: 'ADD TO CART',
      productId: 'prod_001',
      pageUrl: '/store',
      viewport: { width: 1920, height: 1080 },
    });

    // Follow-up rage click (user clicking again because no feedback)
    if (i % 2 === 0) {
      events.push({
        id: `evt_rage_${Date.now()}_${i}`,
        type: 'rage_click',
        timestamp: Date.now() + (i * 200) + 50,
        sessionId,
        elementSelector: 'button[data-add-to-cart]',
        elementText: 'ADD TO CART',
        productId: 'prod_001',
        pageUrl: '/store',
        viewport: { width: 1920, height: 1080 },
      });
    }
  }

  return events;
}

async function sendEvents(events: SimulatedEvent[]) {
  console.log(`📤 Sending ${events.length} simulated events...`);

  const res = await fetch(`${BASE_URL}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events }),
  });

  const data = await res.json();
  console.log(`   ✅ Received: ${data.received}`);
  console.log(`   Total events: ${data.totalEvents}`);
  console.log(`   Dead clicks: ${data.deadClickCount}`);
  console.log(`   Detection triggered: ${data.detectionTriggered}`);
  console.log(`   Issues detected: ${data.issuesDetected || 0}`);
  console.log(`   Pending fixes: ${data.pendingFixes}`);

  return data;
}

async function checkStatus() {
  console.log('\n📊 Checking current status...');

  const res = await fetch(`${BASE_URL}/api/events`);
  const data = await res.json();

  console.log(`   Total events: ${data.totalEvents}`);
  console.log(`   Event counts:`, data.eventCounts);
  console.log(`   Pending fixes: ${data.pendingFixes?.length || 0}`);
  console.log(`   Applied fixes: ${data.appliedFixes?.length || 0}`);

  if (data.appliedFixes?.length > 0) {
    console.log('\n   🔧 Applied fixes:');
    data.appliedFixes.forEach((fix: any, i: number) => {
      console.log(`      ${i + 1}. ${fix.id} (${fix.fixType || 'unknown'})`);
    });
  }

  return data;
}

async function checkUIIssues() {
  console.log('\n🔍 Checking detected UI issues...');

  const res = await fetch(`${BASE_URL}/api/ui-issues`);
  const data = await res.json();

  if (data.issues?.length > 0) {
    console.log(`   Found ${data.issues.length} issues:`);
    data.issues.forEach((issue: any, i: number) => {
      console.log(`   ${i + 1}. [${issue.severity}] ${issue.patternId}`);
      console.log(`      ${issue.problemStatement}`);
    });
  } else {
    console.log('   No issues detected yet');
  }

  return data;
}

async function main() {
  console.log('='.repeat(60));
  console.log('UX FIX PIPELINE TEST');
  console.log('='.repeat(60));
  console.log('\nMake sure the dev server is running: npm run dev\n');

  try {
    // Step 1: Clear existing state
    await clearEvents();

    // Step 2: Generate and send dead click events (triggers image clickability fix)
    console.log('\n--- Phase 1: Dead Click Events (Image Clickability) ---');
    const deadClickEvents = generateDeadClickEvents(15);
    await sendEvents(deadClickEvents);

    // Wait for detection
    console.log('\n⏳ Waiting 2s for detection to process...');
    await new Promise(r => setTimeout(r, 2000));

    // Step 3: Check status
    await checkStatus();
    await checkUIIssues();

    // Step 4: Send more events to trigger button feedback fix
    console.log('\n--- Phase 2: Button Feedback Events ---');
    const buttonEvents = generateButtonNoFeedbackEvents(10);
    await sendEvents(buttonEvents);

    // Wait for LLM processing
    console.log('\n⏳ Waiting 5s for LLM to process...');
    await new Promise(r => setTimeout(r, 5000));

    // Final status
    console.log('\n--- Final Status ---');
    await checkStatus();

    console.log('\n' + '='.repeat(60));
    console.log('TEST COMPLETE');
    console.log('='.repeat(60));
    console.log('\nCheck your terminal running `npm run dev` for detailed logs!');
    console.log('Look for: 🤖 [Gemini], 🔧 [Auto-Fix], ✅ [Auto-Apply]');

  } catch (err) {
    console.error('\n❌ Error:', err);
    console.log('\nMake sure the dev server is running: npm run dev');
  }
}

main();
