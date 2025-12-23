# MapDiningAndChargingModal Fix ✅

## Issue
The MapDiningAndChargingModal was not visible and was missing key elements from both the DiningOnly and ChargingOnly modals.

## What Was Missing
1. ❌ Charging detail box with blue highlight (price, PB availability, return slots)
2. ❌ Charging station image on the right side
3. ❌ QR scanner button
4. ❌ Top header image (was present but not matching requirements)

## Solution Implemented

### Updated MapDiningAndChargingModal Structure

The modal now combines elements from **both** DiningOnly and ChargingOnly modals:

#### 1. ✅ Top Header Image (from DiningOnly)
```tsx
<div className="relative h-52 bg-gradient-to-br from-orange-400 to-pink-400">
  <img src={imageUrl} alt={location.name} className="w-full h-full object-cover" />
  <button onClick={onToggleLike} className="absolute top-3 right-3">
    <Heart />
  </button>
</div>
```

#### 2. ✅ QR Scanner Button (from ChargingOnly)
```tsx
<button
  onClick={() => setShowScanner(true)}
  className="absolute -top-2 right-2 w-[50px] h-[50px] rounded-full bg-gradient-to-br from-orange-400 to-orange-500"
>
  <QrCode className="w-6 h-6 text-white" />
</button>
```

#### 3. ✅ Charging Detail Box with Blue Highlight (from ChargingOnly)
```tsx
<div className="flex items-center gap-3 mb-4">
  <div className="flex-1 bg-[#E4F5FE] rounded-2xl p-4 space-y-3">
    {/* Price per minute */}
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-white rounded-lg">
        <CreditCard className="w-4 h-4 text-gray-700" />
      </div>
      <span>€ Free / 60 Min</span>
    </div>

    {/* PB availability */}
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-orange-50 rounded-lg">
        <Battery className="w-4 h-4 text-orange-600" />
      </div>
      <span>{availableSlots} PB available</span>
    </div>

    {/* Return slots */}
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-white rounded-lg">
        <Package className="w-4 h-4 text-gray-600" />
      </div>
      <span>{returnSlots} Return slots</span>
    </div>
  </div>

  {/* Charging station image */}
  <div className="w-24 h-32 flex-shrink-0 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden">
    <img src="charging-station.jpg" alt="Charging Station" />
  </div>
</div>
```

#### 4. ✅ Special Offer Box (from DiningOnly)
```tsx
{hasDeals && (
  <div className="bg-orange-50 rounded-2xl p-4 mb-4">
    <p className="text-sm font-bold text-orange-600 mb-1">Special Offer</p>
    <p className="text-sm text-gray-700">{location.deals[0].description}</p>
  </div>
)}
```

#### 5. ✅ Book Now Button (from DiningOnly)
```tsx
<button
  onClick={onBookDining}
  className="w-full bg-[#FFA374] text-white py-3.5 rounded-2xl font-bold"
>
  Book Now
</button>
```

## Modal Layout Structure

```
┌─────────────────────────────────────────┐
│  QR Scanner Button (top-right, floating)│
├─────────────────────────────────────────┤
│                                          │
│        Top Header Image (h-52)          │
│        with Like Button                 │
│                                          │
├─────────────────────────────────────────┤
│  Restaurant Name          Rating Badge  │
│  📍 Address              Open/Closed    │
│  Subcategory Name                       │
├─────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────┐   │
│  │ Blue Detail Box  │  │ Charging │   │
│  │ • € Free/60 Min  │  │  Image   │   │
│  │ • X PB available │  │  (right  │   │
│  │ • X Return slots │  │   side)  │   │
│  └──────────────────┘  └──────────┘   │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐   │
│  │ 🍊 Special Offer (if available) │   │
│  │    Deal description             │   │
│  └─────────────────────────────────┘   │
├─────────────────────────────────────────┤
│        [Book Now Button]                │
└─────────────────────────────────────────┘
```

## Key Features

### Visual Elements
- ✅ Top header image showing merchant/restaurant (h-52)
- ✅ Like button (heart icon) on header image
- ✅ QR scanner button (floating, top-right)
- ✅ Charging station image on right side of detail box
- ✅ Blue highlight box (#E4F5FE) for charging details
- ✅ Orange box for special offers (if available)

### Information Display
- ✅ Restaurant name and rating
- ✅ Address with map pin icon
- ✅ Open/Closed status with hours
- ✅ Subcategory name (from database: "Bites / Drinks & Charging")
- ✅ Price per minute (€ Free / 60 Min)
- ✅ Available powerbanks count
- ✅ Return slots count
- ✅ Special offer details (conditional)

### Interactive Elements
- ✅ QR scanner button → Opens QrScanner component
- ✅ Like button → Toggles favorite status
- ✅ Book Now button → Triggers booking flow
- ✅ Close on background click

## Comparison with Other Modals

| Feature | DiningOnly | ChargingOnly | DiningAndCharging ✅ |
|---------|-----------|--------------|---------------------|
| Top Header Image | ✅ | ❌ | ✅ |
| QR Scanner Button | ❌ | ✅ | ✅ |
| Blue Charging Box | ❌ | ✅ | ✅ |
| Charging Image | ❌ | ✅ | ✅ |
| Special Offer Box | ✅ | ❌ | ✅ |
| Book Now Button | ✅ | ❌ | ✅ |

## Technical Details

### Data Sources
- **occupiedSlots**: From `location.occupiedSlots`
- **totalSlots**: From `location.totalSlots`
- **availableSlots**: Calculated as `totalSlots - occupiedSlots`
- **returnSlots**: Same as `availableSlots`
- **subcategoryName**: From database via edge function ("Bites / Drinks & Charging")

### State Management
```typescript
const [showScanner, setShowScanner] = useState(false);
```
- Handles QR scanner visibility
- When scanner is open, modal content is replaced with QrScanner component

### Image Handling
```typescript
const imageUrl = getOptimizedImageUrl(
  location.coverImageIds?.[0] || location.logoId || location.image,
  'merchant',
  { width: 800, height: 600 }
);
```
- Uses optimized image URLs
- Falls back to Unsplash placeholder if image fails

## Testing
✅ Build successful with no TypeScript errors
✅ All modal components properly integrated
✅ QR scanner integration verified
✅ Conditional rendering (deals) working correctly

## Status
✅ **COMPLETE** - MapDiningAndChargingModal now includes all required elements from both DiningOnly and ChargingOnly modals, creating a comprehensive modal for businesses that offer both dining and charging services.

---

**Last Updated**: 2025-12-03
**Build Status**: ✅ Successful
