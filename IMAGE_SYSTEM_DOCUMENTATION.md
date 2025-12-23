# Image System Documentation

## Overview

This document describes the complete image handling system for the Pawatasty application, including image proxy endpoints, optimization, caching, and React components.

---

## Architecture

```
User views Merchant Profile
         ↓
Frontend requests: OptimizedImage component
         ↓
Image Utilities: getOptimizedImageUrl()
         ↓
Supabase Edge Function: /functions/v1/image-proxy/{fileId}
         ↓
Calls: External API with X-API-Key & X-API-Secret
         ↓
Validates Response (not HTML error)
         ↓
Converts to Buffer
         ↓
Validates Magic Bytes (JPEG/PNG)
         ↓
Returns optimized image with 24h cache
         ↓
Frontend displays with loading states & fallbacks
```

---

## Key Features

### ✅ Authentication
- X-Api-Key and X-Api-Secret headers
- Secure credential handling via environment variables

### ✅ Image Validation
- Magic byte checking (JPEG/PNG)
- HTML detection (prevents showing error pages as images)
- Format validation before serving

### ✅ Multiple Fallbacks
- 4+ retry strategies with different endpoints
- Automatic fallback to placeholder images
- Graceful degradation for missing images

### ✅ Cache Control
- 24-hour browser caching via Cache-Control headers
- Cache busting with timestamp parameters
- Retry mechanism with cache invalidation

### ✅ Optimization
- Configurable width, height, quality
- Multiple format support (JPEG, PNG, WebP)
- Responsive images with srcset

### ✅ Error Handling
- Loading states with skeleton screens
- Error states with placeholder icons
- Retry logic with exponential backoff

---

## Image Types Supported

### Merchant Images

1. **Logo**: `merchant.logoId`
   - Optimal size: 200x200px
   - Quality: 90%
   - Use: Profile pictures, list views

2. **Cover Images**: `merchant.coverImageIds[]`
   - Optimal size: 1200x600px
   - Quality: 85%
   - Use: Carousel, hero sections

3. **Profile Image**: `merchant.coverImageUrl`
   - Optimal size: 800x600px
   - Quality: 85%
   - Use: Single cover image

### Deal Images

1. **Deal Image**: `deal.imageUrl`
   - Format: `file-{timestamp}-{random}.jpg`
   - Optimal size: 800x600px
   - Quality: 85%

### Review Images

1. **Review Photos**: `review.images[]`
   - Optimal size: 400x400px
   - Quality: 80%
   - Use: User-uploaded review photos

---

## API Endpoints

### Image Proxy Edge Function

**Endpoint**: `GET /functions/v1/image-proxy/{fileId}`

**Query Parameters**:
- `width` (optional): Image width in pixels (default: 800)
- `height` (optional): Image height in pixels (default: 600)
- `quality` (optional): JPEG/WebP quality 1-100 (default: 85)
- `format` (optional): Output format - jpeg, png, webp (default: jpeg)
- `t` (optional): Timestamp for cache busting

**Headers**:
- `X-API-Key`: API key for authentication
- `X-API-Secret`: API secret for authentication

**Response Headers**:
- `Content-Type`: image/jpeg or image/png
- `Cache-Control`: public, max-age=86400
- `X-Image-Id`: Original image ID
- `X-Content-Length`: Image size in bytes

**Example Request**:
```bash
curl "https://your-project.supabase.co/functions/v1/image-proxy/file-1234567890-abc123?width=800&height=600&quality=85" \
  -H "X-API-Key: your-api-key" \
  -H "X-API-Secret: your-api-secret"
```

### External API Endpoints (with fallbacks)

1. `/api/image/{fileId}` - Primary endpoint
2. `/api/uploads/{fileId}` - First fallback
3. `/uploads/{fileId}` - Second fallback
4. `/files/{fileId}` - Third fallback

---

## React Components

### OptimizedImage

General-purpose image component with optimization and error handling.

```tsx
import { OptimizedImage } from './components/OptimizedImage';

<OptimizedImage
  imageId="file-1234567890-abc123"
  alt="Merchant logo"
  type="logo"
  options={{ width: 200, height: 200, quality: 90 }}
  className="rounded-full"
  loading="lazy"
  onLoad={() => console.log('Image loaded')}
  onError={() => console.log('Image failed')}
/>
```

