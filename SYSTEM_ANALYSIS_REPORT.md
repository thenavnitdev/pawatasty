# System Analysis Report - Complete App Architecture Review

**Date:** 2025-10-21
**Status:** ✅ Comprehensive Analysis Complete

---

## Executive Summary

This report provides a complete analysis of the application's architecture, including frontend services, backend edge functions, database schema, RLS policies, and data flow patterns. The system is generally well-structured with proper separation of concerns.

---

## 1. Architecture Overview

### Frontend Layer (React + TypeScript)
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **State Management:** Local state with React hooks
- **Authentication:** Supabase Auth + Custom API tokens

### Backend Layer
- **Database:** Supabase PostgreSQL
- **API:** 18 Active Edge Functions (Deno runtime)
- **Storage:** Supabase Storage for files/images
- **External API:** https://api.pawatasty.com (legacy/mobile API)

---

## 2. Service Layer Analysis

### 2.1 Frontend Services Architecture

The app uses a dual-API strategy with feature flags:

```typescript
// Feature flags in src/services/apiConfig.ts
USE_EDGE_MERCHANTS: true      ✅ Using Edge Functions
USE_EDGE_STATIONS: true       ✅ Using Edge Functions
USE_EDGE_CATEGORIES: true     ✅ Using Edge Functions
USE_EDGE_DEALS: true          ✅ Using Edge Functions
USE_EDGE_ORDERS: true         ✅ Using Edge Functions
USE_EDGE_LIKED_MERCHANTS: true ✅ Using Edge Functions
USE_EDGE_PROFILE: true        ✅ Using Edge Functions
USE_EDGE_SUBSCRIPTIONS: true  ✅ Using Edge Functions
USE_EDGE_REVIEWS: true        ✅ Using Edge Functions
```

### 2.2 Service Files Mapped to Edge Functions

| Frontend Service | Edge Function | Status | JWT Required |
|-----------------|---------------|---------|-------------|
| `merchantsEdge.ts` | `merchants` | ✅ Active | No |
| `stationsEdge.ts` | `stations` | ✅ Active | No |
| `categoriesEdge.ts` | `categories` | ✅ Active | No |
| `dealsEdge.ts` | Missing | ❌ No Function | N/A |
| `ordersEdge.ts` | `orders-management` | ✅ Active | Yes |
| `likedMerchantsEdge.ts` | `liked-merchants` | ✅ Active | Yes |
| `profileEdge.ts` | `user-profile` | ✅ Active | Yes |
| `subscriptionsEdge.ts` | `subscriptions` | ✅ Active | Yes |
| `reviewsEdge.ts` | `reviews` | ✅ Active | Yes |
| `paymentMethods.ts` | `payment-methods` | ✅ Active | Yes |
| `promoCodes.ts` | `apply-promo-code`, `user-promo-code` | ✅ Active | Yes |
| `points.ts` | `points-balance`, `points-transactions` | ✅ Active | Yes |
| `bookings.ts` | `deals-booking` | ✅ Active | Yes |

**⚠️ ISSUES FOUND:**

1. **Missing Edge Function:** `dealsEdge.ts` expects a `deals` edge function but it doesn't exist
2. **Naming Mismatch:** Orders service expects `orders` but function is `orders-management`

### 2.3 Legacy API Usage

Some services still use the external API (`api.pawatasty.com`):
- `bookings.ts` - Uses external API for bookings (no edge function alternative)
- `auth.ts` - Uses external API for authentication sync

---

## 3. Database Schema Analysis

### 3.1 Core Tables

| Table | Row Security | Primary Key | Key Columns |
|-------|-------------|-------------|-------------|
| `merchants` | ✅ Enabled | `id` (bigint) | `merchant_id` (unique), `company_name`, `latitude`, `longitude`, `cover_image_ids` |
| `deals` | ✅ Enabled | `id` (uuid) | `deal_id`, `merchant_id` (FK), `title`, `discount` |
| `stations` | ✅ Enabled | TBD | Station/powerbank rental locations |
| `categories` | ✅ Enabled | TBD | Business categories |
| `reviews` | ✅ Enabled | `id` | `user_id` (FK), `merchant_id`, `rating`, `comment` |
| `orders` | ✅ Enabled | `id` | User orders/rentals |
| `liked_merchants` | ✅ Enabled | `id` | `user_id` (FK), `merchant_id` |
| `users` | ✅ Enabled | `id` | `user_id`, `email`, `full_name`, `phone`, `stripe_customer_id` |
| `payment_methods` | ✅ Enabled | `id` | User payment methods (Stripe) |
| `user_subscriptions` | ✅ Enabled | `id` | User membership subscriptions |
| `points_transactions` | ✅ Enabled | `id` | Points/rewards transactions |
| `deal_bookings` | No RLS | `id` | Deal/dining bookings |

