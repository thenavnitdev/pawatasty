# Business Type Display Fix

## Problem
The `businessType` field from the database was not being displayed correctly in the modals. Only "DiningOnly" merchants were showing, even though "ChargingOnly" merchants existed in the database with correct `businessType` values.

## Root Cause
The `businessType` field was not being passed through the entire data flow from the API to the UI components:

1. **Merchant Interface** - Missing `businessType` in TypeScript interfaces
2. **App.tsx** - Merchant mapping didn't include `businessType` or station data
3. **Restaurant Type** - Missing `merchantCategory` and `businessType` fields
4. **Component Logic** - Components were checking old field names or not checking at all

## Changes Made

### 1. Updated Merchant Interface (`src/services/mobile/merchantsEdge.ts`)
- Added `merchantCategory?: string`
- Added `businessType?: string`
- Updated `enhanceMerchantImages()` to map `businessType` from API

### 2. Updated Restaurant Type (`src/types/index.ts`)
- Added `merchantCategory?: string`
- Added `businessType?: string`
- These fields now properly flow through the type system

### 3. Fixed Merchant Mapping (`src/App.tsx`)
- Added `merchantCategory` to merchant mapping
- Added `businessType` to merchant mapping
- Added charging station data: `occupiedSlots`, `totalSlots`, `returnSlots`, `hasStation`
- Added console logging to track `businessType` values

### 4. Updated DiscoverView (`src/components/DiscoverView.tsx`)
- Fixed filtering logic to check both `businessType === 'chargingonly'` AND `merchantCategory === 'chargingonly'`
- Added detailed console logging for debugging
- Passes `businessType` and station data to MerchantDetails

### 5. Updated MerchantDetails (`src/components/MerchantDetails.tsx`)
- Added `businessType`, `availableSlots`, `totalSlots`, `returnSlots` to props interface
- Added console logging to track received data
- Conditionally renders `ChargingStationModal` when `businessType === 'chargingonly'`

### 6. Updated MapView (`src/components/MapView.tsx`)
- Added `businessType` check in modal logic
- Updated charging-only condition: `businessType === 'chargingonly' || partnershipType === 'map_chargingonly'`
- Updated dining+charging condition: `businessType === 'diningandcharging' || partnershipType === 'map_both'`
- Added console logging for debugging

## Result
Now the system properly:
1. Fetches `businessType` from the database
2. Passes it through all layers (API → App → Components)
3. Displays the correct modal based on `businessType`:
   - `'chargingonly'` → ChargingStationModal
   - `'diningonly'` → Standard MerchantDetails with deals
   - `'diningandcharging'` → Combined modal with both features

## Testing
The console logs will now show:
- `🏪 Merchant mapping: { businessType, merchantCategory }` in App.tsx
- `🔍 Filtering merchant: { businessType, merchantCategory }` in DiscoverView
- `🏪 MerchantDetails received: { businessType }` in MerchantDetails
- `🗺️ MapView Modal Logic: { businessType }` in MapView

This makes it easy to verify that `businessType` is flowing correctly through the entire system.
