# City Display and Deal Images - Fixed

## Issues Resolved

### 1. City Showing Address Instead of City Name

**Problem:**
- The merchant detail page was showing "City: Banstraat 61" (the address) instead of "City: Amsterdam" (the actual city)

**Root Cause:**
- The `city` field was missing from the data mapping in `App.tsx` when transforming merchant data from the API to the Restaurant type
- Even though the database and API were returning the correct city, it wasn't being passed to the component

**Fix Applied:**
- Added `city: merchant.city,` to the merchant data mapping in `App.tsx` at line 77
- Now the complete data flow works correctly:
  1. Database: `merchant_branches.city = "Amsterdam"` ✅
  2. API Response: `city: "Amsterdam"` ✅
  3. App.tsx mapping: `city: merchant.city` ✅
  4. MerchantDetails display: Shows "Amsterdam" ✅

### 2. Deal Images Not Displaying

**Problem:**
- Deals were showing but without images
- Deal data in the API response was missing

**Root Cause:**
- The merchants edge function (`/functions/v1/merchants`) was only fetching deals when requesting a single merchant by ID
- When fetching all merchants (for the map/list view), deals were not included in the response
- This meant the deals array was empty: `deals: []`

**Fix Applied:**
- Updated the merchants edge function to fetch all deals in the main GET endpoint:
  ```typescript
  // Fetch all deals
  const { data: allDeals } = await supabase
    .from('merchant_deals')
    .select('*')
    .eq('bookable', true);

  // Map deals by merchant_id
  const dealsByMerchant = new Map();
  if (allDeals) {
    for (const deal of allDeals) {
      if (!dealsByMerchant.has(deal.merchant_id)) {
        dealsByMerchant.set(deal.merchant_id, []);
      }
      dealsByMerchant.get(deal.merchant_id).push(transformDeal(deal));
    }
  }
  ```
- Added deals to each location when building the response:
  ```typescript
  const deals = dealsByMerchant.get(merchant.merchant_id) || [];
  const location = transformMerchant(merchant, branch, stationData);
  allLocations.push({ ...location, deals });
  ```
- Deployed the updated edge function to production

## Verification Results

### API Response for Amsterdam Branch:
```json
{
  "id": "BR000005",
  "name": "newiono - Amsterdam",
  "address": "Banstraat 61",
  "city": "Amsterdam",  // ✅ Correct city
  "deals": [            // ✅ Deals now included
    {
      "id": 3,
      "title": "Ronise Daluz 9",
      "imageIds": [237],
      "imageUrl": "237",
      "originalPrice": 0,
      "discountPercent": "60"
    },
    {
      "id": 1,
      "title": "2IN1 ",
      "imageIds": [235],
      "imageUrl": "235",
      "originalPrice": 50,
      "discountPercent": "0"
    },
    {
      "id": 2,
      "title": "8 in 1 Deal",
      "imageIds": [234],
      "imageUrl": "234",
      "originalPrice": 50,
      "discountPercent": "50"
    }
  ]
}
```

### Test Results:
✅ **City Display**: PASSED - Shows "Amsterdam" instead of address
✅ **Deal Images**: PASSED - All 3 deals have image IDs (237, 235, 234)

## How Images Display in UI

The deal images flow through the system as follows:

1. **API returns**: `imageUrl: "237"` and `imageIds: [237]`
2. **MerchantDetails component**: Extracts image ID via `apiDeal.imageUrl || (apiDeal.imageIds && apiDeal.imageIds[0])`
3. **getDealImageUrl()**: Converts image ID to proxy URL: `/functions/v1/image-proxy/237`
4. **Image proxy**: Fetches the actual image from the backend API with proper authentication
5. **Browser displays**: The actual deal image

## Files Modified

1. **src/App.tsx** - Added `city` field to merchant data mapping
2. **supabase/functions/merchants/index.ts** - Added deals fetching and mapping to all merchants endpoint

## Build Status

✅ Build completed successfully
✅ All changes compiled and deployed
