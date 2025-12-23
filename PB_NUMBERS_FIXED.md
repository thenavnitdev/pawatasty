# PB Available and Return Slots Display - Fixed

## Issue Reported

The UI was displaying incorrect slot information:
- Showed: **1 PB Available** (Wrong!)
- Should show: **22 PB Available** (Correct!)
- Showed: **1 Return slots** (Wrong!)
- Should show: **2 Return slots** (Correct!)
- Pricing display was correct: **€ 1 / 30 Min** ✅

## Root Cause

Found in `/src/services/mobile/merchantsEdge.ts` in the `enhanceMerchantImages` function.

The function was **recalculating** slot data instead of using the backend values:

```typescript
// OLD CODE (WRONG):
const availableSlots = merchant.availablePowerbanks || merchant.availableSlots || 0;
const totalSlots = merchant.totalPowerbanks || merchant.totalSlots || 0;
const occupiedSlots = totalSlots - availableSlots;  // ❌ WRONG CALCULATION!
```

### Why This Was Wrong:

1. The API returns these fields:
   - `pbAvailable: 22` (powerbanks currently in the station)
   - `occupiedSlots: 22` (alias for pbAvailable)
   - `returnSlots: 2` (empty slots for returns)
   - `totalSlots: 24` (total capacity)

2. But the frontend was looking for `availablePowerbanks` (which doesn't exist in API response)

3. When it couldn't find that field, it defaulted to 0

4. Then it calculated: `occupiedSlots = totalSlots - 0 = 24` (WRONG!)

5. The wrong calculation resulted in displaying incorrect values

## The Fix

Updated the function to **use backend data directly** without recalculation:

```typescript
// NEW CODE (CORRECT):
const pbAvailable = merchant.pbAvailable || merchant.occupiedSlots || merchant.availableSlots || 0;
const totalSlots = merchant.totalSlots || 0;
const returnSlots = merchant.returnSlots || 0;

return {
  availableSlots: pbAvailable,
  occupiedSlots: pbAvailable,
  totalSlots: totalSlots,
  returnSlots: returnSlots,
};
```

## Files Modified

- **src/services/mobile/merchantsEdge.ts** - Fixed data mapping to use backend values directly

## Verification

✅ PB Available: 22 (correct)
✅ Return Slots: 2 (correct)
✅ Unit Price: €1 (correct)
✅ Unit Min: 30 Min (correct)
