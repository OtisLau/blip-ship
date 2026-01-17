/**
 * HTML sanitization utilities to prevent XSS attacks
 */
import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * Use this for any user-generated or config-driven content before rendering
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'span'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitize plain text (strips all HTML)
 * Use this for text-only fields like names, titles, etc.
 */
export function sanitizeText(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Validate and sanitize URL to prevent javascript: and data: protocols
 */
export function sanitizeUrl(url: string): string {
  const sanitized = url.trim();

  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const lowerUrl = sanitized.toLowerCase();

  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return '#';
    }
  }

  // Only allow http:, https:, and relative URLs
  if (!sanitized.startsWith('http://') &&
      !sanitized.startsWith('https://') &&
      !sanitized.startsWith('/') &&
      !sanitized.startsWith('#')) {
    return '#';
  }

  return sanitized;
}