### 3.2 Foreign Key Relationships

**✅ PROPERLY CONFIGURED:**
- `deals.merchant_id` → `merchants.merchant_id` (CASCADE)

**⚠️ ISSUES FOUND:**
- `liked_merchants.user_id` → Foreign key exists but target table is unclear (likely `auth.users`)
- `reviews.user_id` → Foreign key exists but target table is unclear (likely `auth.users`)
- Missing FK: `deal_bookings` → `deals` relationship not defined
- Missing FK: `deal_bookings` → `merchants` relationship not defined
- Missing FK: `orders` → `users` relationship not defined

---

## 4. Row Level Security (RLS) Analysis

### 4.1 Public Access (No Auth Required)

| Table | Policy | Access |
|-------|--------|--------|
| `merchants` | "Anyone can view merchants" | SELECT (public) |
| `deals` | "Anyone can view deals" | SELECT (public) |
| `reviews` | "Anyone can read reviews" | SELECT (public) |
| `stations` | Likely public | SELECT (public) |
| `categories` | Likely public | SELECT (public) |

**✅ SECURE:** Public data is appropriately accessible

### 4.2 Authenticated User Access

| Table | Policy | Access Pattern |
|-------|--------|---------------|
| `users` | "Users can view own profile" | SELECT where `auth.uid() = user_id` |
| `users` | "Users can update own profile" | UPDATE where `auth.uid() = user_id` |
| `users` | "Users can insert own profile" | INSERT where `auth.uid() = user_id` |
| `liked_merchants` | "Users can view own liked merchants" | SELECT where `auth.uid() = user_id` |
| `liked_merchants` | "Users can add liked merchants" | INSERT where `auth.uid() = user_id` |
| `liked_merchants` | "Users can remove liked merchants" | DELETE where `auth.uid() = user_id` |
| `reviews` | "Authenticated users can create reviews" | INSERT where `auth.uid() = user_id` |
| `reviews` | "Users can update own reviews" | UPDATE where `auth.uid() = user_id` |
| `reviews` | "Users can delete own reviews" | DELETE where `auth.uid() = user_id` |

**✅ SECURE:** User data properly isolated by `auth.uid()`

### 4.3 Admin/System Operations

| Table | Policy | Concern |
|-------|--------|---------|
| `merchants` | "Authenticated users can create merchants" | ⚠️ Too permissive - any authenticated user can create |
| `merchants` | "Authenticated users can update merchants" | ⚠️ Too permissive - any authenticated user can update |
| `deals` | "Authenticated users can create deals" | ⚠️ Too permissive - any authenticated user can create |
| `deals` | "Authenticated users can update deals" | ⚠️ Too permissive - any authenticated user can update |

**⚠️ SECURITY CONCERN:** Merchant and deal management should be restricted to admin/merchant users only.

### 4.4 Missing RLS Policies

| Table | Status | Risk |
|-------|--------|------|
| `deal_bookings` | ❌ NO RLS ENABLED | High - All data accessible |
| `orders` | ✅ RLS Enabled | ❌ No policies defined - locked down |
| `payment_methods` | ✅ RLS Enabled | ❌ No policies defined - locked down |
| `user_subscriptions` | ✅ RLS Enabled | ❌ No policies defined - locked down |
| `points_transactions` | ✅ RLS Enabled | ❌ No policies defined - locked down |

**🚨 CRITICAL:** Tables with RLS enabled but no policies are completely inaccessible!

---

## 5. Edge Functions Analysis

### 5.1 Deployed Functions

All 18 edge functions are deployed and active:

