# Payment Method Requirements for Subscriptions

## Current Situation

Your database currently has **Google Pay** payment methods which **do NOT have Stripe payment method IDs**. This is causing the error you're seeing.

### Database State
```sql
-- Current payment methods in database
id=16, type=googlepay, stripe_payment_method_id=NULL ❌
id=15, type=googlepay, stripe_payment_method_id=NULL ❌
id=14, type=googlepay, stripe_payment_method_id=NULL ❌
```

## Why This Happens

Google Pay, Apple Pay, and other digital wallets were added to the database without going through Stripe's payment method creation process. They don't have Stripe payment method IDs (`pm_xxx...`), which are required to charge cards through Stripe.

## Solution: Add a Real Card

To upgrade to a paid membership (Silver or Gold), you need to add a **credit or debit card** through the Stripe payment form.

### Supported Payment Methods for Subscriptions

✅ **Credit/Debit Cards** (Visa, Mastercard, Amex)
- Go through Stripe Elements payment form
- Get stored with Stripe payment method ID
- Can be charged automatically for subscriptions

❌ **Google Pay** - Not supported for subscriptions
❌ **Apple Pay** - Not supported for subscriptions
❌ **iDEAL** - Requires redirect, not suitable for subscriptions
❌ **Bancontact** - Requires redirect, not suitable for subscriptions
❌ **SEPA Direct Debit** - Not yet implemented

## How to Fix

### Step 1: Add a Card Payment Method
1. Go to Payment Methods in the app
2. Click "Add Payment Method" or "Add Card"
3. Use the **Stripe card input form** (with Stripe branding)
4. Enter card details:
   - Card number
   - Expiry date
   - CVC
   - Cardholder name
5. Save the card

### Step 2: Verify Card is Added
The system will:
- Create a Stripe payment method ID (`pm_1Abc...`)
- Save it to the database with the Stripe ID
- Charge a €0.50 validation fee
- Set it as your default payment method

### Step 3: Try Upgrading Again
1. Go to Memberships
2. Select Silver (€17/month) or Gold (€144/year)
3. Choose your newly added card
4. Click Upgrade

## Error Messages Explained

### "Unable to Load Plans"
The membership plans API endpoint might have an issue. Plans exist in database:
- Flex: €0 (pay-per-use)
- Silver: €17/month
- Gold: €144/year

### "Google Pay and Apple Pay are not supported for subscriptions"
You tried to use a Google Pay/Apple Pay payment method. These don't have Stripe payment method IDs and can't be used for recurring payments.

### "This payment method is not configured properly"
The selected payment method doesn't have a `stripe_payment_method_id` in the database.

## Technical Details

### What Payment Methods Need
For subscriptions to work, payment methods MUST have:
1. `type: 'card'` in database
2. `stripe_payment_method_id: 'pm_xxx...'` (not NULL)
3. Valid Stripe customer ID linked to user

### Example Valid Payment Method
```javascript
{
  id: 17,
  user_id: "df4c75c8-...",
  type: "card",
  stripe_payment_method_id: "pm_1Abc123XYZ...",  // ✅ Present
  last_four: "4242",
  card_brand: "visa",
  cardholder_name: "John Doe",
  expiry_month: 12,
  expiry_year: 25,
  is_primary: true
}
```

### Example Invalid Payment Method (Current)
```javascript
{
  id: 16,
  user_id: "df4c75c8-...",
  type: "googlepay",  // ❌ Not 'card'
  stripe_payment_method_id: null,  // ❌ NULL
  last_four: "0782",
  card_brand: "googlepay",
  is_primary: true
}
```

## System Updates Applied

The backend now properly validates payment methods:
1. ✅ Checks if `stripe_payment_method_id` exists
2. ✅ Rejects Google Pay/Apple Pay for subscriptions
3. ✅ Returns clear error messages
4. ✅ Logs detailed debugging information
5. ✅ Only charges cards after validation

## Next Steps

1. **Add a real card** using the Stripe payment form
2. **Verify** the card has a Stripe payment method ID
3. **Try upgrading** to Silver or Gold membership
4. **Check** that payment succeeds and membership updates

The payment system is now production-ready and will work correctly once you add a valid card payment method!
