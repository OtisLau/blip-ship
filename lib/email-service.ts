/**
 * Email Service - SendGrid Integration
 *
 * This service handles sending fix approval emails with:
 * - Screenshot of current website (embedded as base64)
 * - Side-by-side comparison with proposed fix
 * - Approval/rejection links
 *
 * Uses SendGrid for email delivery.
 * Uses Playwright for screenshot capture.
 */

import sgMail from '@sendgrid/mail';
import type { Suggestion } from '@/types';
import type { MinimalFix } from './fix-agent';
import { captureFixScreenshots, isScreenshotServiceAvailable } from './screenshot-service';

// Initialize SendGrid with API key
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@blipship.com';
const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'Blip Ship CRO Agent';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export interface ScreenshotComparison {
  currentScreenshotUrl: string;  // Can be URL or data URI
  proposedScreenshotUrl: string; // Can be URL or data URI
  diffHighlightUrl?: string;
  isEmbedded: boolean; // True if screenshots should display as images
  // CID embedding data (most reliable method per Twilio tutorial)
  currentBase64?: string;  // Raw base64 (no data: prefix) for CID attachment
  previewBase64?: string;  // Raw base64 (no data: prefix) for CID attachment
}

export interface FixApprovalEmail {
  to: string;
  subject: string;
  fixId: string;
  storeName?: string;
  suggestion: Suggestion;
  fix: MinimalFix;
  screenshots: ScreenshotComparison;
  approvalUrl: string;
  rejectionUrl: string;
  expiresAt: number;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  previewUrl?: string;
  error?: string;
}

// Store sent emails for preview/debugging
const sentEmails: Map<string, FixApprovalEmail> = new Map();

/**
 * Check if SendGrid is configured
 */
export function isSendGridConfigured(): boolean {
  return !!SENDGRID_API_KEY;
}

/**
 * Generate screenshots for comparison
 *
 * Uses Cloudinary-hosted URLs for Gmail compatibility.
 * Gmail blocks CID embedding but displays linked images after user clicks "Display images".
 */
export async function generateScreenshots(
  suggestion: Suggestion,
  baseUrl: string
): Promise<ScreenshotComparison> {
  console.log('[Screenshots] Generating for suggestion:', suggestion.id);

  // Check if screenshot service is available
  const isAvailable = await isScreenshotServiceAvailable();

  if (isAvailable) {
    try {
      console.log('[Screenshots] Capturing with Playwright...');
      const screenshots = await captureFixScreenshots(baseUrl, suggestion.id, {
        width: 600,
        height: 400,
      });

      console.log('[Screenshots] Successfully captured screenshots');

      // Check if Cloudinary is configured
      const { isCloudinaryConfigured, uploadToCloudinary, getOptimizedUrl } = await import('./cloudinary-service');

      if (isCloudinaryConfigured()) {
        console.log('[Screenshots] Uploading to Cloudinary for Gmail compatibility...');

        const currentBuffer = Buffer.from(screenshots.current, 'base64');
        const previewBuffer = Buffer.from(screenshots.preview, 'base64');
        const timestamp = Date.now();

        const [currentResult, previewResult] = await Promise.all([
          uploadToCloudinary(currentBuffer, {
            folder: 'blip-ship-screenshots',
            publicId: `${suggestion.id}-current-${timestamp}`,
          }),
          uploadToCloudinary(previewBuffer, {
            folder: 'blip-ship-screenshots',
            publicId: `${suggestion.id}-preview-${timestamp}`,
          }),
        ]);

        if (currentResult.success && previewResult.success) {
          const currentUrl = getOptimizedUrl(currentResult.url!, { width: 600, quality: 80 });
          const previewUrl = getOptimizedUrl(previewResult.url!, { width: 600, quality: 80 });

          console.log('[Screenshots] Cloudinary upload successful');
          console.log('[Screenshots] Gmail users: click "Display images below" to see them');

          return {
            currentScreenshotUrl: currentUrl,
            proposedScreenshotUrl: previewUrl,
            isEmbedded: true, // Use <img> tags, not links
          };
        }
      }

      // Fallback to base64 if Cloudinary fails
      console.log('[Screenshots] Using base64 fallback (may clip in Gmail)');
      return {
        currentScreenshotUrl: `data:image/png;base64,${screenshots.current}`,
        proposedScreenshotUrl: `data:image/png;base64,${screenshots.preview}`,
        isEmbedded: true,
      };
    } catch (error) {
      console.error('[Screenshots] Capture failed:', error);
    }
  } else {
    console.log('[Screenshots] Playwright not available');
  }

  // Fallback to URLs (no actual screenshots in email)
  return {
    currentScreenshotUrl: `${baseUrl}/store`,
    proposedScreenshotUrl: `${baseUrl}/store?preview=true&fixId=${suggestion.id}`,
    isEmbedded: false,
  };
}

