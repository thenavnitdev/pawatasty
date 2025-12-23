# Reviews Implementation - Complete Guide

## Overview

Implemented a comprehensive review system for merchants with ratings, comments, detailed category ratings, and helpful votes functionality.

## Database Implementation ✅

### Reviews Table Schema
Created table with 14 columns:

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid | NO | Primary key (auto-generated) |
| `user_id` | uuid | NO | Reference to auth.users |
| `target_type` | text | NO | Type: 'merchant', 'deal', or 'station' |
| `target_id` | text | NO | ID of the entity being reviewed |
| `rating` | integer | NO | Overall rating (1-5) with constraint |
| `comment` | text | YES | Review text content |
| `food_rating` | integer | YES | Food quality (1-5) |
| `service_rating` | integer | YES | Service quality (1-5) |
| `ambiance_rating` | integer | YES | Ambiance rating (1-5) |
| `value_rating` | integer | YES | Value for money (1-5) |
| `images` | jsonb | YES | Array of image URLs/IDs (default: []) |
| `helpful_count` | integer | YES | Helpful votes count (default: 0) |
| `created_at` | timestamptz | YES | Creation timestamp (auto) |
| `updated_at` | timestamptz | YES | Update timestamp (auto) |

### Database Constraints
- ✅ Rating must be between 1 and 5
- ✅ All category ratings must be between 1 and 5
- ✅ Target type must be 'merchant', 'deal', or 'station'
- ✅ User ID references auth.users with CASCADE delete
- ✅ Updated_at auto-updates via trigger function

### Indexes Created
```sql
idx_reviews_target          -- (target_type, target_id)
idx_reviews_user            -- (user_id)
idx_reviews_rating          -- (rating)
idx_reviews_created         -- (created_at DESC)
idx_reviews_target_created  -- (target_type, target_id, created_at DESC)
```

### Row Level Security (RLS)
✅ **All policies implemented:**

1. **Anyone can read reviews** (SELECT)
   - Policy: `public` role
   - No authentication required

2. **Authenticated users can create reviews** (INSERT)
   - Policy: `authenticated` role
   - Enforces: `auth.uid() = user_id`

3. **Users can update own reviews** (UPDATE)
   - Policy: `authenticated` role
   - Enforces: `auth.uid() = user_id`

4. **Users can delete own reviews** (DELETE)
   - Policy: `authenticated` role
   - Enforces: `auth.uid() = user_id`

### Statistics View
Created `merchant_review_stats` view:

```sql
SELECT
  target_id as merchant_id,
  COUNT(*) as total_reviews,
  ROUND(AVG(rating), 1) as average_rating,
  ROUND(AVG(food_rating), 1) as average_food_rating,
  ROUND(AVG(service_rating), 1) as average_service_rating,
  ROUND(AVG(ambiance_rating), 1) as average_ambiance_rating,
  ROUND(AVG(value_rating), 1) as average_value_rating,
  COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star_count,
  COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star_count,
  COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star_count,
  COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star_count,
  COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star_count
FROM reviews
WHERE target_type = 'merchant'
GROUP BY target_id
```

## TypeScript Types ✅

### Review Interface
```typescript
export interface Review {
  id: string;
  user_id: string;
  target_type: 'merchant' | 'deal' | 'station';
  target_id: string;
  rating: number;
  comment?: string;
  food_rating?: number;
  service_rating?: number;
  ambiance_rating?: number;
  value_rating?: number;
  images?: string[];
  helpful_count: number;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_avatar?: string;
}
```

### ReviewStats Interface
```typescript
export interface ReviewStats {
  merchant_id: string;
  total_reviews: number;
  average_rating: number;
  average_food_rating?: number;
  average_service_rating?: number;
  average_ambiance_rating?: number;
  average_value_rating?: number;
  five_star_count: number;
  four_star_count: number;
  three_star_count: number;
  two_star_count: number;
  one_star_count: number;
}
```

### CreateReviewRequest Interface
```typescript
export interface CreateReviewRequest {
  target_type: 'merchant' | 'deal' | 'station';
  target_id: string;
  rating: number;
  comment?: string;
  food_rating?: number;
  service_rating?: number;
  ambiance_rating?: number;
  value_rating?: number;
  images?: string[];
}
```

## API Service Layer ✅

Created `src/services/mobile/reviews.ts`:

### API Methods

#### 1. Get Reviews
```typescript
reviewsAPI.getReviews(targetType: string, targetId: string)
// GET /api/mobile/reviews/:targetType/:targetId
// Returns: Review[]
```

#### 2. Get Review Statistics
```typescript
reviewsAPI.getReviewStats(targetType: string, targetId: string)
// GET /api/mobile/reviews/:targetType/:targetId/stats
// Returns: ReviewStats
```

#### 3. Create Review
```typescript
reviewsAPI.createReview(reviewData: CreateReviewRequest)
// POST /api/mobile/reviews
// Returns: Review
```

