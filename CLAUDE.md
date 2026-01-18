# CLAUDE.md - Blip Ship Architecture Documentation

> **Last Updated:** 2026-01-17
> **Purpose:** Architectural reference for future Claude sessions and new developers

This document provides a comprehensive technical overview of the Blip Ship CRO Agent system, focusing on implementation details, design decisions, and the complete fix approval workflow.

---

## Table of Contents

1. [CRO Fix Flow Architecture](#cro-fix-flow-architecture)
2. [Component Reference](#component-reference)
3. [Environment Configuration](#environment-configuration)
4. [Roadblocks & Solutions](#roadblocks--solutions)
5. [Testing & Debugging](#testing--debugging)
6. [Future Enhancements](#future-enhancements)

---

## CRO Fix Flow Architecture

### Overview

The CRO Fix Flow is an end-to-end automated system that detects website optimization opportunities, generates fixes, creates pull requests, and sends approval emails to store owners. The flow enables non-technical users to approve website changes via email without touching code.

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. TRIGGER: POST /api/trigger-fix-flow                             │
│     - Manual invocation or scheduled analysis                       │
│     - Loads site config (ownerEmail, storeName)                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. SUGGEST: POST /api/suggest-fix                                  │
│     - STUB: Returns mock suggestions based on common CRO issues     │
│     - Production: Would use AI to analyze analytics data            │
│     - Output: Suggestion object with previewConfig                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. PROCESS: lib/fix-agent.ts::processFixSuggestion()              │
│     - STUB: Converts suggestion to MinimalFix structure             │
│     - Production: AI agent would generate optimal diffs             │
│     - Output: MinimalFix with configChanges and affectedFiles       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. CREATE PR: lib/git-service.ts::createFixPR()                   │
│     a. Create branch: fix/cro-YYYYMMDD-{shortId}                   │
│     b. Apply config changes to data/config-live.json                │
│     c. Commit with detailed message (Fix ID, changes, impact)      │
│     d. Push to origin                                               │
│     e. Create GitHub PR via gh CLI (if available)                  │
│     - Output: PRInfo with branch name, title, url                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  5. STORE: lib/fix-store.ts::saveFix()                             │
│     - Persist to data/fixes.json                                    │
│     - Status: pending                                               │
│     - Associates suggestion + fix + prInfo                          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  6. SCREENSHOT: lib/screenshot-service.ts                           │
│     a. Launch Playwright browser (headless Chrome)                  │
│     b. Capture /store (current)                                     │
│     c. Capture /store?preview=true&fixId={id} (with fix)           │
│     d. Each screenshot: 600x400px PNG                               │
│     - Output: Base64-encoded PNG buffers                            │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  7. UPLOAD: lib/cloudinary-service.ts::uploadToCloudinary()        │
│     - Upload both screenshots to Cloudinary                         │
│     - Folder: blip-ship-screenshots                                 │
│     - PublicId: {suggestionId}-{current|preview}-{timestamp}        │
│     - Apply optimizations: w_600, q_80, f_auto                     │
│     - Output: HTTPS URLs (avoids Gmail 102KB clipping)             │
│     - Fallback: If Cloudinary unavailable, use base64 embed         │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  8. EMAIL: lib/email-service.ts::sendFixApprovalEmail()            │
│     - Via SendGrid API                                              │
│     - HTML email with side-by-side screenshot comparison            │
│     - Approval buttons: /fix/{id}?action=approve|reject             │
│     - Expiry: 7 days                                                │
│     - Tracking: click & open tracking enabled                       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  9. USER ACTION: Store owner clicks button in email                │
│     - Opens: /fix/{id}?action=approve OR /fix/{id}?action=reject   │
│     - Page: app/fix/[fixId]/page.tsx                               │
│     - Shows visual diff, changes, rationale                         │
│     - Client component handles action via API                       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                   ┌─────────┴─────────┐
                   ▼                   ▼
         ┌──────────────────┐  ┌──────────────────┐
         │ 10a. APPROVE     │  │ 10b. REJECT      │
         │ /api/fix/[id]/   │  │ /api/fix/[id]/   │
         │ approve          │  │ reject           │
         ├──────────────────┤  ├──────────────────┤
         │ • Merge PR       │  │ • Close PR       │
         │ • Update status  │  │ • Delete branch  │
         │   to 'merged'    │  │ • Update status  │
         │                  │  │   to 'rejected'  │
         └──────────────────┘  └──────────────────┘
```

### Data Flow

#### 1. Suggestion Object
```typescript
// Generated by /api/suggest-fix
{
  id: "fix_1234567890_abc123",
  createdAt: 1705507200000,
  status: "pending",
  analysis: {
    summary: "Detected issue: Low CTA visibility",
    insights: [...],
    dataPoints: [
      { metric: "CTA Click Rate", value: 2.3, interpretation: "..." }
    ]
  },
  recommendation: {
    summary: "...",
    rationale: "...",
    expectedImpact: "+15-25% CTA click rate"
  },
  changes: [
    {
      field: "hero.cta.text",
      oldValue: "Shop Now",
      newValue: "Shop Now - Free Shipping",
      reason: "..."
    }
  ],
  previewConfig: SiteConfig // Modified config with changes applied
}
```

#### 2. MinimalFix Object
```typescript
// Generated by lib/fix-agent.ts
{
  id: "minfix_1234567890_xyz",
  suggestionId: "fix_1234567890_abc123",
  createdAt: 1705507200000,
  status: "pending",
  configChanges: [
    {
      path: "hero.cta.text",
      oldValue: "Shop Now",
      newValue: "Shop Now - Free Shipping"
    }
  ],
  affectedFiles: [
    {
      path: "data/config-live.json",
      changeType: "modify",
      diff: "--- a/data/config-live.json\n+++ b/data/config-live.json\n..."
    }
  ],
  metadata: {
    estimatedImpact: "+15-25% CTA click rate",
    rollbackPlan: "Revert config-live.json to previous version via git",
    testingNotes: "Verify hero section renders correctly with new config"
  }
}
```

#### 3. StoredFix Object
```typescript
// Persisted to data/fixes.json
{
  id: "fix_1234567890_abc123", // Same as suggestion.id
  suggestion: Suggestion,
  fix: MinimalFix,
  prInfo: {
    id: "pr_1234567890_xyz",
    number: 42,
    branchName: "fix/cro-20260117-abc12345",
    title: "🔧 CRO Fix: Low CTA visibility",
    description: "...",
    status: "open",
    url: "https://github.com/user/repo/pull/42",
    fixId: "minfix_1234567890_xyz",
    suggestionId: "fix_1234567890_abc123"
  },
  status: "pending" | "approved" | "rejected" | "merged",
  createdAt: 1705507200000,
  updatedAt: 1705507200000
}
```

---

## Component Reference

### Backend Services

#### `/lib/email-service.ts`
**Purpose:** SendGrid integration for approval emails

**Key Functions:**
- `sendFixApprovalEmail(email: FixApprovalEmail)`: Sends email via SendGrid
- `buildFixApprovalEmail(...)`: Builds complete email payload with screenshots
- `generateScreenshots(suggestion, baseUrl)`: Orchestrates screenshot capture + upload
- `generateEmailHtml(email)`: Generates responsive HTML email template
- `isSendGridConfigured()`: Checks if API key is configured

**Email Structure:**
- Header: Dark gradient with "CRO Fix Suggestion" title
- Summary: Issue description + expected impact badge
- Visual Comparison: Side-by-side screenshots (current vs. proposed)
- Changes Section: Field-by-field diff display
- Rationale: Why this change matters
- Action Buttons: Green "Approve & Deploy", Red "Reject"
- Footer: Expiration date, Fix ID

**Gmail Compatibility:**
- Uses Cloudinary URLs instead of base64 embedding
- Keeps email size under 102KB to avoid clipping
- Fallback to embedded images if Cloudinary unavailable
- Plain text alternative for email clients without HTML support

#### `/lib/screenshot-service.ts`
**Purpose:** Playwright-based screenshot capture

**Key Functions:**
- `captureFixScreenshots(baseUrl, suggestionId, options)`: Captures before/after screenshots
- `captureAndUploadScreenshots(...)`: Captures and uploads to Cloudinary
- `isScreenshotServiceAvailable()`: Checks if Playwright is working

**Implementation Details:**
- Browser: Chromium (headless mode)
- Viewport: Configurable (default 1200x800, email uses 600x400)
- Wait strategy: `networkidle` + optional selector wait + 1.5s delay
- Screenshot format: PNG (best quality for comparison)
- Browser pooling: Single shared browser instance for efficiency

**Fallback Behavior:**
- If Playwright unavailable: Returns store URLs instead of screenshots
- If capture fails: Gracefully degrades to links in email

#### `/lib/cloudinary-service.ts`
**Purpose:** Image hosting to avoid email size limits

**Key Functions:**
- `uploadToCloudinary(buffer, options)`: Upload PNG buffer to Cloudinary
- `getOptimizedUrl(url, options)`: Apply transformations (resize, compress)
- `isCloudinaryConfigured()`: Environment variable check

**Upload Configuration:**
- Folder: `blip-ship-screenshots`
- PublicId format: `{suggestionId}-{current|preview}-{timestamp}`
- Signature: SHA1 HMAC for authenticated uploads
- Auto-cleanup: Not implemented (consider Cloudinary auto-expiry policies)

**Transformations:**
- Width: 600px (email-optimized)
- Quality: 80 (balances quality vs. size)
- Format: `f_auto` (WebP for modern browsers, fallback to PNG)

**Why Cloudinary?**
Gmail clips emails larger than 102KB. Base64-embedded screenshots were ~250KB each (500KB total), causing the email body and approve/reject buttons to be hidden. Cloudinary reduces email size to ~5KB by using `<img src="https://...">` instead of `<img src="data:image/png;base64,...">`.

#### `/lib/fix-agent.ts`
**Purpose:** Minimal fix generation (STUB)

**Current Implementation:**
- STUB: Converts suggestion changes to MinimalFix format
- Simulates 100ms processing delay
- Generates unified diff format for config-live.json

**Production Implementation Would:**
1. Use AI (Claude API) to analyze suggestion
2. Determine minimal set of changes needed
3. Generate proper diffs for all affected files
4. Validate changes against codebase structure
5. Include rollback plan and testing instructions

**Key Functions:**
- `processFixSuggestion(suggestion)`: Main entry point
- `validateFix(fix)`: Security checks (path traversal, etc.)

#### `/lib/fix-store.ts`
**Purpose:** File-based persistence for fixes

**Storage Location:** `/data/fixes.json`

**Key Functions:**
- `saveFix(suggestion, fix, prInfo)`: Create new stored fix
- `getFix(id)`: Retrieve by ID
- `updateFixStatus(id, status, prInfo)`: Update status after approval/rejection
- `getAllFixes()`: List all fixes
- `getPendingFixes()`: Filter by status

**Design Notes:**
- Uses Map for in-memory caching
- File writes are synchronous (persists on every change)
- IDs are keyed by suggestion.id (not fix.id)
- For production: Consider SQLite, PostgreSQL, or Redis

#### `/lib/git-service.ts`
**Purpose:** Git operations and PR management

**Key Functions:**
- `createFixPR(suggestion, fix)`: Complete PR creation flow
  1. `createFixBranch()`: Create branch from origin/main
  2. `applyAndCommitChanges()`: Apply config changes and commit
  3. `pushBranch()`: Push to remote
  4. `createPullRequest()`: Create PR via gh CLI
- `mergePullRequest(suggestionId)`: Squash merge and delete branch
- `closePullRequest(suggestionId)`: Close without merging

**Branch Naming:**
```
fix/cro-{YYYYMMDD}-{8-char-suggestion-id}
Example: fix/cro-20260117-abc12345
```

**Commit Message Format:**
```
fix(cro): {Summary from analysis}

Automated CRO optimization fix.

Changes:
- hero.cta.text: "Shop Now" → "Shop Now - Free Shipping"
- hero.cta.color: "#3B82F6" → "#10B981"

Expected Impact: +15-25% CTA click rate

Fix ID: minfix_1234567890_xyz
Suggestion ID: fix_1234567890_abc123

Co-Authored-By: CRO Agent <cro-agent@blip.ship>
```

**PR Creation:**
- Uses `gh` CLI if available
- Fallback: Stores PR info locally, returns compare URL
- Title: `🔧 CRO Fix: {Summary}`
- Auto-includes: Summary, expected impact, changes, rationale

**Merge Strategy:**
- Squash merge (keeps main history clean)
- Deletes branch after merge
- Returns to original branch after operation

### API Routes

#### `POST /api/trigger-fix-flow`
**Purpose:** Main orchestration endpoint

**Request Body:**
```typescript
{
  forceIndex?: number;  // Force specific suggestion (0-2) for testing
  skipPR?: boolean;     // Skip PR creation
  skipEmail?: boolean;  // Skip email sending
}
```

**Response:**
```typescript
{
  success: true,
  duration: 5432, // ms
  logs: ["[0ms] Starting fix suggestion flow", ...],
  config: {
    ownerEmail: "owner@example.com",
    storeName: "Acme Store",
    sendGridConfigured: true
  },
  result: {
    suggestionId: "fix_1234567890_abc123",
    fixId: "minfix_1234567890_xyz",
    summary: "Detected issue: Low CTA visibility",
    expectedImpact: "+15-25% CTA click rate",
    changes: 2,
    approvalUrl: "https://example.com/fix/fix_1234567890_abc123",
    prUrl: "https://github.com/user/repo/pull/42",
    emailSent: true,
    emailPreviewUrl: "/api/email-preview/fix_1234567890_abc123"
  },
  nextSteps: [...]
}
```

**Error Handling:**
- Missing `ownerEmail` in config: Returns 500 with error
- PR creation failure: Logs warning, continues flow
- Email failure: Logs error, still returns success if fix was saved

#### `POST /api/suggest-fix`
**Purpose:** Generate fix suggestions (STUB)

**Current Implementation:**
- Returns one of 3 mock suggestions randomly (or via `forceIndex`)
- Suggestions:
  0. Low CTA visibility → Larger button with urgency copy
  1. Weak headline engagement → Social proof headline
  2. Hero contrast issues → Better color contrast

**Production Implementation Would:**
1. Receive analytics data from request body
2. Call AI service (Claude API) to analyze patterns
3. Generate data-driven suggestion based on actual user behavior
4. Return suggestion with preview config

#### `GET /api/fix/[fixId]`
**Purpose:** Retrieve stored fix by ID

**Response:**
```typescript
{
  suggestion: Suggestion,
  fix: MinimalFix,
  prInfo?: PRInfo,
  status: "pending" | "approved" | "rejected" | "merged"
}
```

#### `POST /api/fix/[fixId]/approve`
**Purpose:** Approve fix and merge PR

**Flow:**
1. Validate fix exists and status is "pending"
2. Call `mergePullRequest()` via git-service
3. Update fix status to "merged"
4. Return success response

**Error Cases:**
- Fix not found: 404
- Fix already processed: 400
- Merge failure: 500 with error message

#### `POST /api/fix/[fixId]/reject`
**Purpose:** Reject fix and close PR

**Request Body (optional):**
```typescript
{
  reason?: string; // Rejection reason for logging
}
```

**Flow:**
1. Validate fix exists and status is "pending"
2. Call `closePullRequest()` via git-service
3. Update fix status to "rejected"
4. Return success response (even if PR close fails)

**Error Cases:**
- Fix not found: 404
- Fix already processed: 400

### Frontend Components

#### `/app/fix/[fixId]/page.tsx`
**Purpose:** Fix approval landing page

**Features:**
- Server-rendered page with dynamic route
- Suspense boundary for loading state
- Reads `action` query param for auto-approve/reject from email

**Layout:**
- Header: Fix Review title + Back to Dashboard button
- Content: Suspense-wrapped `FixApprovalContent`

#### `/components/fix/FixApprovalContent.tsx`
**Purpose:** Client-side fix approval UI

**State Management:**
- Fetches fix data on mount via `/api/fix/[fixId]`
- Handles approve/reject actions via API calls
- Shows loading, error, and success states

**UI Sections:**
1. **Action Result Banner:** Green for success, red for error
2. **Status Badge:** Color-coded by status (pending/approved/rejected/merged)
3. **Summary Card:** Analysis summary + data points + expected impact
4. **Visual Comparison:** Side-by-side iframes showing current vs. preview store
5. **Changes Detail:** Field-by-field diff with old/new values
6. **Rationale:** Why this change matters
7. **PR Info:** Branch name, status, GitHub link (if available)
8. **Action Buttons:** Approve & Merge (green) / Reject (red)

**Auto-Action from Email:**
- Reads `initialAction` prop from URL query param
- Automatically triggers approve/reject on page load
- Shows result banner after action completes

**UX Details:**
- Disabled buttons while action is loading
- Spinner animation during processing
- Buttons hidden after successful action
- Responsive grid layout (mobile-friendly)

---

## Environment Configuration

### Required Environment Variables

Create a `.env.local` file in the project root:

```bash
# SendGrid Configuration
# Get API key: https://app.sendgrid.com/settings/api_keys
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx

# Sender email (must be verified in SendGrid)
# Verify at: https://app.sendgrid.com/settings/sender_auth
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Sender name
SENDGRID_FROM_NAME=Blip Ship CRO Agent

# Cloudinary Configuration (required for Gmail compatibility)
# Get credentials: https://cloudinary.com/console
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Configuration Validation

The system gracefully degrades if services are unavailable:

| Service | Required? | Fallback Behavior |
|---------|-----------|-------------------|
| SendGrid | No | Logs email to console, creates preview URL |
| Cloudinary | No | Embeds screenshots as base64 (may clip in Gmail) |
| Playwright | No | Shows store links instead of screenshots |
| GitHub CLI (`gh`) | No | Stores PR info locally, returns compare URL |

### Site Configuration

Edit `/data/config-live.json` to set owner email:

```json
{
  "storeName": "Acme Store",
  "ownerEmail": "owner@example.com",
  "hero": { ... }
}
```

**Critical:** The `ownerEmail` field is required for the fix flow to work. The email approval will be sent to this address.

---

## Roadblocks & Solutions

### 1. Gmail Email Clipping (102KB Limit)

**Problem:**
When sending fix approval emails with embedded base64 screenshots, Gmail displayed `[Message clipped] View entire message` at the bottom. This hid critical content including the approve/deny buttons, making the email unusable.

**Root Cause:**
Gmail clips emails larger than 102KB (after MIME encoding). Our base64-embedded PNG screenshots were approximately:
- Current screenshot: ~250KB
- Preview screenshot: ~250KB
- **Total email size: ~500KB** (5x the limit)

**Solution:**
Host screenshots on Cloudinary instead of embedding them.

**Implementation:**
1. Added `/lib/cloudinary-service.ts` - uploads PNG buffers to Cloudinary
2. Updated `/lib/screenshot-service.ts` - added `captureAndUploadScreenshots()` function
3. Updated `/lib/email-service.ts` - uses Cloudinary URLs in email HTML

**Email Size Comparison:**
| Method | Email Size | Gmail Behavior |
|--------|-----------|----------------|
| Base64 embedded | ~500KB | Clipped, buttons hidden |
| Cloudinary URLs | ~5KB | Fully displayed |

**Code Example:**
```typescript
// Before (embedded):
<img src="data:image/png;base64,iVBORw0KGgoAAAANS..." />

// After (hosted):
<img src="https://res.cloudinary.com/cloud/image/upload/w_600,q_80,f_auto/v123/folder/screenshot.png" />
```

**Required Environment Variables:**
```bash
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Get credentials from [Cloudinary Console](https://cloudinary.com/console).

**Fallback Behavior:**
- If Cloudinary is configured: Uses hosted URLs (~5KB email, no clipping)
- If Cloudinary is NOT configured: Falls back to embedded base64 (may clip in Gmail)
- If Playwright unavailable: Shows links instead of images

**Additional Gmail Considerations:**
- Gmail requires users to click "Display images below" to see external images
- This is standard Gmail security behavior, not a bug
- Images are cached after first load
- Plain text email fallback provided for accessibility

### 2. Playwright Browser Installation

**Problem:**
Playwright requires browser binaries to be installed. In some environments (CI/CD, Docker), these may not be available.

**Solution:**
Install Playwright browsers during deployment:

```bash
# Local development
npx playwright install chromium

# Docker (add to Dockerfile)
RUN npx playwright install --with-deps chromium
```

**Graceful Degradation:**
The `isScreenshotServiceAvailable()` function checks if Playwright works. If not, the email includes store links instead of screenshots.

### 3. GitHub CLI Authentication

**Problem:**
Creating PRs requires GitHub CLI (`gh`) to be installed and authenticated.

**Solution:**
```bash
# Install gh CLI
brew install gh  # macOS
# or: https://cli.github.com/manual/installation

# Authenticate
gh auth login
```

**Fallback Behavior:**
If `gh` is unavailable, the system:
1. Stores PR info locally in memory
2. Returns a GitHub compare URL instead of PR URL
3. Continues the flow without failing

### 4. Git Branch Conflicts

**Problem:**
If a fix branch already exists, `git checkout -b` fails.

**Current Handling:**
Branch names include timestamp (YYYYMMDD) and short suggestion ID, making collisions unlikely.

**Future Enhancement:**
Add branch existence check and auto-increment suffix if needed:
```typescript
let branchName = `fix/cro-${timestamp}-${shortId}`;
let suffix = 1;
while (await branchExists(branchName)) {
  branchName = `fix/cro-${timestamp}-${shortId}-${suffix++}`;
}
```

---

## Testing & Debugging

### Manual Testing Flow

1. **Trigger the flow:**
```bash
curl -X POST http://localhost:3000/api/trigger-fix-flow \
  -H "Content-Type: application/json" \
  -d '{}'
```

2. **Force specific suggestion:**
```bash
curl -X POST http://localhost:3000/api/trigger-fix-flow \
  -H "Content-Type: application/json" \
  -d '{"forceIndex": 0}'  # 0, 1, or 2
```

3. **Skip PR/email for faster testing:**
```bash
curl -X POST http://localhost:3000/api/trigger-fix-flow \
  -H "Content-Type: application/json" \
  -d '{"skipPR": true, "skipEmail": true}'
```

4. **Check email preview:**
Visit the `emailPreviewUrl` from the response (usually `/api/email-preview/{fixId}`)

5. **Test approval flow:**
Visit the `approvalUrl` from the response and click "Approve & Merge"

### Debugging Tips

**Check SendGrid delivery:**
```bash
# View SendGrid activity
https://app.sendgrid.com/email_activity
```

**Check Cloudinary uploads:**
```bash
# View Cloudinary media library
https://cloudinary.com/console/media_library
```

**Check PR status:**
```bash
gh pr list
gh pr view 42  # Replace with PR number
```

**Check fix storage:**
```bash
cat data/fixes.json | jq .
```

**View browser screenshots locally:**
Add this to screenshot-service.ts for debugging:
```typescript
// Save to file instead of returning base64
await page.screenshot({ path: 'debug-screenshot.png' });
```

### Common Issues

**Issue:** Email not sending
- **Check:** Is `SENDGRID_API_KEY` set in `.env.local`?
- **Check:** Is `ownerEmail` set in `data/config-live.json`?
- **Fix:** Set environment variables and site config

**Issue:** Screenshots not loading in email
- **Check:** Are Cloudinary credentials configured?
- **Check:** Did upload succeed? (Check console logs)
- **Fix:** Configure Cloudinary or accept base64 fallback

**Issue:** PR creation fails
- **Check:** Is `gh` CLI installed? (`gh --version`)
- **Check:** Is `gh` authenticated? (`gh auth status`)
- **Fix:** Install and authenticate gh CLI

**Issue:** Email clipped in Gmail
- **Check:** Are screenshots using Cloudinary URLs or base64?
- **Fix:** Configure Cloudinary to use hosted URLs

**Issue:** Approval page shows "Fix not found"
- **Check:** Does the fix exist in `data/fixes.json`?
- **Check:** Is the fixId correct in the URL?
- **Fix:** Run trigger-fix-flow again to create a new fix

---

## Future Enhancements

### Production Readiness

**1. Replace Stub Implementations**
- `/api/suggest-fix`: Use real AI analysis (Claude API + analytics data)
- `/lib/fix-agent.ts`: Implement AI-powered minimal fix generation
- Consider: Structured outputs, multi-file diffs, code validation

**2. Database Migration**
- Replace JSON file storage with PostgreSQL or Redis
- Add indexes on status, createdAt for efficient queries
- Implement soft deletes and audit logs

**3. Email Improvements**
- Add email templates system (Handlebars/Mustache)
- Support multiple languages (i18n)
- Add email scheduling (don't send at 3am)
- Include A/B test preview (show both variants)

**4. Screenshot Enhancements**
- Diff highlighting (visual diff with red/green overlays)
- Mobile screenshot comparison
- Capture multiple pages (not just hero)
- Video recordings of user flows

**5. PR Workflow Improvements**
- Auto-merge on approval (with configurable delay)
- Require CI checks to pass before merge
- Add PR labels (cro-fix, auto-generated)
- Include before/after screenshots in PR description

**6. Security Hardening**
- Add HMAC signature verification for approval links
- Implement link expiration (currently UI-only)
- Rate limiting on approval endpoints
- Add CSRF protection

**7. Analytics & Monitoring**
- Track approval rate by fix type
- Monitor email open/click rates
- Alert on failed merges
- Dashboard for fix history

**8. Testing**
- Unit tests for all services
- Integration tests for full flow
- E2E tests with Playwright
- Mock Cloudinary/SendGrid in tests

### Feature Ideas

**1. Rollback Support**
- One-click rollback from approval page
- Automatic rollback if metrics degrade
- Rollback history tracking

**2. Multi-Fix Batching**
- Approve multiple fixes at once
- Combined preview of all changes
- Single PR with multiple commits

**3. Scheduled Deployments**
- Approve now, deploy later
- Deploy during low-traffic windows
- Cancel scheduled deployments

**4. Collaborative Approval**
- Require multiple approvers
- Comments on fixes
- @mention team members

**5. Smart Suggestions**
- Learn from approval patterns
- Auto-approve low-risk changes
- Suggest similar fixes for other pages

---

## Quick Reference: File Locations

### Core Services
- `/lib/email-service.ts` - SendGrid integration
- `/lib/screenshot-service.ts` - Playwright screenshots
- `/lib/cloudinary-service.ts` - Image hosting
- `/lib/fix-agent.ts` - Fix generation (STUB)
- `/lib/fix-store.ts` - File-based persistence
- `/lib/git-service.ts` - Git operations & PRs

### API Routes
- `/app/api/trigger-fix-flow/route.ts` - Main orchestration
- `/app/api/suggest-fix/route.ts` - Suggestion generation (STUB)
- `/app/api/fix/[fixId]/route.ts` - Get fix by ID
- `/app/api/fix/[fixId]/approve/route.ts` - Approve & merge
- `/app/api/fix/[fixId]/reject/route.ts` - Reject & close

### Frontend
- `/app/fix/[fixId]/page.tsx` - Approval landing page
- `/components/fix/FixApprovalContent.tsx` - Approval UI

### Data Files
- `/data/fixes.json` - Stored fixes (created on first run)
- `/data/config-live.json` - Site config (includes ownerEmail)

### Configuration
- `/.env.local` - Environment variables (not committed)
- `/.env.example` - Template for environment variables

---

## Appendix: Email Template Structure

The email uses a responsive HTML table layout with the following structure:

```html
<table> <!-- Outer wrapper -->
  <tr>
    <td> <!-- Centered container -->
      <table> <!-- Inner content table (max-width: 600px) -->

        <!-- Header Section -->
        <tr>
          <td style="background: gradient; padding: 32px;">
            <h1>CRO Fix Suggestion</h1>
            <p>A new optimization has been identified for {storeName}</p>
          </td>
        </tr>

        <!-- Content Section -->
        <tr>
          <td style="background: white; padding: 32px;">

            <!-- Summary -->
            <h2>{summary}</h2>

            <!-- Expected Impact Badge -->
            <div style="background: green;">{expectedImpact}</div>

            <!-- Screenshots Section -->
            <table> <!-- 2-column layout -->
              <tr>
                <td> <!-- Current version -->
                  <img src="{currentScreenshotUrl}" />
                </td>
                <td> <!-- Proposed version -->
                  <img src="{proposedScreenshotUrl}" />
                </td>
              </tr>
            </table>

            <!-- Changes Section -->
            <div style="background: gray;">
              {changes.map(change => ...)}
            </div>

            <!-- Rationale -->
            <p>{rationale}</p>

            <!-- Action Buttons -->
            <a href="{approvalUrl}" style="button green">Approve & Deploy</a>
            <a href="{rejectionUrl}" style="button red">Reject</a>

          </td>
        </tr>

        <!-- Footer Section -->
        <tr>
          <td style="background: gray; padding: 24px;">
            <p>Expires: {expirationDate}</p>
            <p>Fix ID: {fixId}</p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
```

**Why Table Layout?**
Email clients have inconsistent CSS support. Table-based layouts work reliably across Gmail, Outlook, Apple Mail, and others.

**Mobile Responsiveness:**
- Max-width: 600px (standard email width)
- Padding scales on mobile
- Buttons stack vertically on small screens (via media queries)

---

**End of Documentation**

This document will be updated as the system evolves. When making changes, update the relevant sections and increment the "Last Updated" date.
