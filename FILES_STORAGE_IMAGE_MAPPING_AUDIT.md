# Files Storage Image Mapping - Complete Audit

## Executive Summary

**STATUS: ⚠️ CRITICAL ISSUE IDENTIFIED**

The application currently maps image IDs (e.g., "57") directly to `image_url` fields instead of resolving them to actual file paths. This means images are not displaying correctly because the app is trying to use IDs as image URLs.

## Database Schema - files_storage Table

### Complete Column Definition (9 columns)
✅ Schema verified in Supabase

| Column Name | Data Type | Nullable | Purpose |
|-------------|-----------|----------|---------|
| **id** | bigint | NO | Primary key, referenced by merchants.cover_image_ids |
| **filename** | text | YES | Original uploaded filename |
| **path** | text | YES | **ACTUAL FILE PATH** (e.g., "uploads/file-*.jpg") |
| **mimetype** | text | YES | MIME type (e.g., "image/jpeg") |
| **size** | bigint | YES | File size in bytes |
| **entity_type** | text | YES | Entity type (e.g., "merchant") |
| **entity_id** | text | YES | Reference to merchant_id |
| **created_at** | jsonb | YES | Creation timestamp (JSON string) |
| **updated_at** | jsonb | YES | Update timestamp (JSON string) |

### Row Level Security (RLS)
⚠️ **NO RLS POLICIES FOUND** - Table is currently unprotected!

**CRITICAL SECURITY ISSUE:**
- files_storage table has NO RLS policies enabled
- All files are potentially accessible without authentication
- Should implement policies for public read access to merchant images

## Sample Data Verification

### Real Files from Database

**Merchant: MC368091 (Test Dutch Merchant)**
```
File ID: 57
Filename: casey-lee-awj7sRviVXo-unsplash (1).jpg
Path: uploads/file-1745019277657-654783598.jpg
Size: 101134 bytes
MIME: image/jpeg
```

**Merchant: MC700263 (newiono)**
```
File ID: 26
Filename: nikolay-smeh-gPpbFaEkl00-unsplash.jpg
Path: uploads/file-1744968015431-697021679.jpg
Size: 1964079 bytes
MIME: image/jpeg

File ID: 27
Filename: david-foodphototasty-Sekm9_nC2BM-unsplash.jpg
Path: uploads/file-1744968016249-871914127.jpg
Size: 6156218 bytes
MIME: image/jpeg
```

### Sample Count
- Total merchant images in sample: 10+
- All images have valid paths
- All images are JPEG format
- File sizes range: 91KB - 6MB

## Current Image Mapping Flow

### 1. Database Storage (merchants table)
```sql
merchant_id: "MC368091"
cover_image_ids: "[\"57\",\"56\",\"58\"]"  -- JSONB stored as STRING type
```

**⚠️ ISSUE:** `cover_image_ids` is stored as JSONB but shows as string type!

### 2. API Response Format
Based on API client configuration, the API should return:
```typescript
{
  merchantId: "MC368091",
  companyName: "Test Dutch Merchant",
  coverImageIds: ["57", "56", "58"],  // Array of ID strings
  // ... other fields
}
```

### 3. App.tsx Transformation (Line 134)
```typescript
image_url: merchant.coverImageIds?.[0] || null
```

**RESULT:** `image_url = "57"` ❌ (ID, not a path or URL!)

### 4. Component Usage
**DiscoverView.tsx (Line 76):**
```typescript
<img
  src={restaurant.image_url || 'fallback-url'}
  alt={restaurant.name}
/>
```

**RESULT:** `<img src="57" />` ❌ Browser cannot load this!

## The Problem Explained

### What Should Happen
```
Database: cover_image_ids = ["57", "56", "58"]
         ↓
      Resolve IDs to paths via files_storage join
         ↓
API Returns: coverImageUrls = [
  "https://api.pawatasty.com/uploads/file-1745019277657-654783598.jpg",
  "https://api.pawatasty.com/uploads/file-1745019277654-450080861.jpg",
  "https://api.pawatasty.com/uploads/file-1745019277670-181323049.jpg"
]
         ↓
App Uses: image_url = "https://api.pawatasty.com/uploads/file-1745019277657-654783598.jpg"
         ↓
Component Renders: <img src="https://api.pawatasty.com/uploads/..." /> ✅
```

