# Merchant Display Fix - Complete

## Issues Fixed

### 1. Merchant Names Not Displaying
**Problem**: Frontend was looking for `merchant.merchantId` and `merchant.companyName`
**Root Cause**: API returns `merchant.id` and `merchant.name`
**Fix**: Updated `enhanceMerchantImages()` to use fallback mapping:
```javascript
id: merchant.id || merchant.merchantId
name: merchant.name || merchant.companyName
```

### 2. Power Bank Counts Showing "0 PB Available"
**Problem**: Frontend was looking for wrong field names
**Root Cause**:
- API returns: `availablePowerbanks`, `totalPowerbanks`, `returnSlots`
- Frontend expected: `availableSlots`, `totalSlots`, `occupiedSlots`

**Fix**: Updated field mapping in `enhanceMerchantImages()`:
```javascript
const availableSlots = merchant.availablePowerbanks || 0
const totalSlots = merchant.totalPowerbanks || 0
const occupiedSlots = totalSlots - availableSlots
```

### 3. Wrong Field Displayed ("occupied" instead of "available")
**Problem**: UI components showing `occupiedSlots` for "PB Available" label
**Locations**:
- `ChargingStationModal.tsx` line 228
- `DiscoverView.tsx` line 237

**Fix**: Changed both to use `availableSlots`

## Files Modified

1. **src/services/mobile/merchantsEdge.ts**
   - Enhanced field mapping with fallbacks
   - Added power bank field conversions
   - Calculate occupied slots from total - available

2. **src/components/ChargingStationModal.tsx**
   - Fixed: `{occupiedSlots}` → `{availableSlots}` for "PB Available"

3. **src/components/DiscoverView.tsx**
   - Fixed: `{restaurant.occupiedSlots}` → `{restaurant.availableSlots}`

## Verification

Example: Lizzy Rest
- **Name**: "Lizzy Rest" ✅ (was missing)
- **Available PB**: 1 ✅ (was showing 0)
- **Total PB**: 8 ✅ (was showing 0)
- **Return Slots**: 1 ✅ (was correct)

## Next Steps

**Refresh your browser** (Ctrl+Shift+R or Cmd+Shift+R) to load the new build.

You should now see:
✅ Merchant names displayed correctly
✅ Accurate "X PB Available" counts from database
✅ Correct return slots
✅ All charging stations with real-time availability