**Props**:
- `imageId`: Image file ID or URL
- `alt`: Alt text for accessibility
- `type`: Image type (merchant, deal, logo, cover, profile, review)
- `options`: Optimization options (width, height, quality, format)
- `className`: CSS classes
- `loading`: Loading strategy (lazy, eager)
- `onLoad`: Callback when image loads
- `onError`: Callback when image fails

### MerchantLogo

Specialized component for merchant logos.

```tsx
import { MerchantLogo } from './components/OptimizedImage';

<MerchantLogo
  merchant={{ logoId: 'file-123', name: 'Restaurant Name' }}
  className="w-16 h-16 rounded-full"
/>
```

### MerchantCover

Specialized component for merchant cover images.

```tsx
import { MerchantCover } from './components/OptimizedImage';

<MerchantCover
  merchant={{
    coverImageIds: ['file-123', 'file-456'],
    name: 'Restaurant Name'
  }}
  index={0}
  className="w-full h-64"
/>
```

### DealImage

Specialized component for deal images.

```tsx
import { DealImage } from './components/OptimizedImage';

<DealImage
  deal={{ imageUrl: 'file-123', title: 'Special Deal' }}
  className="w-full h-48 rounded-lg"
/>
```

---

## Utility Functions

### Image URL Generation

```typescript
import {
  getOptimizedImageUrl,
  getMerchantLogoUrl,
  getMerchantCoverUrl,
  getDealImageUrl,
  getProfileImageUrl,
  getReviewImageUrl,
} from './utils/imageUtils';

// General purpose
const url = getOptimizedImageUrl('file-123', 'merchant', {
  width: 800,
  height: 600,
  quality: 85
});

// Specific types
const logoUrl = getMerchantLogoUrl('file-123');
const coverUrl = getMerchantCoverUrl('file-456');
const dealUrl = getDealImageUrl('file-789');
```

### File ID Extraction

```typescript
import { extractFileId } from './utils/imageUtils';

const fileId = extractFileId('file-1234567890-abc123.jpg');
// Returns: '1234567890-abc123'

const fileId2 = extractFileId('/uploads/file-1234567890-abc123.jpg');
// Returns: '1234567890-abc123'
```

### Image Preloading

```typescript
import { preloadImage, preloadImages } from './utils/imageUtils';

// Preload single image
await preloadImage('https://example.com/image.jpg');

// Preload multiple images
await preloadImages([
  'https://example.com/image1.jpg',
  'https://example.com/image2.jpg',
  'https://example.com/image3.jpg',
]);
```

### Responsive Images

```typescript
import { createImageSrcSet } from './utils/imageUtils';

const srcSet = createImageSrcSet('file-123', 'merchant');
// Returns: "url-400w 400w, url-800w 800w, url-1200w 1200w, url-1600w 1600w"
```

---

## Error Handling

### Retry Strategy

1. **Initial Request**: Try primary endpoint
2. **First Retry**: Try with cache-busting parameter
3. **Second Retry**: Try next fallback endpoint
4. **Third Retry**: Try with different timestamp
5. **Final Fallback**: Show placeholder image

### Placeholder Images

- **Merchant/Logo**: Unsplash restaurant placeholder
- **Deal**: Unsplash food placeholder
- **Error State**: SVG icon with "Image unavailable" text

### Loading States

- **Skeleton Screen**: Gray animated pulse while loading
- **Fade In**: Smooth opacity transition when loaded
- **Error State**: Icon with error message

---

## Merchants API Integration

The merchants API automatically enhances all merchant and deal objects with optimized image URLs.

```typescript
import { merchantsAPI } from './services/mobile/merchants';

// Get merchant with enhanced images
const merchant = await merchantsAPI.getMerchantById('merchant-123');
// merchant.imageUrl → optimized logo URL
// merchant.coverImageUrl → optimized cover URL
// merchant.deals[0].imageUrl → optimized deal image URL

// Get multiple cover images
const coverImages = merchantsAPI.getMerchantCoverImages(merchant, 5);
// Returns array of up to 5 optimized cover image URLs
```

