# CRO Fix Flow - Quick Reference

> For complete documentation, see [CLAUDE.md](../CLAUDE.md) in the project root.

## What is the CRO Fix Flow?

An automated system that:
1. Detects website optimization opportunities
2. Generates code fixes
3. Creates pull requests
4. Sends approval emails with visual comparisons
5. Merges changes on approval

## Quick Start

### 1. Configure Environment

Set up `.env.local`:
```bash
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret
```

Set owner email in `data/config-live.json`:
```json
{
  "ownerEmail": "owner@example.com",
  "storeName": "Acme Store"
}
```

### 2. Trigger the Flow

```bash
curl -X POST http://localhost:3000/api/trigger-fix-flow \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 3. Check Your Email

Look for email from "Blip Ship CRO Agent" with:
- Side-by-side screenshots (current vs. proposed)
- "Approve & Deploy" and "Reject" buttons

### 4. Approve or Reject

Click a button in the email to:
- **Approve:** Merges PR to main, deploys changes
- **Reject:** Closes PR without merging

## Architecture Overview

```
POST /api/trigger-fix-flow
  ↓
Fetch suggestion → Process with agent → Create PR
  ↓
Capture screenshots → Upload to Cloudinary
  ↓
Send email via SendGrid → User approves/rejects
  ↓
Merge PR or close PR
```

## Key Files

### Services
- `lib/email-service.ts` - SendGrid integration
- `lib/screenshot-service.ts` - Playwright screenshots
- `lib/cloudinary-service.ts` - Image hosting
- `lib/git-service.ts` - PR creation/merging
- `lib/fix-store.ts` - Fix persistence

### API Routes
- `app/api/trigger-fix-flow/route.ts` - Main orchestrator
- `app/api/fix/[fixId]/approve/route.ts` - Approval handler
- `app/api/fix/[fixId]/reject/route.ts` - Rejection handler

### Frontend
- `app/fix/[fixId]/page.tsx` - Approval UI
- `components/fix/FixApprovalContent.tsx` - Interactive approval form

## Common Issues

### Email not sending
- Check `SENDGRID_API_KEY` is set
- Check `ownerEmail` in `data/config-live.json`
- If in dev mode: Email is simulated (check console)

### Email clipped in Gmail
- Check Cloudinary is configured
- Without Cloudinary: Base64 screenshots may exceed 102KB limit
- Solution: Add Cloudinary credentials

### Screenshots not captured
- Playwright may not be installed: `npx playwright install chromium`
- In production: May need `--with-deps` flag

### PR creation fails
- Install GitHub CLI: `brew install gh`
- Authenticate: `gh auth login`
- Or: System will store PR info locally

## Testing Options

### Skip PR creation (faster testing)
```bash
curl -X POST http://localhost:3000/api/trigger-fix-flow \
  -d '{"skipPR": true}'
```

### Skip email sending
```bash
curl -X POST http://localhost:3000/api/trigger-fix-flow \
  -d '{"skipEmail": true}'
```

### Force specific suggestion (0, 1, or 2)
```bash
curl -X POST http://localhost:3000/api/trigger-fix-flow \
  -d '{"forceIndex": 0}'
```

## Email Preview

Even without SendGrid, you can preview emails:

1. Run the flow (email will be simulated)
2. Visit the `emailPreviewUrl` from the response
3. Example: `http://localhost:3000/api/email-preview/fix_1234567890_abc123`

## Next Steps

- Read [CLAUDE.md](../CLAUDE.md) for complete architectural details
- See [../README.md](../README.md) for project overview
- Check `.env.example` for configuration template