/**
 * Send a fix approval email via SendGrid
 */
export async function sendFixApprovalEmail(
  email: FixApprovalEmail
): Promise<EmailResult> {
  // Always store for preview endpoint
  sentEmails.set(email.fixId, email);

  // Check if SendGrid is configured
  if (!isSendGridConfigured()) {
    console.log('[Email] SendGrid not configured, using simulation mode');
    console.log('[Email] To:', email.to);
    console.log('[Email] Subject:', email.subject);
    console.log('[Email] Approval URL:', email.approvalUrl);

    return {
      success: true,
      messageId: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      previewUrl: `/api/email-preview/${email.fixId}`,
    };
  }

  try {
    console.log('[Email] Sending via SendGrid to:', email.to);

    const htmlContent = generateEmailHtml(email);
    const textContent = generateEmailText(email);

    const msg = {
      to: email.to,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      subject: email.subject,
      text: textContent,
      html: htmlContent,
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true },
      },
    };

    const response = await sgMail.send(msg);
    const messageId = response[0]?.headers?.['x-message-id'] || `sg_${Date.now()}`;

    console.log('[Email] Sent successfully, message ID:', messageId);

    return {
      success: true,
      messageId,
      previewUrl: `/api/email-preview/${email.fixId}`,
    };
  } catch (error) {
    console.error('[Email] SendGrid error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      success: false,
      error: errorMessage,
      previewUrl: `/api/email-preview/${email.fixId}`,
    };
  }
}

/**
 * Generate the email HTML content
 */
