# Membership Upgrade & Map View Fixes

## Summary

Fixed two critical issues:
1. Enabled membership upgrade/downgrade functionality with payment method integration
2. Fixed MapView to display charging station pins with correct icons

---

## 1. Membership Upgrade Flow (FIXED)

### Problem
- "Upgrade Now" and "Downgrade" buttons were disabled
- No payment flow integration
- Users couldn't subscribe to plans

### Solution Implemented

#### Button Logic
- **Upgrade Now**: Shows when selecting a higher-tier plan
- **Downgrade**: Shows when selecting a lower-tier plan
- **Current Plan**: Disabled when user is already on the selected plan
- **Processing**: Shows loading state during payment

#### Payment Flow
```
User clicks Upgrade/Downgrade
    ↓
Check for existing payment methods
    ↓
Has payment method? → Process payment directly
    ↓
No payment method? → Show AddCardModal
    ↓
User adds card → Process payment
    ↓
Success → Show success modal → Refresh profile → Return to menu
```

### Changes Made

**MembershipPlans.tsx**:
- Added payment method state management
- Added current user level tracking
- Created `handleUpgradeClick()` - Checks for payment methods and initiates flow
- Created `processPaymentWithMethod()` - Processes payment with existing method
- Created `handlePaymentMethodAdded()` - Handles new payment method addition
- Updated button to show dynamic text and enabled state
- Integrated AddCardModal for first-time payments

**Key Features**:
- If user has saved payment methods, charges primary/first card automatically
- If no payment method, opens AddCardModal to collect card details securely via Stripe Elements
- Shows processing state during payment
- Displays success modal with confirmation
- Refreshes user level after successful upgrade
- Returns to menu after 3 seconds

### API Integration

The component calls:
```
POST /functions/v1/subscription-payment
{
  "planId": "plan_id_here",
  "paymentMethodId": "pm_xxx"
}
```

---

## 2. MapView Charging Station Icons (FIXED)

### Problem
- Charging stations displayed with wrong icons (restaurant icon)
- No distinction between dining venues and charging stations on map
- VenueCategory type didn't include charging_station

### Solution Implemented

#### Added Charging Station Category
- Updated `VenueCategory` type to include `'charging_station'`
- Created dedicated charging station icon (battery/plug symbol)
- Updated marker creation logic to detect charging-only merchants

### Changes Made

**src/types/index.ts**:
```typescript
// Before
export type VenueCategory = 'restaurant' | 'cafe' | 'bar' | 'shop' | 'train_station';

// After
export type VenueCategory = 'restaurant' | 'cafe' | 'bar' | 'shop' | 'train_station' | 'charging_station';
```

**src/utils/mapMarkers.ts**:
- Added charging_station icon with battery/lightning bolt design
- Icon changes color based on open/closed status (same as other venues)

**src/components/MapView.tsx**:
- Added logic to detect charging-only merchants
- Sets marker category to 'charging_station' when:
  - `businessType === 'chargingonly'`
  - `merchantCategory === 'chargingonly'`
- Creates appropriate icon for each merchant type

### Icon Appearance