### What Currently Happens
```
Database: cover_image_ids = ["57", "56", "58"]
         ↓
API Returns: coverImageIds = ["57", "56", "58"]  (raw IDs)
         ↓
App Uses: image_url = "57"
         ↓
Component Renders: <img src="57" /> ❌ BROKEN
```

## API Base URL Configuration

From `src/services/mobile/client.ts`:

```typescript
const API_BASE_URL = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_BASE_URL || 'https://api.pawatasty.com');
```

**Production URL:** `https://api.pawatasty.com`
**Development:** Uses Vite proxy (empty string)

## Image URL Construction Solutions

### Option 1: Backend Resolves Paths (RECOMMENDED) ⭐
**Backend API should join with files_storage:**

```sql
SELECT
  m.*,
  (
    SELECT jsonb_agg(
      CONCAT('https://api.pawatasty.com/', f.path)
      ORDER BY array_position(m.cover_image_ids::text[]::int[], f.id::int)
    )
    FROM files_storage f
    WHERE f.id::text = ANY(
      SELECT jsonb_array_elements_text(m.cover_image_ids)
    )
  ) as cover_image_urls
FROM merchants m;
```

**API Response Format:**
```typescript
{
  merchantId: "MC368091",
  companyName: "Test Dutch Merchant",
  coverImageUrls: [  // ✅ Full URLs, not IDs
    "https://api.pawatasty.com/uploads/file-1745019277657-654783598.jpg",
    "https://api.pawatasty.com/uploads/file-1745019277654-450080861.jpg",
    "https://api.pawatasty.com/uploads/file-1745019277670-181323049.jpg"
  ],
  logoUrl: "https://api.pawatasty.com/uploads/file-*.jpg" // If logo_id exists
}
```

**App.tsx Change:**
```typescript
image_url: merchant.coverImageUrls?.[0] || null
```

**PROS:**
- ✅ Clean separation of concerns
- ✅ Images work across all API consumers
- ✅ Efficient (single query with join)
- ✅ URLs pre-constructed on backend
- ✅ No frontend code changes needed (just field name)

**CONS:**
- Requires backend API modification

---

### Option 2: Frontend Resolves via Supabase Query
**App.tsx queries files_storage directly:**

```typescript
const formattedRestaurants = await Promise.all(
  merchantsData.map(async (merchant: any) => {
    let imageUrl = null;

    if (merchant.coverImageIds && merchant.coverImageIds.length > 0) {
      const firstImageId = merchant.coverImageIds[0];
      const { data } = await supabase
        .from('files_storage')
        .select('path')
        .eq('id', firstImageId)
        .maybeSingle();

      if (data?.path) {
        imageUrl = `${API_BASE_URL}/${data.path}`;
      }
    }

    return {
      id: merchant.merchantId,
      name: merchant.companyName,
      image_url: imageUrl,
      // ... other fields
    };
  })
);
```

**PROS:**
- ✅ No backend changes needed
- ✅ Direct database access

**CONS:**
- ❌ Makes N additional queries (one per merchant)
- ❌ Slower performance
- ❌ Duplicates logic that should be on backend
- ❌ Requires Supabase client in frontend

---

### Option 3: Create Image URL Helper Function
**Create utility function:**

```typescript
// src/utils/imageHelpers.ts
export async function resolveImageIds(
  imageIds: string[]
): Promise<string[]> {
  if (!imageIds || imageIds.length === 0) return [];

  const { data } = await supabase
    .from('files_storage')
    .select('id, path')
    .in('id', imageIds);

  if (!data) return [];

  // Maintain order from imageIds array
  return imageIds
    .map(id => data.find(f => f.id.toString() === id)?.path)
    .filter(Boolean)
    .map(path => `${API_BASE_URL}/${path}`);
}
```

**Usage in App.tsx:**
```typescript
const formattedRestaurants = await Promise.all(
  merchantsData.map(async (merchant: any) => {
    const imageUrls = await resolveImageIds(merchant.coverImageIds || []);

    return {
      id: merchant.merchantId,
      name: merchant.companyName,
      image_url: imageUrls[0] || null,
      // ... other fields
    };
  })
);
```

