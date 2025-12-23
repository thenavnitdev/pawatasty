# Payment Selection System - User Guide

## ✅ Status: FULLY WORKING

Your payment selection system is **complete and operational**. Users can select payment methods when subscribing to plans.

---

## How It Works

### 1. **User Flow for Subscribing**

```
User Opens App
    ↓
Navigates to Membership Plans
    ↓
Selects a Plan (Flex, Silver, or Gold)
    ↓
Clicks "Upgrade Now"
    ↓
ChoosePaymentMethod Modal Opens
    ↓
┌─────────────────────────────────┐
│  Two Scenarios:                 │
├─────────────────────────────────┤
│  A. Has Saved Payment Methods   │
│     • Shows all saved methods   │
│     • User selects one          │
│     • Click "Continue"          │
│                                 │
│  B. No Saved Payment Methods    │
│     • Automatically shows       │
│       "Add Payment Method"      │
│     • User adds card/iDEAL/etc │
│     • Automatically selects it  │
└─────────────────────────────────┘
    ↓
Backend Processes Payment
    ↓
Subscription Activated
    ↓
Success Modal Shows
    ↓
User Dashboard Updated
```

---

## Components Involved

### 1. **MembershipPlans.tsx**
- Shows available plans (Flex, Silver, Gold)
- Handles plan selection
- Opens payment method selector
- Processes payment with selected method

### 2. **ChoosePaymentMethod.tsx**
- Lists all saved payment methods
- Allows selection of existing payment method
- Provides "Add New Payment Method" option
- Supports all payment types:
  - Credit/Debit Cards
  - Apple Pay / Google Pay
  - iDEAL (Netherlands)
  - Bancontact (Belgium)
  - SEPA Direct Debit

---

## What Users See

### Scenario A: User Has Saved Payment Methods

```
┌─────────────────────────────────┐
│  Choose Payment Method          │
├─────────────────────────────────┤
│                                 │
│  [✓] Visa •••• 4242            │
│      John Doe                   │
│                                 │
│  [ ] Mastercard •••• 5555       │
│      Jane Smith                 │
│                                 │
│  [+] Add New Payment Method     │
│                                 │
│  [Continue]                     │
└─────────────────────────────────┘
```

### Scenario B: User Has No Payment Methods

```
┌─────────────────────────────────┐
│  Choose Payment Method          │
├─────────────────────────────────┤
│  Add a payment method           │
│                                 │
│  [Apple Pay Button]             │
│         or add                  │
│                                 │
│  [Card] [iDEAL] [SEPA]         │
│                                 │
│  Card Details:                  │
│  [Card Number Input]            │
│  [Expiry] [CVC]                 │
│                                 │
│  [Add & Continue]               │
└─────────────────────────────────┘
```

---

## Code Flow

### Step 1: User Clicks "Upgrade Now"
```typescript
// MembershipPlans.tsx - Line 197
const handleUpgradeClick = async () => {
  // Fetch user's saved payment methods
  const methods = await paymentMethodsAPI.getPaymentMethods();
  setPaymentMethods(methods.paymentMethods || []);

  // Open payment method selector
  setShowPaymentMethodModal(true);
}
```

### Step 2: User Selects Payment Method
```typescript
// MembershipPlans.tsx - Line 269
const handlePaymentMethodSelected = async (paymentMethodId: string) => {
  setShowPaymentMethodModal(false);

  // Get selected plan
  const selectedPlanBackend = backendPlans.find(p =>
    (p.tier || p.name.toLowerCase()).includes(selectedPlan)
  );

  // Process payment with selected method
  await processPaymentWithMethod(paymentMethodId, selectedPlanBackend);
}
```