**Charging Station Icon**:
- Displays as a battery/plug symbol
- Orange color when open (#FFA374)
- Gray color when closed (#828EA1)
- Consistent size and style with other venue icons

---

## How It Works Now

### Membership Upgrade

1. **User opens Membership Plans**
   - Loads available plans from backend
   - Fetches user's current membership level
   - Loads existing payment methods

2. **User selects a plan**
   - Button text changes based on comparison:
     - "Upgrade Now" for higher tier
     - "Downgrade" for lower tier
     - "Current Plan" (disabled) for same tier

3. **User clicks Upgrade/Downgrade**
   - System checks for saved payment methods
   - **Scenario A**: Has payment method → Charges immediately
   - **Scenario B**: No payment method → Opens card modal

4. **Payment Processing**
   - Calls subscription-payment endpoint
   - Handles success/failure
   - Updates user profile
   - Shows confirmation

5. **Completion**
   - Success modal displays for 3 seconds
   - User level refreshed
   - Returns to menu automatically

### Map View

1. **Map loads merchants**
   - All merchants with valid coordinates displayed
   - Includes dining venues AND charging stations

2. **Icon selection**
   - Checks merchant's `businessType` or `merchantCategory`
   - Charging-only → Battery icon
   - Restaurant → Fork/knife icon
   - Cafe → Coffee cup icon
   - Bar → Cocktail glass icon
   - Shop → Shopping cart icon

3. **Icon color**
   - Orange: Currently open
   - Gray: Currently closed

4. **Click behavior**
   - Clicking any pin opens merchant details
   - Works for all merchant types

---

## Files Modified

### Membership Upgrade
- ✅ `src/components/MembershipPlans.tsx` - Complete payment flow integration
- ✅ Build verified - No TypeScript errors

### Map View Icons
- ✅ `src/types/index.ts` - Added charging_station to VenueCategory
- ✅ `src/utils/mapMarkers.ts` - Added charging station icon
- ✅ `src/components/MapView.tsx` - Updated marker creation logic
- ✅ Build verified - No TypeScript errors

---

## Testing Instructions

### Test Membership Upgrade

1. **Without Payment Method**:
   ```
   1. Open Menu → Memberships
   2. Select Gold plan
   3. Click "Upgrade Now"
   4. Should open AddCardModal
   5. Add test card: 4242 4242 4242 4242, 12/30, 123
   6. Should process payment and upgrade
   ```

2. **With Existing Payment Method**:
   ```
   1. Open Menu → Memberships
   2. Select different plan
   3. Click "Upgrade Now" or "Downgrade"
   4. Should process immediately with saved card
   5. Shows success modal after 3 seconds
   ```

3. **Current Plan**:
   ```
   1. User is on Gold plan
   2. Select Gold plan
   3. Button shows "Current Plan" and is disabled
   ```

### Test Map View Icons

1. **View charging stations**:
   ```
   1. Open map view
   2. Zoom out to see multiple merchants
   3. Charging stations show battery/plug icon
   4. Restaurants show fork/knife icon
   ```

2. **Click functionality**:
   ```
   1. Click charging station pin
   2. Should open merchant details
   3. Should show charging station information
   ```

3. **Open/Closed status**:
   ```
   1. Open venues → Orange icons
   2. Closed venues → Gray icons
   3. Applies to all merchant types
   ```

---

## API Requirements

### Subscription Payment Endpoint

**Endpoint**: `POST /functions/v1/subscription-payment`

**Required in Edge Function**:
- STRIPE_SECRET_KEY environment variable
- Plan ID validation
- Payment method ID validation
- Stripe PaymentIntent creation
- User profile update after successful payment

**Request Body**:
```json
{
  "planId": "uuid",
  "paymentMethodId": "pm_xxxxxxxxxxxxx"
}
```

**Response**:
```json
{
  "success": true,
  "subscriptionId": "sub_xxxxxxxxxxxxx",
  "status": "active"
}
```

---

## Notes

### Membership Upgrades
- Requires STRIPE_SECRET_KEY configured in Supabase Edge Functions
- Uses existing Stripe payment method infrastructure
- Supports both upgrades and downgrades
- Handles first-time payments via AddCardModal
- Auto-charges saved cards for returning users

### Map Icons
- All merchant types now have distinct icons
- Charging stations easily identifiable
- Discover page still filters out charging-only merchants (intentional)
- MapView shows ALL merchants including charging stations

---

## Status

✅ **Membership upgrade flow**: Fully functional
✅ **Payment method integration**: Complete
✅ **Map charging station icons**: Fixed
✅ **Build**: Successful (no errors)
✅ **Type safety**: All TypeScript types updated

**Ready for testing!**