function generateEmailHtml(email: FixApprovalEmail): string {
  const storeName = email.storeName || 'your store';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CRO Fix Suggestion</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1F2937 0%, #374151 100%); padding: 32px; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #ffffff;">
                CRO Fix Suggestion
              </h1>
              <p style="margin: 0; font-size: 14px; color: #9CA3AF;">
                A new optimization has been identified for ${storeName}
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="background-color: #ffffff; padding: 32px;">

              <!-- Summary -->
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #111827;">
                ${email.suggestion.analysis.summary}
              </h2>

              <!-- Expected Impact Badge -->
              <div style="display: inline-block; background-color: #ECFDF5; border: 1px solid #10B981; border-radius: 9999px; padding: 8px 16px; margin-bottom: 24px;">
                <span style="font-size: 14px; font-weight: 600; color: #059669;">
                  Expected Impact: ${email.suggestion.recommendation.expectedImpact}
                </span>
              </div>

              <!-- Screenshots Section -->
              <div style="margin: 24px 0;">
                <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #374151;">
                  Visual Comparison
                </h3>
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="width: 48%; vertical-align: top; padding-right: 8px;">
                      <div style="font-size: 12px; font-weight: 600; color: #6B7280; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">
                        Current Version
                      </div>
                      ${email.screenshots.isEmbedded ? `
                        <div style="border: 2px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
                          <img src="${email.screenshots.currentScreenshotUrl}" alt="Current website" style="width: 100%; height: auto; display: block;" />
                        </div>
                      ` : `
                        <div style="background-color: #F3F4F6; border: 2px solid #E5E7EB; border-radius: 8px; padding: 60px 20px; text-align: center;">
                          <a href="${email.screenshots.currentScreenshotUrl}" style="color: #3B82F6; font-size: 14px;">View Current Store</a>
                        </div>
                      `}
                    </td>
                    <td style="width: 4%;"></td>
                    <td style="width: 48%; vertical-align: top; padding-left: 8px;">
                      <div style="font-size: 12px; font-weight: 600; color: #059669; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">
                        With Fix Applied
                      </div>
                      ${email.screenshots.isEmbedded ? `
                        <div style="border: 2px solid #10B981; border-radius: 8px; overflow: hidden;">
                          <img src="${email.screenshots.proposedScreenshotUrl}" alt="Preview with fix applied" style="width: 100%; height: auto; display: block;" />
                        </div>
                      ` : `
                        <div style="background-color: #ECFDF5; border: 2px solid #10B981; border-radius: 8px; padding: 60px 20px; text-align: center;">
                          <a href="${email.screenshots.proposedScreenshotUrl}" style="color: #059669; font-size: 14px;">View Preview</a>
                        </div>
                      `}
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Changes Section -->
              <div style="background-color: #F9FAFB; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #374151;">
                  Proposed Changes
                </h3>
                ${email.suggestion.changes.map((change) => `
                  <div style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
                    <div style="font-size: 13px; font-weight: 600; color: #6B7280; font-family: monospace;">
                      ${change.field}
                    </div>
                    <div style="margin-top: 8px; font-size: 14px;">
                      <span style="color: #EF4444; text-decoration: line-through;">${truncateValue(change.oldValue)}</span>
                      <span style="color: #9CA3AF; margin: 0 8px;">→</span>
                      <span style="color: #10B981; font-weight: 500;">${truncateValue(change.newValue)}</span>
                    </div>
                  </div>
                `).join('')}
              </div>

              <!-- Rationale -->
              <div style="margin: 24px 0;">
                <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #374151;">
                  Why This Change?
                </h3>
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4B5563;">
                  ${email.suggestion.recommendation.rationale}
                </p>
              </div>

              <!-- Action Buttons -->
              <div style="margin: 32px 0; text-align: center;">
                <a href="${email.approvalUrl}" style="display: inline-block; background-color: #10B981; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; margin-right: 12px;">
                  Approve & Deploy
                </a>
                <a href="${email.rejectionUrl}" style="display: inline-block; background-color: #EF4444; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
                  Reject
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 24px 32px; border-radius: 0 0 12px 12px; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #6B7280;">
                This link expires on ${new Date(email.expiresAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p style="margin: 0; font-size: 12px; color: #9CA3AF;">
                Fix ID: ${email.fixId}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text email content
 */
function generateEmailText(email: FixApprovalEmail): string {
  const storeName = email.storeName || 'your store';

  return `
CRO FIX SUGGESTION
==================

A new optimization has been identified for ${storeName}.

${email.suggestion.analysis.summary}

EXPECTED IMPACT: ${email.suggestion.recommendation.expectedImpact}

PROPOSED CHANGES:
${email.suggestion.changes.map((change) => `
- ${change.field}:
  Old: ${JSON.stringify(change.oldValue)}
  New: ${JSON.stringify(change.newValue)}
`).join('')}

WHY THIS CHANGE?
${email.suggestion.recommendation.rationale}

TAKE ACTION:
- Approve & Deploy: ${email.approvalUrl}
- Reject: ${email.rejectionUrl}

View current store: ${email.screenshots.currentScreenshotUrl}
View preview: ${email.screenshots.proposedScreenshotUrl}

---
This link expires on ${new Date(email.expiresAt).toLocaleDateString()}
Fix ID: ${email.fixId}
  `.trim();
}

/**
 * Truncate long values for display
 */
function truncateValue(value: unknown): string {
  const str = JSON.stringify(value);
  if (str.length > 50) {
    return str.slice(0, 47) + '...';
  }
  return str;
}

/**
 * Retrieve a sent email by fix ID (for preview endpoint)
 */
export function getSentEmail(fixId: string): FixApprovalEmail | undefined {
  return sentEmails.get(fixId);
}

/**
 * Get all sent emails
 */
export function getAllSentEmails(): FixApprovalEmail[] {
  return Array.from(sentEmails.values());
}

/**
 * Clear sent emails (for testing)
 */
export function clearSentEmails(): void {
  sentEmails.clear();
}

/**
 * Build a complete fix approval email payload
 */
export async function buildFixApprovalEmail(
  recipientEmail: string,
  suggestion: Suggestion,
  fix: MinimalFix,
  baseUrl: string,
  storeName?: string
): Promise<FixApprovalEmail> {
  const screenshots = await generateScreenshots(suggestion, baseUrl);

  return {
    to: recipientEmail,
    subject: `[Action Required] CRO Fix: ${suggestion.analysis.summary}`,
    fixId: fix.id,
    storeName,
    suggestion,
    fix,
    screenshots,
    approvalUrl: `${baseUrl}/fix/${suggestion.id}?action=approve`,
    rejectionUrl: `${baseUrl}/fix/${suggestion.id}?action=reject`,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}
