const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const IMAGE_PROXY_BASE = `${SUPABASE_URL}/functions/v1/image-proxy`;
const FALLBACK_MERCHANT_IMAGE = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop';
const FALLBACK_DEAL_IMAGE = 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=600&fit=crop';

// Debug logging
if (!SUPABASE_URL) {
  console.error('⚠️ VITE_SUPABASE_URL is not defined! Image proxy will not work.');
} else {
  console.log('✅ Image proxy configured:', IMAGE_PROXY_BASE);
}

export interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export type ImageType = 'merchant' | 'deal' | 'logo' | 'cover' | 'profile' | 'review';

/**
 * Extracts file ID from various image URL formats
 * The API expects numeric IDs (e.g., "114") or file-based IDs
 */
export function extractFileId(url: string | undefined | null): string | null {
  if (!url) return null;

  // If it's already a simple numeric or alphanumeric ID
  if (/^\d+$/.test(url)) {
    return url;
  }

  // Extract from full URLs
  const patterns = [
    /\/api\/image\/(\d+)/,           // /api/image/114
    /\/uploads\/(\d+)/,              // /uploads/114
    /\/image\/(\d+)/,                // /image/114
    /file-(\d+-\w+)\.(?:jpg|jpeg|png)/i,  // file-123-abc.jpg
    /^([a-zA-Z0-9\-_]+)$/,           // Direct ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  // If it's already a simple ID without slashes or extensions
  if (url && !url.includes('/') && !url.includes('.')) {
    return url;
  }

  return null;
}

/**
 * Generates image URL using Supabase edge function image-proxy
 * Primary endpoint: /functions/v1/image-proxy/{imageId}
 * The proxy fetches images from the backend API with proper authentication
 *
 * Handles multiple input formats:
 * - Numeric ID: "114" -> /functions/v1/image-proxy/114
 * - Full URL: already processed -> returns as-is
 * - Array of IDs: ["114"] -> first element
 */
export function getImageProxyUrl(
  imageId: string | number | string[] | undefined | null,
  options: ImageOptions = {}
): string | null {
  if (!imageId) {
    console.log('🖼️ getImageProxyUrl: No imageId provided');
    return null;
  }

  // Handle array input (take first element)
  if (Array.isArray(imageId)) {
    imageId = imageId[0];
    if (!imageId) return null;
  }

  // Convert number to string
  const idStr = typeof imageId === 'number' ? String(imageId) : imageId;

  // If it's already a full URL pointing to our image-proxy, return as-is
  if (idStr.startsWith('http') && idStr.includes('/functions/v1/image-proxy/')) {
    console.log('🖼️ getImageProxyUrl: Already proxy URL:', idStr);
    return idStr;
  }

  // Extract the ID
  const fileId = extractFileId(idStr);
  if (!fileId) {
    console.log('🖼️ getImageProxyUrl: Could not extract fileId from:', idStr);
    return null;
  }

  // Build the URL using Supabase edge function
  let url = `${IMAGE_PROXY_BASE}/${fileId}`;

  // Add optimization parameters if provided
  if (options.width || options.height || options.quality || options.format) {
    const params = new URLSearchParams();
    if (options.width) params.append('w', String(options.width));
    if (options.height) params.append('h', String(options.height));
    if (options.quality) params.append('q', String(options.quality));
    if (options.format) params.append('f', options.format);
    url += `?${params.toString()}`;
  }

  console.log('🖼️ Generated image URL:', url, 'from ID:', fileId);
  return url;
}

/**
 * Gets optimized image URL with fallback
 */
export function getOptimizedImageUrl(
  imageId: string | number | string[] | undefined | null,
  type: ImageType = 'merchant',
  options: ImageOptions = {}
): string {
  // Convert number to string
  if (typeof imageId === 'number') {
    imageId = String(imageId);
  }

  // Handle array (take first element)
  if (Array.isArray(imageId)) {
    imageId = imageId[0] || null;
  }
  const proxyUrl = getImageProxyUrl(imageId, options);

  if (proxyUrl) {
    return proxyUrl;
  }

  // Return appropriate fallback based on type
  switch (type) {
    case 'deal':
      return FALLBACK_DEAL_IMAGE;
    case 'merchant':
    case 'logo':
    case 'cover':
    case 'profile':
    default:
      return FALLBACK_MERCHANT_IMAGE;
  }
}

/**
 * Gets merchant logo URL
 */
export function getMerchantLogoUrl(logoId: string | undefined | null): string {
  return getOptimizedImageUrl(logoId, 'logo', {
    width: 200,
    height: 200,
    quality: 90,
  });
}

/**
 * Gets merchant cover image URL
 */
export function getMerchantCoverUrl(
  coverImageId: string | undefined | null
): string {
  return getOptimizedImageUrl(coverImageId, 'cover', {
    width: 1200,
    height: 600,
    quality: 85,
  });
}

/**
 * Gets deal image URL
 */
export function getDealImageUrl(imageUrl: string | undefined | null): string {
  return getOptimizedImageUrl(imageUrl, 'deal', {
    width: 800,
    height: 600,
    quality: 85,
  });
}

// Cache for profile image URLs to prevent regeneration
const profileImageUrlCache = new Map<string, string>();

/**
 * Gets profile/avatar image URL from storage path or URL
 * Handles both storage paths (user_profile/...) and full URLs
 * Caches results to prevent regeneration on every render
 */
export function getProfileImageUrl(imagePath: string | undefined | null): string {
  if (!imagePath) {
    return FALLBACK_MERCHANT_IMAGE;
  }

  // Check cache first
  if (profileImageUrlCache.has(imagePath)) {
    return profileImageUrlCache.get(imagePath)!;
  }

  let url: string;

  // If it's already a full URL, return it
  if (imagePath.startsWith('http')) {
    url = imagePath;
  }
  // If it's a storage path, get the public URL
  else if (imagePath.startsWith('user_profile/')) {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
    url = `${SUPABASE_URL}/storage/v1/object/public/user_images/${imagePath}`;
  }
  // Fallback for other formats
  else {
    url = getOptimizedImageUrl(imagePath, 'profile', {
      width: 300,
      height: 300,
      quality: 90,
    });
  }

  // Cache the result
  profileImageUrlCache.set(imagePath, url);

  return url;
}

/**
 * Clear profile image URL cache (useful when user uploads new image)
 */
export function clearProfileImageCache(imagePath?: string) {
  if (imagePath) {
    profileImageUrlCache.delete(imagePath);
  } else {
    profileImageUrlCache.clear();
  }
}

/**
 * Gets review image URL (thumbnail)
 */
export function getReviewImageUrl(imageUrl: string | undefined | null): string {
  return getOptimizedImageUrl(imageUrl, 'review', {
    width: 400,
    height: 400,
    quality: 80,
  });
}

/**
 * Preloads image to ensure it's cached
 */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload image: ${url}`));
    img.src = url;
  });
}

/**
 * Batch preload multiple images
 */
export async function preloadImages(urls: string[]): Promise<void> {
  await Promise.all(urls.map(url => preloadImage(url).catch(() => {
    console.warn(`Failed to preload: ${url}`);
  })));
}

/**
 * Handles image load error by setting fallback
 */
export function handleImageError(
  event: React.SyntheticEvent<HTMLImageElement>,
  type: ImageType = 'merchant'
): void {
  const img = event.currentTarget;

  // Prevent infinite loop
  if (img.src.includes('unsplash.com')) {
    return;
  }

  // Set appropriate fallback
  const fallback = type === 'deal' ? FALLBACK_DEAL_IMAGE : FALLBACK_MERCHANT_IMAGE;
  img.src = fallback;
}

/**
 * Creates srcset for responsive images
 */
export function createImageSrcSet(
  imageId: string | undefined | null,
  type: ImageType = 'merchant'
): string | undefined {
  const fileId = extractFileId(imageId);
  if (!fileId) return undefined;

  const sizes = [400, 800, 1200, 1600];
  const srcset = sizes
    .map(size => {
      const url = getOptimizedImageUrl(imageId, type, {
        width: size,
        quality: 85,
      });
      return `${url} ${size}w`;
    })
    .join(', ');

  return srcset;
}
