# Database Field Mapping Update - Complete

## Summary
Updated all database field references from old naming convention to new naming convention across the entire system.

## Database Column Changes

### `station_items` table (previously `merchant_branches`)
- `occupied_slots` → `pb_available` (powerbanks available for rent)
- `available_slots` → `return_slots` (empty slots for returning powerbanks)
- `total_capacity` → unchanged (total station capacity)

## Updated Components

### 1. Edge Functions ✅

#### `merchants/index.ts`
- Reads from `pb_available` and `return_slots` columns
- Maps to API response with multiple field names for compatibility:
  - `pbAvailable` (primary field)
  - `occupiedSlots` (alias for backward compatibility)
  - `returnSlots` (return slots)
  - `availableSlots` (deprecated but maintained)

#### `stations/index.ts`
- Updated to read from `pb_available` and `return_slots`
- Returns same field mappings as merchants endpoint
- Handles both single station and list queries

#### `orders-management/index.ts`
- Updated rental logic: Decrements `pb_available` when renting
- Updated return logic: Increments `pb_available` when returning
- Validation checks now use `pb_available` field

### 2. Frontend Components ✅

All frontend components already use the correct field mappings:

#### `DiscoverView.tsx`
- Lines 234, 286, 329: Uses `restaurant.occupiedSlots` for "X PB Available"

#### `MerchantDetails.tsx`
- Lines 629-634: Uses `restaurant.occupiedSlots` for "X PB Available"

#### `ChargingStationModal.tsx`
- Line 227: Uses `station.occupiedSlots` for "X PB Available"
- Line 233: Uses `station.returnSlots` for "X Return slots"

## API Response Structure

All endpoints now return station data with this structure:

```json
{
  "totalSlots": 70,
  "pbAvailable": 59,
  "occupiedSlots": 59,
  "returnSlots": 18,
  "availableSlots": 59
}
```

## Field Semantics

- **pbAvailable / occupiedSlots**: Number of charged powerbanks ready to rent
- **returnSlots**: Number of empty slots available for returning powerbanks
- **totalSlots**: Total capacity of the station

## Operations

### Renting a Powerbank
1. Check `pb_available > 0`
2. Create order
3. Decrement `pb_available` by 1

### Returning a Powerbank
1. Validate order is active
2. Update order status to completed
3. Increment `pb_available` by 1 at return station

## Status

✅ All database queries updated
✅ All edge functions deployed
✅ Frontend components verified
✅ Build successful

The system is now fully operational with the new field mappings!
