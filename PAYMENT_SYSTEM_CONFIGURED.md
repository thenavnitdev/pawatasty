# Payment System Configuration Complete

## Overview
The payment system is now fully configured with Stripe Product and Price IDs, and the payment method constraint issue has been resolved.

## Stripe Configuration

### Product ID
- **Product**: `prod_PzXOKy3fuIeCPG`

### Price IDs by Tier

| Tier | Display Name | Price | Interval | Price ID |
|------|--------------|-------|----------|----------|
| Flex | Flex | €1.00 validation | Pay-as-you-go | `price_1Sawe9CcTUIOQ9MlGL7T3Nn2` |
| Silver | Silver | €17.00 | Monthly | `price_1P9YK1CcTUIOQ9MlXHmjTT5l` |
| Gold | Gold | €144.00 | Yearly | `price_1P9YK1CcTUIOQ9MlcWaVd99U` |

## What Was Fixed

### 1. Payment Method Constraint Issue ✅
**Problem**: The `payment_methods` table has a constraint requiring active payment methods to have a `stripe_payment_method_id`. The function was setting status to `'active'` by default before creating the Stripe PM ID.

**Solution**:
- Changed default `payment_method_status` from `'active'` to `'pending'`
- Changed default `setup_completed_at` from current timestamp to `null`
- Only set status to `'active'` after successful Stripe PM creation:
  - **Card**: After validating and attaching the Stripe Payment Method
  - **SEPA**: After creating and attaching the Stripe Payment Method

### 2. Stripe Product/Price Configuration ✅
**What's Configured**:
- All membership tiers have correct Stripe Product ID
- All membership tiers have correct Stripe Price IDs
- Subscription creation uses `planData.stripe_price_id` from database
- Webhook handler properly activates payment methods after setup

## How It Works

### Payment Method Creation Flow

#### For Card Payments:
1. Frontend creates Stripe PM using Stripe Elements
2. Frontend sends `stripePaymentMethodId` to backend
3. Backend validates the Stripe PM
4. Backend attaches PM to customer
5. Backend creates record with status `'pending'`
6. Backend charges €0.01 validation fee
7. If successful, status is set to `'active'` ✅

#### For SEPA Payments:
1. Frontend sends IBAN and cardholder name
2. Backend creates Stripe SEPA PM
3. Backend attaches PM to customer
4. Backend creates record with status `'pending'`
5. Backend charges €0.01 validation fee
6. If successful, status is set to `'active'` ✅

#### For Redirect-Based Payments (iDEAL, Bancontact):
1. Frontend initiates setup
2. Backend creates Setup Intent
3. Backend creates record with status `'pending'`
4. User completes redirect flow
5. Stripe webhook (`setup_intent.succeeded`) fires
6. Webhook handler sets `stripe_payment_method_id` and status to `'active'` ✅

### Subscription Creation Flow

1. User selects a membership tier (Silver or Gold)
2. User selects an active payment method
3. Backend fetches tier data from `membership_pricing` table
4. Backend creates Stripe subscription using `stripe_price_id`:
   ```typescript
   "items[0][price]": planData.stripe_price_id
   ```
5. Subscription is created with the correct pricing
6. User membership is updated in database

### Free Tier (Flex) Flow

1. User selects Flex tier
2. No payment method required
3. Backend immediately updates user to Flex
4. No Stripe subscription created
5. User is charged pay-as-you-go for rentals

## Database Schema

### `membership_pricing` Table Columns
- `stripe_product_id`: Stripe Product ID (prod_xxx)
- `stripe_price_id`: Stripe Price ID (price_xxx)
- Both columns are properly set for all active tiers

### `payment_methods` Table Columns
- `stripe_payment_method_id`: Stripe PM ID (pm_xxx) - Required when status is 'active'
- `stripe_setup_intent_id`: Setup Intent ID (seti_xxx) - Used for redirect methods
- `payment_method_status`: 'pending' | 'active' | 'failed' | 'inactive'
- `setup_completed_at`: Timestamp when PM was activated
- `supports_subscriptions`: Boolean for subscription support
- `supports_off_session`: Boolean for off-session payments
- `supports_one_time`: Boolean for one-time payments

## Constraint Details

```sql
ALTER TABLE payment_methods
ADD CONSTRAINT payment_methods_active_must_have_stripe_id
CHECK (
  payment_method_status != 'active' OR
  stripe_payment_method_id IS NOT NULL
);
```

This ensures data integrity - active payment methods always have a valid Stripe Payment Method ID.

## Testing

To test the payment system:

1. **Add a Card**:
   - Use Stripe test card: `4242 4242 4242 4242`
   - Should successfully create with status 'active'

2. **Add SEPA**:
   - Use test IBAN: `DE89370400440532013000`
   - Should successfully create with status 'active'

3. **Subscribe to Silver** (Monthly €17):
   - Select active payment method
   - Should create Stripe subscription with `price_1P9YK1CcTUIOQ9MlXHmjTT5l`

4. **Subscribe to Gold** (Yearly €144):
   - Select active payment method
   - Should create Stripe subscription with `price_1P9YK1CcTUIOQ9MlcWaVd99U`

## Next Steps

The payment system is ready for:
- Adding payment methods (card, SEPA, iDEAL, Bancontact)
- Creating subscriptions (Silver monthly, Gold yearly)
- Pay-as-you-go rentals (Flex tier)
- Webhook processing for payment method setup completion

All Stripe Product and Price IDs are properly configured and the constraint issue has been resolved.
