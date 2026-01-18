/**
 * GET /api/email-preview/[fixId] - Preview the email that was sent
 *
 * For POC testing - returns the HTML email content
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSentEmail } from '@/lib/email-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fixId: string }> }
) {
  const { fixId } = await params

  const email = getSentEmail(fixId)

  if (!email) {
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head><title>Email Not Found</title></head>
        <body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h1>Email Not Found</h1>
          <p>No email has been sent for fix ID: ${fixId}</p>
          <p>Try triggering the fix flow first.</p>
        </body>
      </html>
      `,
      {
        status: 404,
        headers: { 'Content-Type': 'text/html' },
      }
    )
  }

  // Generate the email HTML
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; }
    .preview-banner { background: #1F2937; color: white; padding: 12px 20px; font-size: 14px; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1F2937; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #F9FAFB; padding: 20px; }
    .screenshots { display: flex; gap: 20px; margin: 20px 0; }
    .screenshot { flex: 1; }
    .screenshot img { width: 100%; border: 1px solid #E5E7EB; border-radius: 4px; }
    .screenshot-label { font-size: 12px; color: #6B7280; margin-bottom: 8px; }
    .changes { background: white; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #E5E7EB; }
    .change-item { padding: 8px 0; border-bottom: 1px solid #E5E7EB; }
    .change-item:last-child { border-bottom: none; }
    .buttons { display: flex; gap: 12px; margin-top: 24px; }
    .btn { padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block; }
    .btn-approve { background: #10B981; color: white; }
    .btn-reject { background: #EF4444; color: white; }
    .footer { font-size: 12px; color: #9CA3AF; margin-top: 20px; }
    .meta { background: #F3F4F6; padding: 12px; border-radius: 4px; margin-top: 20px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="preview-banner">
    <strong>EMAIL PREVIEW</strong> - This is how the email would appear to ${email.to}
  </div>

  <div class="container">
    <div class="header">
      <h1>CRO Fix Suggestion</h1>
      <p>A new optimization has been identified for your store</p>
    </div>

    <div class="content">
      <h2>${email.suggestion.analysis.summary}</h2>

      <p><strong>Expected Impact:</strong> ${email.suggestion.recommendation.expectedImpact}</p>

      <div class="screenshots">
        <div class="screenshot">
          <div class="screenshot-label">CURRENT VERSION</div>
          <div style="background: #E5E7EB; padding: 40px; text-align: center; border-radius: 4px;">
            [Screenshot Placeholder]<br/>
            <small>${email.screenshots.currentScreenshotUrl}</small>
          </div>
        </div>
        <div class="screenshot">
          <div class="screenshot-label">WITH FIX APPLIED</div>
          <div style="background: #D1FAE5; padding: 40px; text-align: center; border-radius: 4px;">
            [Screenshot Placeholder]<br/>
            <small>${email.screenshots.proposedScreenshotUrl}</small>
          </div>
        </div>
      </div>

      <div class="changes">
        <h3 style="margin-top: 0;">Proposed Changes</h3>
        ${email.suggestion.changes
          .map(
            change => `
          <div class="change-item">
            <strong>${change.field}</strong><br/>
            <span style="color: #EF4444; text-decoration: line-through;">${JSON.stringify(change.oldValue)}</span>
            <span style="color: #6B7280;">→</span>
            <span style="color: #10B981;">${JSON.stringify(change.newValue)}</span>
          </div>
        `
          )
          .join('')}
      </div>

      <p><strong>Rationale:</strong> ${email.suggestion.recommendation.rationale}</p>

      <div class="buttons">
        <a href="${email.approvalUrl}" class="btn btn-approve">Approve & Deploy</a>
        <a href="${email.rejectionUrl}" class="btn btn-reject">Reject</a>
      </div>

      <div class="footer">
        <p>This link expires at ${new Date(email.expiresAt).toLocaleString()}</p>
        <p>Fix ID: ${email.fixId}</p>
      </div>

      <div class="meta">
        <strong>Email Metadata (for debugging):</strong><br/>
        To: ${email.to}<br/>
        Subject: ${email.subject}<br/>
        Created: ${new Date(email.fix.createdAt).toLocaleString()}
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  })
}