**PROS:**
- ✅ Reusable helper function
- ✅ Centralized logic
- ✅ Can batch queries

**CONS:**
- ❌ Still requires multiple queries
- ❌ Frontend handles backend responsibility

---

### Option 4: Static File Server with ID-based URLs
**Create API endpoint:**
```
GET /api/files/:id
```

**Returns:** Actual image file or redirects to storage

**App.tsx:**
```typescript
image_url: merchant.coverImageIds?.[0]
  ? `https://api.pawatasty.com/api/files/${merchant.coverImageIds[0]}`
  : null
```

**PROS:**
- ✅ Simple URL construction
- ✅ Backend controls access
- ✅ Can add authentication

**CONS:**
- ❌ Requires new API endpoint
- ❌ Extra HTTP redirect/proxy overhead

## All Components Using Images

### Components with Image Fields ✅

1. **DiscoverView.tsx**
   - Uses: `restaurant.image_url`
   - Line 76, 116, 147
   - Fallback: Pexels stock images

2. **MapView.tsx**
   - Uses: `selectedRestaurant.image_url`
   - Line 183
   - Fallback: Pexels stock images

3. **MerchantDetails.tsx**
   - Receives: `restaurant.image` prop
   - Line 42 (in images array)
   - Additional images: Hardcoded Pexels URLs

4. **BookingDetails.tsx**
   - Uses: `booking.image`
   - Line 92-94
   - Optional field

5. **History.tsx**
   - Uses: `booking.image`
   - Line 82, 261-262
   - Hardcoded for sample data

6. **BookingForm.tsx**
   - Line 50: Hardcoded Pexels URL
   - Not using dynamic images

7. **DealBookingModal.tsx**
   - Uses: Deal images (separate from merchant images)
   - Not directly related to files_storage

### All Image References Use Fallbacks ✅
Every component properly handles missing images with Pexels fallbacks:
```typescript
restaurant.image_url || 'https://images.pexels.com/photos/...'
```

This is why the app appears to work despite broken image mapping!

## Current State Assessment

### ✅ What's Working
1. **Database schema** - Correctly structured
2. **File storage** - Images properly stored with paths
3. **Fallback images** - All components use Pexels fallbacks
4. **Component logic** - Properly handles missing images

### ❌ What's Broken
1. **Image ID Resolution** - IDs not converted to paths
2. **API Response** - Returns IDs instead of URLs
3. **App Mapping** - Uses first ID as image_url
4. **No RLS** - files_storage table unprotected

### ⚠️ Why It "Works"
The app appears functional because:
- All components have fallback images
- Pexels URLs work as placeholders
- No errors thrown for invalid src attributes
- Users see generic stock photos instead of actual merchant images

## Recommended Solution

**IMPLEMENT OPTION 1: Backend API Resolution** ⭐

### Step 1: Modify Backend API
Update `/api/merchants` endpoint to join files_storage:

```sql
SELECT
  m.merchant_id,
  m.company_name,
  m.address,
  m.city,
  m.country,
  m.business_category,
  m.latitude,
  m.longitude,
  m.phone_nr,
  m.open_time,
  m.open_days,
  -- Resolve cover images
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', f.id,
        'url', CONCAT('https://api.pawatasty.com/', f.path),
        'filename', f.filename
      )
      ORDER BY array_position(
        (SELECT array_agg(elem::int) FROM jsonb_array_elements_text(m.cover_image_ids) elem),
        f.id::int
      )
    )
    FROM files_storage f
    WHERE f.id::text = ANY(
      SELECT jsonb_array_elements_text(m.cover_image_ids)
    )
  ) as cover_images,
  -- Resolve logo
  (
    SELECT CONCAT('https://api.pawatasty.com/', f.path)
    FROM files_storage f
    WHERE f.id::text = m.logo_id
    LIMIT 1
  ) as logo_url