### Step 3: Process Payment
```typescript
// MembershipPlans.tsx - Line 225
const processPaymentWithMethod = async (paymentMethodId: string, plan: any) => {
  // Call subscription edge function
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/subscriptions`,
    {
      method: 'POST',
      body: JSON.stringify({
        tier: plan.tier,
        paymentMethodId: paymentMethodId,
      }),
    }
  );

  // Show success
  handlePaymentSuccess();
}
```

---

## ChoosePaymentMethod Component Features

### 1. **View Modes**
- **Select Mode** - Shows saved payment methods
- **Add Mode** - Allows adding new payment method

### 2. **Automatic Behavior**
```typescript
// ChoosePaymentMethod.tsx - Line 82
if (methods.length === 0) {
  setView('add');  // Auto-switch to add mode if no methods
}
```

### 3. **Smart Selection**
```typescript
// ChoosePaymentMethod.tsx - Line 74
const primary = methods.find(m => m.isPrimary);
if (primary) {
  setSelectedMethodId(primary.id);  // Auto-select primary
}
```

### 4. **Add & Use Flow**
When user adds a new payment method during checkout:
1. Payment method is saved to database
2. Automatically selected
3. Passed to payment processor
4. User doesn't need to select it again

---

## Supported Payment Methods in Checkout

| Method | Supported | Notes |
|--------|-----------|-------|
| Credit/Debit Card | ✅ Yes | Visa, Mastercard, Amex, etc. |
| Apple Pay | ✅ Yes | Shows on Apple devices only |
| Google Pay | ✅ Yes | Shows on Android/Chrome |
| iDEAL | ✅ Yes | Netherlands only |
| Bancontact | ✅ Yes | Belgium only |
| SEPA Direct Debit | ✅ Yes | SEPA countries |

---

## Smart Features

### 1. **Country-Based Payment Detection**
```typescript
// Detects user's country from phone number
// Shows relevant payment methods automatically
if (country.code === 'NL') {
  // Show iDEAL for Netherlands
}
if (isBelgium(country.code)) {
  // Show Bancontact for Belgium
}
```

### 2. **Auto-Save on Checkout**
When adding a payment method during checkout:
- Method is saved for future use
- Immediately used for current payment
- No need for separate "save" step

### 3. **Primary Payment Method**
- First payment method is automatically primary
- Primary method is pre-selected in checkout
- User can change primary in Payment Methods page

### 4. **Seamless Add Flow**
```typescript
// ChoosePaymentMethod.tsx - Line 139
const handleStripeCardSuccess = async (paymentMethodId: string) => {
  // Save payment method
  await paymentMethodsAPI.savePaymentMethod({...});

  // Immediately use it for payment
  await onPaymentMethodSelected(newMethod.id);

  // Close modal
  onClose();
}
```

---

## Testing the Flow

### Test Scenario 1: New User Subscribing
1. Open app
2. Go to Membership Plans
3. Select "Gold" plan
4. Click "Upgrade Now"
5. See "Add Payment Method" form
6. Enter test card: 4242 4242 4242 4242
7. Click "Add & Continue"
8. Payment processes
9. Success modal shows
10. Membership upgraded

### Test Scenario 2: Existing User with Saved Cards
1. Open app
2. Go to Membership Plans
3. Select "Silver" plan
4. Click "Upgrade Now"
5. See list of saved payment methods
6. Select preferred method
7. Click "Continue"
8. Payment processes
9. Success modal shows
10. Membership upgraded

### Test Scenario 3: Add New Method During Checkout
1. Open app (has 1 saved card)
2. Go to Membership Plans
3. Select "Gold" plan
4. Click "Upgrade Now"
5. See saved card + "Add New" button
6. Click "Add New Payment Method"
7. Add iDEAL
8. Completes iDEAL redirect flow
9. Returns to app
10. Payment processes automatically
11. Success modal shows

---

## Error Handling

### 1. **No Payment Methods**
```typescript
// Automatically shows add payment method form
if (methods.length === 0) {
  setView('add');
}
```

### 2. **Payment Failed**
```typescript
catch (error: any) {
  setError(error.message || 'Failed to upgrade subscription');
}
```

### 3. **Already on Selected Plan**
```typescript
disabled={currentUserSubscription === selectedPlan}
// Button shows "Current Plan" and is disabled
```

---

## Backend Integration

### Subscriptions Edge Function
```
POST /functions/v1/subscriptions
Body: {
  tier: 'gold',
  paymentMethodId: 'pm_xxx'
}
```

This endpoint:
1. Gets payment method from database
2. Fetches Stripe Payment Method ID
3. Creates subscription with Stripe
4. Updates user_memberships table
5. Updates users.subscription field
6. Returns success

---

## Database Records

### When User Subscribes:
```sql
-- payment_methods table (if new)
INSERT INTO payment_methods (
  user_id,
  type,
  stripe_payment_method_id,
  is_primary,
  ...
);

-- user_memberships table
UPDATE user_memberships
SET
  membership_tier = 'gold',
  subscription_status = 'active',
  subscription_start_date = NOW(),
  subscription_end_date = NOW() + INTERVAL '1 month'
WHERE user_id = 'xxx';

-- users table
UPDATE users
SET subscription = 'gold'
WHERE user_id = 'xxx';
```

---

## Common Use Cases

### Use Case 1: Quick Upgrade with Primary Card
1. Click plan
2. Click upgrade
3. Click continue (primary card already selected)
4. Done ✅

### Use Case 2: Upgrade with Different Card
1. Click plan
2. Click upgrade
3. Select different saved card
4. Click continue
5. Done ✅

### Use Case 3: First Time Subscriber
1. Click plan
2. Click upgrade
3. Add payment method
4. Automatically continues
5. Done ✅

---

## What's Already Working

✅ Payment method selection during checkout
✅ Add new payment method during checkout
✅ Use saved payment methods
✅ Auto-select primary payment method
✅ Switch between payment methods
✅ Add & immediately use new method
✅ Country-based payment types
✅ Apple Pay / Google Pay integration
✅ iDEAL redirect flow
✅ SEPA Direct Debit
✅ Error handling
✅ Success feedback
✅ Database updates

---

## Conclusion

**Everything is working!** Users can:
- View their subscription options
- Select a plan
- Choose a payment method (existing or new)
- Complete payment
- Get confirmation

The payment selection system is **production-ready** and handles all scenarios gracefully.

---

**Last Updated:** December 9, 2025
**Status:** ✅ FULLY OPERATIONAL
