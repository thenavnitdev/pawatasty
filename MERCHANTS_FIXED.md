# Merchants Display Issue - FIXED

## Problem Summary
Merchants and branches were not showing on the map view and discover sections due to three critical issues:

1. **Authentication Required for Public Data** - The edge function caller required authentication even for public merchant data
2. **Overly Restrictive Filtering** - Both MapView and DiscoverView were hiding merchants without reviews OR charging stations
3. **Incorrect Database Relationship** - The merchants edge function had wrong foreign key reference name

## What Was Fixed

### 1. Public Access for Edge Functions ✓
**Files Changed:**
- `src/services/edgeFunctions.ts`
- `src/services/mobile/merchantsEdge.ts`
- `src/services/mobile/categoriesEdge.ts`
- `src/services/mobile/stationsEdge.ts`
- `src/services/mobile/reviewsEdge.ts`

**Changes:**
- Added `requireAuth` parameter to edge function calls (default: true)
- Made public endpoints accessible without authentication:
  - Merchants (all, by ID, nearby)
  - Categories
  - Stations
  - Reviews (read-only)
- Kept authentication for user-specific operations (bookings, creating reviews, etc.)

### 2. Removed Restrictive Filtering ✓
**Files Changed:**
- `src/components/MapView.tsx`
- `src/components/DiscoverView.tsx`

**Before:**
```typescript
// MapView - Required reviews OR stations
const validRestaurants = restaurants.filter(restaurant => {
  const hasRating = (restaurant.reviewCount || 0) > 0;
  const hasStations = (restaurant.availableSlots || 0) > 0;
  return hasRating || hasStations; // ❌ Too restrictive!
});
```

**After:**
```typescript
// MapView - Only requires valid coordinates
const validRestaurants = restaurants.filter(restaurant => {
  const hasValidLocation = restaurant.latitude && restaurant.longitude;
  return hasValidLocation; // ✅ Shows all merchants with coordinates
});
```

**DiscoverView:**
- Before: Required reviews OR stations, excluded charging-only
- After: Shows all merchants EXCEPT charging-only (regardless of reviews/stations)

### 3. Fixed Database Relationship ✓
**File Changed:**
- `supabase/functions/merchants/index.ts`

**Changes:**
- Fixed foreign key reference from `merchants_merchant_id_fkey` to `merchant_deals_merchant_id_fkey`
- Redeployed the merchants edge function

## Verification Results

✅ **Test Results:**
- Total merchants: 38
- All with valid coordinates: 38
- Will show in MapView: **38 merchants**
- Will show in DiscoverView: **31 merchants** (7 charging-only filtered out)
- Merchants with deals: 19
- Merchants with reviews: 18

## Business Logic

### MapView
Shows ALL merchants that have valid latitude/longitude coordinates, including:
- Dining-only merchants (with or without reviews)
- Dining + Charging merchants
- Charging-only stations

### DiscoverView
Shows all merchants EXCEPT charging-only, including:
- Dining-only merchants (even without reviews)
- Dining + Charging merchants

Charging-only stations are excluded from Discover as it's focused on dining experiences.

## What You Should See Now

1. **Map View**: All 38 merchants should appear as markers on the map
2. **Discover View**: 31 merchants should appear in the list (dining merchants)
3. **Appropriate Modals**: Clicking merchants shows the correct modal based on business type:
   - Dining-only → Dining modal with deals
   - Charging-only → Charging modal with station info
   - Dining + Charging → Combined modal with both features

## Testing

Run the verification script anytime to check merchant loading:
```bash
node verify-merchants-loading.cjs
```

This will show:
- Total merchants loaded
- Business type breakdown
- What will display in each view
- Sample merchant data

## Summary

All issues are resolved. Merchants now load without authentication, display correctly in both MapView and DiscoverView, and show appropriate modals based on their business type.