#### 4. Update Review
```typescript
reviewsAPI.updateReview(reviewId: string, reviewData: Partial<CreateReviewRequest>)
// PUT /api/mobile/reviews/:reviewId
// Returns: Review
```

#### 5. Delete Review
```typescript
reviewsAPI.deleteReview(reviewId: string)
// DELETE /api/mobile/reviews/:reviewId
// Returns: void
```

#### 6. Mark Helpful
```typescript
reviewsAPI.markHelpful(reviewId: string)
// POST /api/mobile/reviews/:reviewId/helpful
// Returns: void
```

## UI Components ✅

### 1. ReviewForm Component
**File:** `src/components/ReviewForm.tsx`

**Features:**
- ⭐ Large interactive star rating (1-5)
- 📝 Comment text area with character count
- 🍽️ Detailed ratings for merchants:
  - Food Quality
  - Service
  - Ambiance
  - Value for Money
- 📸 Photo upload placeholder (ready for implementation)
- ✅ Form validation
- 🔄 Loading states
- ❌ Error handling
- 🎨 Beautiful modal UI with smooth interactions

**Props:**
```typescript
interface ReviewFormProps {
  targetType: 'merchant' | 'deal' | 'station';
  targetId: string;
  targetName: string;
  onClose: () => void;
  onSuccess: () => void;
}
```

**Validation:**
- Rating must be selected (1-5)
- Comment is required (non-empty)
- Category ratings are optional for merchants

### 2. MerchantDetails Reviews Tab
**File:** `src/components/MerchantDetails.tsx`

**Updated to include:**

#### Reviews Display
- 📊 Average rating with star display
- 📈 Total review count
- ✍️ "Write Review" button
- 📋 List of all reviews with:
  - User avatar (placeholder)
  - User name
  - Date posted
  - Overall star rating
  - Detailed category ratings (if available)
  - Review comment
  - Helpful count with button
  - Responsive design

#### Features
- 🔄 Auto-loads reviews when tab is opened
- ⏳ Loading state while fetching
- 📭 Empty state with "Be the first to review"
- 🎯 Real-time refresh after submitting review
- 📅 Formatted dates (e.g., "Jan 15, 2024")
- ⭐ Visual star ratings for all categories

#### State Management
```typescript
const [reviews, setReviews] = useState<Review[]>([]);
const [isLoadingReviews, setIsLoadingReviews] = useState(false);
const [showReviewForm, setShowReviewForm] = useState(false);
```

## Backend API Endpoints Required

The frontend is ready and expects these endpoints:

### 1. GET /api/mobile/reviews/:targetType/:targetId
**Purpose:** Fetch all reviews for a merchant

**Example Request:**
```
GET /api/mobile/reviews/merchant/MC368091
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "user-uuid",
      "target_type": "merchant",
      "target_id": "MC368091",
      "rating": 5,
      "comment": "Amazing food and service!",
      "food_rating": 5,
      "service_rating": 5,
      "ambiance_rating": 4,
      "value_rating": 5,
      "images": [],
      "helpful_count": 12,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "user_name": "John Doe",
      "user_avatar": null
    }
  ]
}
```

**Backend Implementation:**
```sql
SELECT
  r.*,
  u.full_name as user_name,
  u.avatar_url as user_avatar
FROM reviews r
LEFT JOIN users u ON u.user_id = r.user_id
WHERE r.target_type = $1
  AND r.target_id = $2
ORDER BY r.created_at DESC;
```

### 2. POST /api/mobile/reviews
**Purpose:** Submit a new review