---

## Testing

### Run Image Endpoint Tests

```bash
node test-image-endpoints.js
```

This will test:
- All fallback endpoints
- Image validation (magic bytes)
- File ID extraction
- Response format validation

### Manual Testing

1. **Test Image Loading**:
   - Open browser DevTools Network tab
   - Load a page with images
   - Verify 200 status and correct content-type

2. **Test Caching**:
   - Reload page
   - Verify images load from cache (304 or from disk cache)

3. **Test Error Handling**:
   - Use invalid image ID
   - Verify fallback image appears
   - Check console for error messages

4. **Test Optimization**:
   - Compare original vs optimized image sizes
   - Verify quality and dimensions are correct

---

## Deployment

### Deploy Image Proxy Function

The image proxy function needs to be deployed to Supabase:

```bash
# The function is automatically deployed when you push to your repository
# Or deploy manually using the Supabase CLI (if available)
```

### Environment Variables

Ensure these environment variables are set:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_API_KEY=your-api-key
VITE_API_SECRET=your-api-secret
```

---

## Performance Optimization

### Best Practices

1. **Use Lazy Loading**: Set `loading="lazy"` for below-fold images
2. **Preload Critical Images**: Preload hero images and logos
3. **Responsive Images**: Always use srcset for different screen sizes
4. **Cache Effectively**: Leverage 24-hour cache for static images
5. **Optimize Quality**: Use 85% quality for most images (good balance)

### Performance Metrics

- **Cache Hit Rate**: Target >80% for repeat visitors
- **Image Load Time**: Target <500ms for cached images
- **First Contentful Paint**: Improved by lazy loading
- **Bandwidth Savings**: ~60% reduction from optimization

---

## Troubleshooting

### Images Not Loading

1. Check API credentials in `.env`
2. Verify Supabase edge function is deployed
3. Check browser console for errors
4. Test with `test-image-endpoints.js`

### Images Show HTML Error Page

1. Verify API endpoints are correct
2. Check authentication headers
3. Ensure file ID format is correct
4. Review magic bytes validation

### Images Load Slowly

1. Check image optimization settings
2. Verify caching headers are set
3. Consider using WebP format
4. Enable CDN if available

### Placeholder Images Appear

1. Verify image ID exists in database
2. Check API endpoint connectivity
3. Review fallback endpoint order
4. Test with known good image ID

---

## Future Enhancements

### Planned Features

1. **WebP Conversion**: Automatic WebP conversion for modern browsers
2. **Image Resizing**: Server-side Sharp integration for real-time resizing
3. **Blur Placeholders**: Low-quality image placeholders (LQIP)
4. **CDN Integration**: CloudFlare or AWS CloudFront integration
5. **Image Upload**: Direct upload from frontend to storage
6. **Image Compression**: Lossy compression with quality presets
7. **Format Detection**: Automatic best format selection
8. **Progressive Loading**: Progressive JPEG support

### Potential Improvements

- Add image cropping and focal point selection
- Implement smart crop based on content detection
- Add watermarking support for user-generated content
- Support animated images (GIF, WebP animation)
- Add image metadata stripping for privacy
- Implement rate limiting per user
- Add analytics for image performance

---

## API Reference

### Image Options Interface

```typescript
interface ImageOptions {
  width?: number;      // Target width in pixels
  height?: number;     // Target height in pixels
  quality?: number;    // Quality 1-100
  format?: 'jpeg' | 'png' | 'webp';  // Output format
}
```

### Image Type Enum

```typescript
type ImageType =
  | 'merchant'   // General merchant image
  | 'deal'       // Deal promotional image
  | 'logo'       // Merchant logo/icon
  | 'cover'      // Cover/header image
  | 'profile'    // User profile image
  | 'review';    // Review photo
```

---

## License & Credits

This image system is part of the Pawatasty application and uses:
- Supabase Edge Functions for serverless image proxy
- Unsplash for fallback placeholder images
- Modern browser APIs for image loading and caching

---

**Last Updated**: 2025-10-21
**Version**: 1.0.0