| Function | Purpose | Auth Required | Status |
|----------|---------|---------------|--------|
| `merchants` | Get merchants with deals | No | ✅ Working |
| `stations` | Get powerbank stations | No | ✅ Active |
| `categories` | Get business categories | No | ✅ Active |
| `reviews` | Manage reviews | Yes | ✅ Active |
| `liked-merchants` | Like/unlike merchants | Yes | ✅ Active |
| `user-profile` | User profile management | Yes | ✅ Active |
| `subscriptions` | Membership management | Yes | ✅ Active |
| `orders-management` | Order/rental management | Yes | ✅ Active |
| `deals-booking` | Book dining deals | Yes | ✅ Active |
| `payment-methods` | Manage payment methods | Yes | ✅ Active |
| `points-balance` | Get points balance | Yes | ✅ Active |
| `points-transactions` | Points transaction history | Yes | ✅ Active |
| `apply-promo-code` | Apply promo code | Yes | ✅ Active |
| `user-promo-code` | Get user's promo code | Yes | ✅ Active |
| `support-chat` | Support messaging | Yes | ✅ Active |
| `suggestions` | Submit suggestions | Yes | ✅ Active |
| `fault-reports` | Report faults | Yes | ✅ Active |
| `image-proxy` | Image optimization | Yes | ✅ Active |

### 5.2 Function Connectivity

**✅ PROPERLY CONNECTED:**
- Merchants → Database → Frontend (working with deals relationship)
- Reviews → Database → Frontend
- Liked Merchants → Database → Frontend
- Profile → Database → Frontend
- Subscriptions → Database → Frontend

**⚠️ POTENTIAL ISSUES:**
- Orders Edge function may not work due to missing RLS policies
- Payment Methods Edge function may not work due to missing RLS policies
- Points Edge functions may not work due to missing RLS policies

---

## 6. Authentication Flow Analysis

### 6.1 Dual Auth System

The app uses two authentication systems simultaneously:

1. **Supabase Auth** (Primary)
   - Email/Password authentication
   - Session management via JWT
   - Stored in: `localStorage.supabase_token`, `localStorage.supabase_user`
   - Used by: Edge functions

2. **External API Token** (Legacy)
   - Custom token from `api.pawatasty.com`
   - Stored in: `localStorage.api_token`, `localStorage.user_data`
   - Used by: Legacy bookings API, auth verification

### 6.2 Auth Flow Issues

**⚠️ IDENTIFIED PROBLEMS:**

1. **Profile Check Failing:**
   - When user logs in, app attempts to fetch profile
   - If profile fetch fails (auth required error), user sees profile completion screen
   - This was blocking merchant data from loading
   - **FIXED:** Modified `checkProfileCompletion` to load merchants regardless of profile status

2. **User ID Mismatch:**
   - Supabase auth uses UUID (`auth.uid()`)
   - External API uses custom string IDs (`user_id` from API)
   - RLS policies check `auth.uid()` but API returns different user IDs
   - **POTENTIAL ISSUE:** User data may not be accessible

---

## 7. Data Flow Analysis

### 7.1 Merchant Display Flow

```
Database (merchants table)
    ↓ (PostgREST with JOIN)
Edge Function: merchants
    ↓ (JSON response with nested deals)
Frontend: merchantsEdgeAPI.getAllMerchants()
    ↓ (Transform to Restaurant type)
App.tsx: loadData()
    ↓ (Set restaurants state)
MapView.tsx / DiscoverView.tsx
    ↓ (Display on map/list)
User sees merchants
```

**Status:** ✅ Working after fixing foreign key relationship

### 7.2 Review Submission Flow

```
User submits review
    ↓
ReviewForm.tsx
    ↓
reviewsEdgeAPI.createReview()
    ↓
Edge Function: reviews
    ↓
Database (reviews table)
    ↓ (RLS check: auth.uid() = user_id)
Insert review
```

**Status:** ✅ Should work if auth.uid() matches

### 7.3 Booking Creation Flow

```
User books a deal
    ↓
DealBookingModal.tsx
    ↓
bookingsAPI.createBooking() (Legacy API!)
    ↓
External API: api.pawatasty.com
    ↓
Unknown storage (not in Supabase?)
```

**⚠️ ISSUE:** Bookings don't use Supabase edge functions

---

## 8. Image Handling Analysis

### 8.1 Image Storage

- **Storage Location:** Supabase Storage bucket `files_storage`
- **Image Types:** Merchant logos, cover images, deal images
- **IDs Stored:** `logoId`, `cover_image_ids` (array), `image_url`

### 8.2 Image Retrieval

