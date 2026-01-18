/**
 * Cloudinary Service - Image Upload
 *
 * Uploads images to Cloudinary and returns public URLs.
 * Used to host email screenshots so they don't exceed Gmail's 102KB limit.
 */

import crypto from 'crypto';

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

export interface CloudinaryUploadResult {
  success: boolean;
  url?: string;
  publicId?: string;
  error?: string;
}

/**
 * Check if Cloudinary is configured
 */
export function isCloudinaryConfigured(): boolean {
  return !!(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);
}

/**
 * Generate Cloudinary signature for authenticated uploads
 */
function generateSignature(params: Record<string, string>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return crypto
    .createHash('sha1')
    .update(sortedParams + CLOUDINARY_API_SECRET)
    .digest('hex');
}

/**
 * Upload a PNG buffer to Cloudinary
 */
export async function uploadToCloudinary(
  imageBuffer: Buffer,
  options?: {
    folder?: string;
    publicId?: string;
  }
): Promise<CloudinaryUploadResult> {
  if (!isCloudinaryConfigured()) {
    return {
      success: false,
      error: 'Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
    };
  }

  const { folder = 'blip-ship-screenshots', publicId } = options || {};

  try {
    const timestamp = Math.floor(Date.now() / 1000).toString();

    // Build params for signature
    const params: Record<string, string> = {
      timestamp,
      folder,
    };

    if (publicId) {
      params.public_id = publicId;
    }

    const signature = generateSignature(params);

    // Convert buffer to base64 data URI for upload
    const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;

    // Build form data
    const formData = new FormData();
    formData.append('file', base64Image);
    formData.append('api_key', CLOUDINARY_API_KEY!);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    formData.append('folder', folder);

    if (publicId) {
      formData.append('public_id', publicId);
    }

    // Upload to Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Cloudinary] Upload failed:', errorText);
      return {
        success: false,
        error: `Upload failed: ${response.status} ${response.statusText}`,
      };
    }

    const result = await response.json();

    console.log('[Cloudinary] Upload successful:', result.secure_url);

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error('[Cloudinary] Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Upload multiple images to Cloudinary
 */
export async function uploadMultipleToCloudinary(
  images: { buffer: Buffer; name: string }[],
  folder?: string
): Promise<Map<string, CloudinaryUploadResult>> {
  const results = new Map<string, CloudinaryUploadResult>();

  // Upload in parallel
  const uploads = images.map(async ({ buffer, name }) => {
    const result = await uploadToCloudinary(buffer, {
      folder,
      publicId: name,
    });
    results.set(name, result);
  });

  await Promise.all(uploads);

  return results;
}

/**
 * Get optimized Cloudinary URL with transformations
 */
export function getOptimizedUrl(
  url: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
  }
): string {
  if (!url.includes('cloudinary.com')) {
    return url;
  }

  const { width, height, quality = 'auto' } = options || {};

  // Build transformation string
  const transforms: string[] = [];

  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  transforms.push(`q_${quality}`);
  transforms.push('f_auto'); // Auto format (webp, etc.)

  const transformString = transforms.join(',');

  // Insert transformation into URL
  // URL format: https://res.cloudinary.com/cloud-name/image/upload/v123/folder/image.png
  // Insert transforms after /upload/
  return url.replace('/upload/', `/upload/${transformString}/`);
}
