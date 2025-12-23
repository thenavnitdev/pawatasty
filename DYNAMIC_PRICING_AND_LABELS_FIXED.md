# Dynamic Pricing and Slot Labels - FULLY FIXED

## Summary
Replaced all hardcoded pricing text with dynamic backend values and fixed all slot labels to match proper terminology. Also corrected subcategory names in the database.

---

## What Was Fixed

### 1. ✅ Dynamic Pricing Display
**Before:** Hardcoded "€ Free / 60 Min"
**After:** Dynamic `€ {unit_price} / {unit_min} Min` from backend

**Changes Made:**
- Updated `MapLocationModal.tsx` (Charging-Only & Dining+Charging modals)
- Updated `ChargingStationModal.tsx`
- Added `unitPrice` and `unitMin` to all data flow:
  - `LocationData` interface in `MapLocationModal.tsx`
  - `Merchant` interface in `merchantsEdge.ts`
  - `Restaurant` interface in `types/index.ts`
  - Data mapping in `App.tsx`
  - Enhanced merchant images in `merchantsEdge.ts`
  - Location data passed from `MapView.tsx`

**Display Format:**
```typescript
€ {location.unitPrice || 'Free'} / {location.unitMin || '60'} Min
```

**Example Values:**
- Storkower Bar: € 1 / 30 Min
- RAR Damm: € 1 / 30 Min
- Boétie Rest: € 1 / 30 Min

---

### 2. ✅ Fixed Slot Labels

**Before:**
- `{availableSlots} PB available` ❌
- `{returnSlots} Return slots` ❌

**After:**
- `{occupiedSlots} Power banks in station` ✅
- `{availableSlots} Empty return slots` ✅

**Components Updated:**
- `MapLocationModal.tsx` - Charging-Only modal (line 272)
- `MapLocationModal.tsx` - Dining+Charging modal (line 426)
- `ChargingStationModal.tsx` (lines 202, 208)

**Mapping:**
| Database Field | Display Label |
|---------------|---------------|
| `occupied_slots` | Power banks in station |
| `available_slots` | Empty return slots |

---

### 3. ✅ Fixed Subcategory Names

**Database Table:** `merchant_subcategories`

**Before:**
| ID | Name (OLD) | Issue |
|----|-----------|-------|
| SC001 | "Dine  Bites & Drinks" | Double space, no slash |
| SC002 | "Charging Hub" | ✓ Correct |
| SC003 | "Bites  Drinks & Charging" | Double space, no slash |

**After:**
| ID | Name (NEW) | Business Type |
|----|-----------|---------------|
| SC001 | "Dine / Bites & Drinks" | diningonly |
| SC002 | "Charging Hub" | chargingonly |
| SC003 | "Bites / Drinks & Charging" | diningandcharging |

**Migration Applied:**
```sql
UPDATE merchant_subcategories
SET subcategory_name = 'Dine / Bites & Drinks'
WHERE subcategory_id = 'SC001';

UPDATE merchant_subcategories
SET subcategory_name = 'Bites / Drinks & Charging'
WHERE subcategory_id = 'SC003';
```

---

## Data Flow

### Complete Data Path
```
Database (merchants table)
  ↓ unit_price, unit_min, occupied_slots, available_slots, subcategory_id
Merchants Edge Function
  ↓ formatMerchant() includes all fields
merchantsEdgeAPI.getAllMerchants()
  ↓ enhanceMerchantImages() maps fields
App.tsx (loadMerchants)
  ↓ Maps to Restaurant interface with unitPrice, unitMin, subcategoryName
MapView.tsx (selectedRestaurant)
  ↓ Passes to locationData object
MapLocationModal components
  ↓ Displays dynamic pricing and correct labels
USER SEES CORRECT DATA ✓
```

### Fields Added to Interfaces

1. **LocationData** (MapLocationModal.tsx):
   ```typescript
   unitPrice?: string;
   unitMin?: string;
   ```

2. **Merchant** (merchantsEdge.ts):
   ```typescript
   unitPrice?: string;
   unitMin?: string;
   ```

3. **Restaurant** (types/index.ts):
   ```typescript
   unitPrice?: string;
   unitMin?: string;
   ```

---

## Verification

### Sample Merchant Data
From database query:
```json
{
  "merchant_id": "MC258520",
  "company_name": "Storkower Bar",
  "business_type": "diningonly",
  "subcategory_id": "SC001",
  "unit_price": "1",
  "unit_min": "30",
  "rating": "4.00",
  "review_count": 1
}
```

### What Users See Now

**Charging-Only Modal:**
```
€ 1 / 30 Min
5 Power banks in station
3 Empty return slots
```

**Dining + Charging Modal:**
```
Bites / Drinks & Charging

€ 1 / 30 Min
5 Power banks in station
3 Empty return slots
```

---

## Testing

All changes have been:
- ✅ Built successfully with `npm run build`
- ✅ Type-checked with TypeScript
- ✅ Verified with database queries
- ✅ Tested data flow from edge function to UI

### Test Commands
```bash
# Verify merchants loading with all fields
node verify-merchants-loading.cjs

# Verify subcategory names
# SELECT * FROM merchant_subcategories;

# Check merchant pricing data
# SELECT merchant_id, company_name, unit_price, unit_min
# FROM merchants WHERE unit_price IS NOT NULL;
```

---

## Summary of Changes

### Files Modified
1. ✅ `src/components/MapLocationModal.tsx` - Dynamic pricing & labels (both modals)
2. ✅ `src/components/ChargingStationModal.tsx` - Slot labels
3. ✅ `src/components/MapView.tsx` - Pass unitPrice/unitMin to modals
4. ✅ `src/services/mobile/merchantsEdge.ts` - Interface & mapping
5. ✅ `src/types/index.ts` - Restaurant interface
6. ✅ `src/App.tsx` - Data mapping
7. ✅ `supabase/migrations/fix_subcategory_names.sql` - DB names

### Database Changes
- ✅ Fixed subcategory names with proper formatting

### Result
- ✅ All pricing is now dynamic from backend
- ✅ All slot labels are correct and clear
- ✅ All subcategory names display properly
- ✅ Complete data flow from database to UI

**Status: FULLY FUNCTIONAL** 🎉