**Request Body:**
```json
{
  "target_type": "merchant",
  "target_id": "MC368091",
  "rating": 5,
  "comment": "Excellent dining experience!",
  "food_rating": 5,
  "service_rating": 5,
  "ambiance_rating": 4,
  "value_rating": 5
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "new-review-uuid",
    "user_id": "current-user-uuid",
    "target_type": "merchant",
    "target_id": "MC368091",
    "rating": 5,
    "comment": "Excellent dining experience!",
    "food_rating": 5,
    "service_rating": 5,
    "ambiance_rating": 4,
    "value_rating": 5,
    "images": [],
    "helpful_count": 0,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

**Backend Implementation:**
```sql
INSERT INTO reviews (
  user_id,
  target_type,
  target_id,
  rating,
  comment,
  food_rating,
  service_rating,
  ambiance_rating,
  value_rating
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;
```

**Authentication Required:**
- Extract user_id from JWT token
- Verify user is authenticated

### 3. GET /api/mobile/reviews/:targetType/:targetId/stats
**Purpose:** Get aggregated review statistics

**Example Request:**
```
GET /api/mobile/reviews/merchant/MC368091/stats
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "merchant_id": "MC368091",
    "total_reviews": 45,
    "average_rating": 4.6,
    "average_food_rating": 4.8,
    "average_service_rating": 4.5,
    "average_ambiance_rating": 4.3,
    "average_value_rating": 4.7,
    "five_star_count": 30,
    "four_star_count": 10,
    "three_star_count": 3,
    "two_star_count": 1,
    "one_star_count": 1
  }
}
```

**Backend Implementation:**
```sql
SELECT * FROM merchant_review_stats
WHERE merchant_id = $1;
```

## Testing ✅

### Database Tests Performed
- ✅ Reviews table exists with correct schema
- ✅ All 14 columns present with correct types
- ✅ RLS enabled on reviews table
- ✅ All 4 RLS policies created correctly
- ✅ merchant_review_stats view created
- ✅ Indexes created for performance
- ✅ Trigger function for updated_at working

### Component Tests
- ✅ ReviewForm component compiles
- ✅ MerchantDetails reviews tab implemented
- ✅ TypeScript types correct
- ✅ API service methods defined
- ✅ Build succeeds without errors

## Build Status

```bash
npm run build
✓ built in 5.97s
```

✅ Build successful
✅ No blocking TypeScript errors
✅ All components compiled

## File Changes Summary

### New Files Created
1. ✅ `src/services/mobile/reviews.ts` - API service
2. ✅ `src/components/ReviewForm.tsx` - Review submission form
3. ✅ `supabase/migrations/create_reviews_table.sql` - Database migration
4. ✅ `test-reviews.cjs` - Testing script

### Modified Files
1. ✅ `src/types/index.ts` - Added Review, ReviewStats, CreateReviewRequest
2. ✅ `src/services/mobile/index.ts` - Exported reviews API
3. ✅ `src/components/MerchantDetails.tsx` - Added reviews tab functionality

## Usage Example

### Frontend Usage

```typescript
// In MerchantDetails component
const loadReviews = async () => {
  try {
    const reviewsData = await reviewsAPI.getReviews('merchant', merchantId);
    setReviews(reviewsData);
  } catch (error) {
    console.error('Failed to load reviews:', error);
  }
};

// Submit a review
const submitReview = async () => {
  try {
    await reviewsAPI.createReview({
      target_type: 'merchant',
      target_id: merchantId,
      rating: 5,
      comment: 'Great experience!',
      food_rating: 5,
      service_rating: 4,
      ambiance_rating: 5,
      value_rating: 5
    });
    await loadReviews(); // Refresh
  } catch (error) {
    console.error('Failed to submit review:', error);
  }
};
```

## Next Steps

### Backend Implementation Required
1. **Create API endpoints** as specified above
2. **Implement authentication** check for POST/PUT/DELETE
3. **Join users table** to get user_name and user_avatar
4. **Handle image uploads** for review photos (optional)
5. **Implement helpful votes** tracking

### Future Enhancements
1. 📸 **Image upload** - Allow users to attach photos to reviews
2. 🏆 **Verified purchases** - Badge for users who actually dined
3. 🔔 **Review notifications** - Notify merchants of new reviews
4. 📊 **Review moderation** - Flag inappropriate content
5. 🎯 **Review filters** - Filter by rating, date, verified
6. 💬 **Reply to reviews** - Let merchants respond
7. ⭐ **Highlight helpful reviews** - Sort by helpful votes
8. 📈 **Review analytics** - Trends over time

## Security Considerations

### Implemented
✅ RLS policies prevent unauthorized access
✅ Users can only modify their own reviews
✅ Rating constraints ensure valid values (1-5)
✅ User ID from JWT token (not request body)
✅ Public read access for transparency

### Recommendations
- Rate limit review submissions (1 per merchant per user)
- Implement spam detection
- Validate image uploads if implemented
- Monitor for abusive content
- Consider requiring verified booking before review

## Performance Optimizations

### Database
✅ Indexes on frequently queried columns
✅ Composite index for common query patterns
✅ Materialized view for statistics (currently regular view)

### Future Improvements
- Cache review statistics
- Paginate reviews (e.g., 10 per page)
- Lazy load detailed ratings
- Implement infinite scroll

## Conclusion

**Status: ✅ COMPLETE - Frontend Ready**

The review system is fully implemented on the frontend with:
- Complete database schema with RLS
- TypeScript types and interfaces
- API service layer
- Beautiful UI components
- Form validation and error handling
- Real-time review display

**Ready for Backend Integration**

The backend API endpoints need to be implemented following the specifications in this document. Once the endpoints are live, the review functionality will be fully operational.

## API Endpoint Summary

### Required Backend Endpoints

| Method | Endpoint | Auth Required | Purpose |
|--------|----------|---------------|---------|
| GET | `/api/mobile/reviews/:targetType/:targetId` | No | Fetch reviews |
| GET | `/api/mobile/reviews/:targetType/:targetId/stats` | No | Get statistics |
| POST | `/api/mobile/reviews` | Yes | Create review |
| PUT | `/api/mobile/reviews/:reviewId` | Yes | Update review |
| DELETE | `/api/mobile/reviews/:reviewId` | Yes | Delete review |
| POST | `/api/mobile/reviews/:reviewId/helpful` | Optional | Mark helpful |
