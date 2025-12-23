# Station Data Mapping Fixed

## Summary
Fixed incorrect data mapping for station_items across all pages (MapView, Discover, and Merchant Details). The data now accurately reflects:

- **PB Available** = `occupied_slots` (powerbanks in the station available to rent)
- **Return Slots** = `available_slots` (empty slots to return powerbanks)
- **Total Capacity** = `total_capacity` (total slots in the station)

## Database Schema
The `station_items` table has these key fields:
- `total_capacity` - Total number of slots in the station
- `occupied_slots` - Number of powerbanks currently in the station (available to rent)
- `available_slots` - Number of empty slots (for returning powerbanks)

## Changes Made

### 1. Edge Functions

#### merchants/index.ts
- **Line 96-98**: Changed calculation logic
  - Before: `availablePowerbanks = totalPowerbanks - occupiedPowerbanks`
  - After: Read `available_slots` directly from database
- **Line 121-124**: Fixed data mapping
  - `availableSlots: occupiedSlots` (PB Available to rent)
  - `occupiedSlots: occupiedSlots` (same value)
  - `returnSlots: availableSlots` (empty slots for returns)
- **Line 193, 260**: Added `available_slots` to database queries

#### stations/index.ts
- **Line 54-56**: Changed calculation logic
  - Before: `calculatedAvailableSlots = totalCapacity - occupiedSlots`
  - After: Read `available_slots` directly from database
- **Line 65-67, 127-129**: Fixed data mapping
  - `availableSlots: occupiedSlots` (PB Available to rent)
  - `occupiedSlots: occupiedSlots` (same value)
  - `returnSlots: availableSlots` (empty slots for returns)

### 2. TypeScript Interfaces

#### stationsEdge.ts
- Added `occupiedSlots` and `returnSlots` to Station interface

### 3. Frontend Components

#### DiscoverView.tsx
- **Line 234**: Changed from `restaurant.availableSlots` to `restaurant.occupiedSlots` for "PB Available" display

#### MerchantDetails.tsx
- **Line 629**: Changed from `restaurant.availableSlots` to `restaurant.occupiedSlots` for "PB Available" display
- **Line 636**: Changed condition from `!restaurant.availableSlots` to `!restaurant.occupiedSlots`

#### ChargingStationModal.tsx
- **Line 127-131**: Simplified variable declarations, removed incorrect calculation
- **Line 227**: Changed from `availableSlots` to `occupiedSlots` for "PB Available" display

#### MapLocationModal.tsx
- **Line 186-188**: Removed incorrect calculation in MapChargingOnlyModal
  - Before: `availableSlots = location.availableSlots || location.returnSlots || 0; returnSlots = availableSlots;`
  - After: `returnSlots = location.returnSlots || 0;`
- **Line 279**: Changed from `availableSlots` to `returnSlots` for "Return slots" display
- **Line 326-328**: Removed incorrect calculation in MapDiningAndChargingModal
  - Before: `availableSlots = location.availableSlots || location.returnSlots || 0; returnSlots = availableSlots;`
  - After: `returnSlots = location.returnSlots || 0;`
- **Line 442**: Changed from `availableSlots` to `returnSlots` for "Return slots" display

## Data Flow

```
Database (station_items)
├── total_capacity → totalSlots (Total capacity)
├── occupied_slots → occupiedSlots & availableSlots (PB Available to rent)
└── available_slots → returnSlots (Empty slots for returns)

Frontend Display
├── "{occupiedSlots} PB Available" (powerbanks to rent)
├── "{returnSlots} Return slots" (empty slots)
└── "{totalSlots} Total" (total capacity)
```

## Verification
- Build completed successfully
- All TypeScript types are correct
- Data mapping is consistent across all pages:
  - MapView
  - DiscoverView
  - MerchantDetails
  - ChargingStationModal
  - MapLocationModal (all variants)

## Notes
The confusion was caused by the original implementation calculating "available slots" as `total_capacity - occupied_slots`, which was semantically incorrect. The database already has both values stored separately:
- `occupied_slots` = powerbanks in station (what users can rent)
- `available_slots` = empty slots (where users can return)

Now the frontend correctly uses these values without any calculation.