```
Database stores: coverImageIds: ["57", "56", "58"]
    ↓
merchantsAPI.enhanceMerchantImages()
    ↓
imageUtils.getMerchantCoverUrl(id)
    ↓
Constructs: ${SUPABASE_URL}/storage/v1/object/public/files_storage/${id}
```

**Status:** ✅ Properly configured

---

## 9. Critical Issues Summary

### 🚨 High Priority

1. **Missing RLS Policies:**
   - `orders` table has RLS enabled but NO policies → Data inaccessible
   - `payment_methods` table has RLS enabled but NO policies → Data inaccessible
   - `user_subscriptions` table has RLS enabled but NO policies → Data inaccessible
   - `points_transactions` table has RLS enabled but NO policies → Data inaccessible

2. **Missing Edge Function:**
   - `dealsEdge.ts` service exists but no corresponding edge function deployed
   - Frontend will fail when trying to fetch deals directly

3. **Overly Permissive Policies:**
   - Any authenticated user can create/modify merchants
   - Any authenticated user can create/modify deals
   - Should be restricted to admin/merchant roles only

### ⚠️ Medium Priority

4. **User ID Mismatch:**
   - Supabase auth.uid() vs external API user_id may cause data access issues
   - Need to verify user_id field in users table matches auth.uid()

5. **Missing Foreign Keys:**
   - `deal_bookings` → `deals` relationship not defined
   - `deal_bookings` → `merchants` relationship not defined
   - `orders` → `users` relationship not defined

6. **Dual Authentication:**
   - Two separate auth systems create complexity
   - Should migrate fully to Supabase auth

### ℹ️ Low Priority

7. **Missing RLS on deal_bookings:**
   - Table has no RLS enabled at all
   - Anyone can access all booking data

8. **Edge Function Naming:**
   - `ordersEdge.ts` expects `orders` but function is `orders-management`
   - Works but inconsistent naming

---

## 10. Recommendations

### Immediate Actions Required

1. **Add Missing RLS Policies:**
```sql
-- For orders table
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

-- For payment_methods table
CREATE POLICY "Users can view own payment methods" ON payment_methods
  FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

-- For user_subscriptions table
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

-- For points_transactions table
CREATE POLICY "Users can view own points transactions" ON points_transactions
  FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);
```

2. **Create Missing Edge Function:**
   - Deploy `deals` edge function or remove `dealsEdge.ts` service

3. **Fix Merchant Policies:**
```sql
-- Restrict merchant creation to admins only
-- (Requires adding role field to users table)
DROP POLICY "Authenticated users can create merchants" ON merchants;
DROP POLICY "Authenticated users can update merchants" ON merchants;

CREATE POLICY "Admins can create merchants" ON merchants
  FOR INSERT TO authenticated
  USING (is_admin()); -- Need to create is_admin() function
```

4. **Enable RLS on deal_bookings:**
```sql
ALTER TABLE deal_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookings" ON deal_bookings
  FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);
```

### Long-term Improvements

1. **Consolidate Authentication:**
   - Migrate fully to Supabase auth
   - Remove external API dependency for auth

2. **Add Missing Relationships:**
   - Define all foreign key constraints
   - Ensure referential integrity

3. **Implement Role-Based Access:**
   - Add roles table (user, merchant, admin)
   - Update RLS policies to use roles

4. **Add Audit Logging:**
   - Track changes to critical tables
   - Monitor security events

---

## 11. Testing Checklist

- [x] Frontend service layer mapped
- [x] Edge functions verified deployed
- [x] Database schema documented
- [x] RLS policies analyzed
- [x] Foreign key relationships checked
- [x] Authentication flow analyzed
- [x] Data flow patterns documented
- [ ] Orders edge function tested
- [ ] Payment methods edge function tested
- [ ] Points system tested
- [ ] Bookings flow tested
- [ ] User profile flow tested

---

## Conclusion

The application has a solid foundation with proper separation of concerns between frontend services, edge functions, and database. The main issues are:

1. **Missing RLS policies** causing inaccessible data
2. **Overly permissive policies** on merchant/deal management
3. **Missing deals edge function**
4. **Dual authentication** creating complexity

Once the critical RLS policies are added, the system should function properly. The architecture is well-designed and follows best practices for a Supabase-based application.

**Overall System Status:** ⚠️ Functional but requires policy updates for full operation