FROM merchants m;
```

### Step 2: Update API Response Format
```typescript
{
  merchantId: "MC368091",
  companyName: "Test Dutch Merchant",
  coverImages: [
    {
      id: 57,
      url: "https://api.pawatasty.com/uploads/file-1745019277657-654783598.jpg",
      filename: "casey-lee-awj7sRviVXo-unsplash (1).jpg"
    },
    // ... more images
  ],
  logoUrl: "https://api.pawatasty.com/uploads/file-*.jpg"
}
```

### Step 3: Update App.tsx (Line 134)
```typescript
image_url: merchant.coverImages?.[0]?.url || null
```

### Step 4: Add RLS Policy to files_storage
```sql
-- Enable RLS
ALTER TABLE files_storage ENABLE ROW LEVEL SECURITY;

-- Allow public read access to merchant images
CREATE POLICY "Public read access for merchant images"
  ON files_storage
  FOR SELECT
  TO public
  USING (entity_type = 'merchant');
```

## Database Type Inconsistency

### Issue with cover_image_ids
```sql
Column: cover_image_ids
Type: jsonb
Actual Storage: string

SELECT jsonb_typeof(cover_image_ids) FROM merchants;
Result: "string"
```

**Problem:** Data is stored as JSON-encoded string within JSONB field!

**Current:** `"[\"57\",\"56\",\"58\"]"` (string containing JSON)
**Should be:** `["57","56","58"]` (proper JSONB array)

**This may cause:**
- Parsing issues on backend
- Need to double-parse JSON
- Performance overhead

**Fix on Backend:**
```typescript
// Backend may need to parse twice:
const imageIds = JSON.parse(merchant.cover_image_ids); // First parse
// Now imageIds is the actual array
```

## Security Recommendations

### 1. Implement RLS on files_storage ⚠️ URGENT
```sql
ALTER TABLE files_storage ENABLE ROW LEVEL SECURITY;

-- Public read for merchant images
CREATE POLICY "Anyone can view merchant images"
  ON files_storage
  FOR SELECT
  TO public
  USING (entity_type = 'merchant');

-- Restrict other entity types
CREATE POLICY "Authenticated users can view their files"
  ON files_storage
  FOR SELECT
  TO authenticated
  USING (
    entity_type != 'merchant'
    AND entity_id IN (
      SELECT user_id::text FROM users WHERE user_id = auth.uid()
    )
  );
```

### 2. Add File Serving Endpoint
Create `/api/files/:id` endpoint that:
- Validates file access
- Logs access attempts
- Supports image optimization
- Handles cache headers

### 3. Consider CDN Integration
For production:
- Upload images to Supabase Storage or S3
- Use CDN URLs directly
- Update files_storage.path to store CDN URLs

## Testing Checklist

- [ ] Verify API returns full image URLs
- [ ] Test image display in DiscoverView
- [ ] Test image display in MapView
- [ ] Test image display in MerchantDetails
- [ ] Verify fallback images still work
- [ ] Test with merchants that have no images
- [ ] Test with merchants that have multiple images
- [ ] Verify RLS policies allow public access
- [ ] Test image loading performance
- [ ] Verify logo_id resolution (when available)

## Build Verification

- TypeScript compilation: ✅ Passing
- No type errors in image-related code: ✅
- All components handle optional images: ✅

## Conclusion

**CRITICAL FINDING:**
The application's image mapping is completely broken. It uses file IDs (e.g., "57") as image URLs, which cannot be loaded by browsers. The app only appears to work because every component has fallback Pexels images.

**ROOT CAUSE:**
The API returns raw file IDs instead of resolved URLs, and the frontend directly uses these IDs as image sources.

**REQUIRED FIX:**
Backend API MUST join files_storage table and return full image URLs. This is the only proper solution that scales and maintains separation of concerns.

**IMMEDIATE IMPACT:**
- ❌ No merchant-specific images display
- ❌ All users see generic stock photos
- ❌ Brand identity lost for merchants
- ❌ files_storage table has no RLS protection

**ESTIMATED EFFORT:**
- Backend SQL query modification: 1-2 hours
- API response format update: 30 minutes
- Frontend field name change: 5 minutes
- RLS policy implementation: 15 minutes
- Testing: 1 hour
- **Total: 3-4 hours**
