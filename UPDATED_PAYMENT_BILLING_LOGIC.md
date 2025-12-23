# Updated Payment and Billing Logic - Complete ✅

## Overview

All payment and billing rules have been successfully updated and deployed:

1. ✅ **Subscription Plans** - Charge full plan price upfront
2. ✅ **PAYG Powerbank Rental** - €1 upfront (covers first 30 minutes) + additional usage
3. ✅ **Adding Payment Method** - €0.01 validation fee only

---

## Implementation Details

### 1. Subscription Plans - Full Price Upfront ✅

**Status**: Already working correctly

**Edge Function**: `supabase/functions/subscription-payment/index.ts`

**How it works**:
```typescript
// Creates PaymentIntent with full subscription amount
const paymentIntentParams = {
  amount: body.amount.toString(), // Full plan price in cents
  currency: 'eur',
  customer: stripeCustomerId,
  'metadata[type]': 'subscription',
  // ...
};
```

**Pricing**:
- **Flex**: €0 (pay-as-you-go, no subscription)
- **Silver**: €17.00/month (1700 cents)
- **Gold**: €144.00/year (14400 cents)

**API Endpoint**:
```bash
POST /subscription-payment/create-intent
Body: {
  "amount": 1700,
  "planName": "Silver",
  "billingFrequency": "monthly"
}
```

---

### 2. PAYG Powerbank Rental - Updated Logic ✅

**Status**: UPDATED - Now charges €1 upfront covering first 30 minutes

**Edge Function**: `supabase/functions/rental-management/index.ts`

#### Key Changes Made:

**Start Rental - Upfront Charge**:
```typescript
// Line 164: Changed from 50 cents to 100 cents
const validationAmount = 100; // €1.00

// Line 183: Updated description
description: `Rental fee - First 30 minutes included - Station ${body.stationId}`
```

**End Rental - Billing Logic**:
```typescript
// Calculate total duration
const durationMinutes = Math.ceil((endTime - startTime) / (1000 * 60));

// Subtract first 30 minutes (already paid for)
const billableMinutes = Math.max(0, durationMinutes - 30);

// Only charge for additional time beyond 30 minutes
if (billableMinutes > 0) {
  const billingIntervals = Math.ceil(billableMinutes / 30);
  usageAmount = billingIntervals * 1.00; // €1.00 per 30 minutes

  // Apply daily cap
  if (usageAmount > 5.00) {
    usageAmount = 5.00;
  }
}
```

#### Start Rental Response:
```json
{
  "success": true,
  "rental": {
    "id": 123,
    "rentalId": 123,
    "powerbankId": "PB123456",
    "stationId": "ST789012",
    "startTime": "2024-12-18T10:00:00Z",
    "validationFeeCharged": true,
    "validationAmount": 1.00,
    "includedMinutes": 30,
    "isFreeRental": false
  }
}
```

#### End Rental Response:
```json
{
  "success": true,
  "rental": {
    "id": 123,
    "rentalId": 123,
    "durationMinutes": 75,
    "includedMinutes": 30,
    "billableMinutes": 45,
    "validationFee": 1.00,
    "usageFee": 2.00,
    "totalCharge": 3.00,
    "wasFreeRental": false
  }
}
```

**API Endpoints**:

```bash
# Start a rental
POST /rental-management/start
Body: {
  "powerbankId": "PB123456",
  "stationId": "ST789012",
  "paymentMethodId": "pm_xxx" (optional)
}
Response:
- Charges €1.00 upfront
- Covers first 30 minutes
- Returns rental details

# End a rental
POST /rental-management/end
Body: {
  "rentalId": "123",
  "returnStationId": "ST789013"
}
Response:
- Calculates total duration
- Subtracts first 30 minutes
- Charges only for additional time
- Returns billing breakdown
```

---

### 3. Adding Payment Method - €0.01 Validation ✅

**Status**: Already implemented correctly

**Edge Function**: `supabase/functions/payment-methods/index.ts`

**How it works**:
```typescript
// Line 207, 351, 495, 639
const { customerName, customerEmail, amount = 1 } = body; // 1 cent
```

**Affected Endpoints**:
- `POST /payment-methods/card-setup`
- `POST /payment-methods/revolut-pay-setup`
- `POST /payment-methods/payment-request-setup` (Apple Pay/Google Pay)
- `POST /payment-methods/bancontact-setup`

**Process**:
1. User adds payment method
2. System creates PaymentIntent for 1 cent
3. User completes verification
4. Payment method saved as 'active'
5. No further charges until actual use

---

## Billing Examples

### Example 1: Flex User - 20 Minute Rental
```
Upfront Charge: €1.00 (covers first 30 minutes)
Duration: 20 minutes
Billable Minutes: 0 (within included time)
Additional Charge: €0.00
Total: €1.00
```

### Example 2: Flex User - 45 Minute Rental
```
Upfront Charge: €1.00 (covers first 30 minutes)
Duration: 45 minutes
Billable Minutes: 15 minutes
Billable Intervals: 1 (15 minutes = 1 interval of 30 minutes)
Additional Charge: €1.00
Total: €2.00
```

### Example 3: Flex User - 75 Minute Rental
```
Upfront Charge: €1.00 (covers first 30 minutes)
Duration: 75 minutes
Billable Minutes: 45 minutes
Billable Intervals: 2 (45 minutes = 2 intervals of 30 minutes)
Additional Charge: €2.00
Total: €3.00
```

### Example 4: Flex User - 8 Hour Rental (Daily Cap)
```
Upfront Charge: €1.00 (covers first 30 minutes)
Duration: 480 minutes (8 hours)
Billable Minutes: 450 minutes
Calculated Charge: €15.00 (450 min = 15 intervals)
Daily Cap Applied: €5.00 maximum
Additional Charge: €5.00 (capped)
Total: €6.00 (€1 upfront + €5 capped usage)
```

### Example 5: Silver User - First Daily Rental
```
Upfront Charge: €0.00 (FREE - included in subscription)
Duration: Any duration
Billable Minutes: 0
Additional Charge: €0.00
Total: €0.00 (completely free)
```

### Example 6: Silver User - Second Rental Same Day (60 minutes)
```
Upfront Charge: €1.00 (covers first 30 minutes)
Duration: 60 minutes
Billable Minutes: 30 minutes
Billable Intervals: 1
Additional Charge: €1.00
Total: €2.00
```

---

## Complete Fee Structure Table

| Action | Flex Plan | Silver Plan | Gold Plan |
|--------|-----------|-------------|-----------|
| **Subscribe** | €0 | €17.00/month | €144.00/year |
| **Add Payment Method** | €0.01 | €0.01 | €0.01 |
| **1st Rental/Day** | €1.00 + usage* | FREE | FREE |
| **2nd+ Rentals/Day** | €1.00 + usage* | €1.00 + usage* | €1.00 + usage* |

*Usage = €1.00 per 30 minutes beyond the first 30 minutes (included in upfront fee), capped at €5.00/day

---

## Detailed Billing Breakdown

### Upfront Charge (Start of Rental)

**Flex Users**:
- Charge: €1.00
- Includes: First 30 minutes of rental
- When: Immediately when power bank is unlocked
- Status: Must succeed to start rental

**Silver/Gold Users (First Daily Rental)**:
- Charge: €0.00
- Includes: Entire rental duration (no time limit)
- When: N/A (free)
- Status: No payment required

**Silver/Gold Users (Additional Rentals)**:
- Same as Flex users: €1.00 for first 30 minutes

### Additional Charges (End of Rental)

**If rental duration ≤ 30 minutes**:
- Additional charge: €0.00
- Total: €1.00 (upfront only)

**If rental duration > 30 minutes**:
- Calculate: `billableMinutes = totalMinutes - 30`
- Calculate: `intervals = Math.ceil(billableMinutes / 30)`
- Calculate: `additionalFee = intervals × €1.00`
- Apply daily cap: `min(additionalFee, €5.00)`
- Total: €1.00 (upfront) + additional fee

---

## Payment Flow Diagrams

### Start Rental Flow

```
User scans QR code
      ↓
Check membership tier
      ↓
Is first daily rental for Silver/Gold?
      ↓
   Yes → FREE rental (no charge)
      ↓
   No → Check for payment method
      ↓
Payment method found?
      ↓
   Yes → Charge €1.00
      ↓
   No → Return error
      ↓
Payment successful?
      ↓
   Yes → Unlock power bank
      ↓
   No → Return error
```

### End Rental Flow

```
User returns power bank
      ↓
Calculate total duration
      ↓
Was rental free (Silver/Gold first daily)?
      ↓
   Yes → No additional charge
      ↓
   No → Calculate billable minutes
      ↓
billableMinutes = totalMinutes - 30
      ↓
billableMinutes > 0?
      ↓
   Yes → Calculate additional fee
      ↓
   No → No additional charge
      ↓
Charge additional fee (if any)
      ↓
Update rental record
      ↓
Return billing summary
```

---

## Database Schema Updates

The `rentals` table tracks all charges:

```sql
CREATE TABLE rentals (
  id                         bigint PRIMARY KEY,
  user_id                    text NOT NULL,
  powerbank_id               text,
  station_start_id           text,
  station_end_id             text,
  start_time                 timestamptz,
  end_time                   timestamptz,
  total_minutes              bigint,
  status                     text, -- 'active', 'completed', 'cancelled'

  -- Upfront charge (€1.00 for first 30 minutes)
  validation_charge_id       text,          -- Stripe Payment Intent ID
  validation_paid            boolean,       -- Whether upfront charge was made

  -- Additional usage charge (beyond 30 minutes)
  usage_charge_id            text,          -- Stripe Payment Intent ID
  usage_amount               decimal(10,2), -- Additional charge amount

  -- Payment info
  stripe_customer_id         text,
  stripe_payment_method_id   text,

  created_at                 timestamptz DEFAULT now(),
  updated_at                 timestamptz
);
```

---

## Testing Guide

### Test 1: Add Payment Method (€0.01)

```bash
curl -X POST https://[project].supabase.co/functions/v1/payment-methods/card-setup \
  -H "Authorization: Bearer [user-token]" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Test User",
    "customerEmail": "test@example.com"
  }'

# Expected: Charges €0.01 for validation
```

### Test 2: Subscribe to Plan (Full Price)

```bash
curl -X POST https://[project].supabase.co/functions/v1/subscription-payment/create-intent \
  -H "Authorization: Bearer [user-token]" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1700,
    "planName": "Silver",
    "billingFrequency": "monthly",
    "paymentMethod": "card"
  }'

# Expected: Charges €17.00
```

### Test 3: Start PAYG Rental (€1.00)

```bash
curl -X POST https://[project].supabase.co/functions/v1/rental-management/start \
  -H "Authorization: Bearer [user-token]" \
  -H "Content-Type: application/json" \
  -d '{
    "powerbankId": "PB123456",
    "stationId": "ST789012"
  }'

# Expected: Charges €1.00 upfront (covers first 30 minutes)
```

### Test 4: End Rental - 20 Minutes (No Additional Charge)

```bash
# After 20 minutes, end the rental
curl -X POST https://[project].supabase.co/functions/v1/rental-management/end \
  -H "Authorization: Bearer [user-token]" \
  -H "Content-Type: application/json" \
  -d '{
    "rentalId": "123",
    "returnStationId": "ST789013"
  }'

# Expected Response:
# {
#   "durationMinutes": 20,
#   "includedMinutes": 30,
#   "billableMinutes": 0,
#   "validationFee": 1.00,
#   "usageFee": 0.00,
#   "totalCharge": 1.00
# }
```

### Test 5: End Rental - 75 Minutes (Additional Charge)

```bash
# After 75 minutes, end the rental
curl -X POST https://[project].supabase.co/functions/v1/rental-management/end \
  -H "Authorization: Bearer [user-token]" \
  -H "Content-Type: application/json" \
  -d '{
    "rentalId": "124",
    "returnStationId": "ST789013"
  }'

# Expected Response:
# {
#   "durationMinutes": 75,
#   "includedMinutes": 30,
#   "billableMinutes": 45,
#   "validationFee": 1.00,
#   "usageFee": 2.00,
#   "totalCharge": 3.00
# }
```

---

## User Experience

### Starting a Rental (Flex User)

1. User scans QR code at station
2. App shows: **"€1 will be charged (includes first 30 minutes)"**
3. User confirms
4. €1.00 charged immediately
5. Power bank unlocks
6. Timer starts

### Ending a Rental

**Scenario A: Returned within 30 minutes**
1. User returns power bank
2. App calculates: 20 minutes used
3. Shows: **"Rental complete: €1.00 total (no additional charges)"**
4. Receipt sent

**Scenario B: Returned after 45 minutes**
1. User returns power bank
2. App calculates: 45 minutes used
3. Calculates: 45 - 30 = 15 billable minutes = 1 interval
4. Charges: €1.00 additional
5. Shows: **"Rental complete: €2.00 total (€1 upfront + €1 additional)"**
6. Receipt sent

**Scenario C: Returned after 8 hours**
1. User returns power bank
2. App calculates: 480 minutes used
3. Calculates: 480 - 30 = 450 billable minutes = 15 intervals = €15
4. Applies daily cap: €5.00 maximum
5. Charges: €5.00 additional
6. Shows: **"Rental complete: €6.00 total (€1 upfront + €5 capped)"**
7. Receipt sent

---

## Key Improvements

### Before vs After

**Before**:
- Upfront: €0.50 validation
- End: Full duration billed at €1/30min
- Example 45min: €0.50 + €2.00 = €2.50

**After**:
- Upfront: €1.00 (includes first 30 minutes)
- End: Only time beyond 30 minutes billed
- Example 45min: €1.00 + €1.00 = €2.00

### Benefits

1. **Simpler for users**: First 30 minutes included in upfront fee
2. **Fairer pricing**: Don't double-charge for first 30 minutes
3. **Predictable**: €1.00 minimum for any rental ≤30 minutes
4. **Transparent**: Clear breakdown of included vs billable time

---

## Error Handling

### Start Rental Errors

```typescript
// No payment method
{
  error: "No payment method found. Please add a payment method first.",
  code: "NO_PAYMENT_METHOD"
}

// Charge failed
{
  error: "Validation charge failed",
  code: "VALIDATION_CHARGE_FAILED"
}

// Payment not completed
{
  error: "Validation payment not completed",
  status: "requires_action",
  code: "PAYMENT_NOT_COMPLETED"
}
```

### End Rental Errors

```typescript
// Rental not found
{ error: "Rental not found" }

// Rental not active
{ error: "Rental is not active" }
```

---

## Monitoring and Analytics

### Revenue Tracking

```sql
-- Daily rental upfront revenue
SELECT
  DATE(start_time) as date,
  COUNT(*) FILTER (WHERE validation_paid = true) as paid_rentals,
  COUNT(*) FILTER (WHERE validation_paid = true) * 1.00 as upfront_revenue_eur
FROM rentals
WHERE start_time >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(start_time);

-- Daily additional usage revenue
SELECT
  DATE(end_time) as date,
  SUM(usage_amount) as additional_revenue_eur,
  AVG(total_minutes) as avg_duration_minutes
FROM rentals
WHERE end_time >= CURRENT_DATE - INTERVAL '30 days'
  AND status = 'completed'
  AND validation_paid = true
GROUP BY DATE(end_time);

-- Rentals by duration bucket
SELECT
  CASE
    WHEN total_minutes <= 30 THEN '0-30 min'
    WHEN total_minutes <= 60 THEN '31-60 min'
    WHEN total_minutes <= 120 THEN '61-120 min'
    ELSE '120+ min'
  END as duration_bucket,
  COUNT(*) as rental_count,
  AVG(usage_amount) as avg_additional_fee
FROM rentals
WHERE status = 'completed'
  AND validation_paid = true
GROUP BY duration_bucket;
```

---

## Files Modified

1. **supabase/functions/rental-management/index.ts**
   - Line 164: Changed `validationAmount` from 50 to 100
   - Line 183: Updated description to "First 30 minutes included"
   - Lines 257-258: Updated response to show €1.00 and included minutes
   - Lines 313-331: Updated end rental logic to subtract first 30 minutes
   - Line 354: Updated usage description
   - Lines 379-394: Updated end rental response with detailed breakdown

2. **UPDATED_PAYMENT_BILLING_LOGIC.md** (this file)
   - Complete documentation of all changes
   - Billing examples and breakdowns
   - Testing guide and user experience

---

## Deployment Status

- [x] Update rental-management function
- [x] Deploy to Supabase edge functions
- [x] Build frontend successfully
- [x] Verify subscription-payment works correctly
- [x] Verify payment-methods works correctly
- [x] Create comprehensive documentation
- [ ] Test with real Stripe transactions
- [ ] Monitor first 24 hours

---

## Summary

All payment and billing logic has been updated:

✅ **Subscription Plans** → Charge full price upfront (€17 or €144)
✅ **PAYG Rentals** → €1 upfront (first 30min included) + usage beyond 30min
✅ **Payment Methods** → €0.01 validation fee only

The new billing structure is:
- More user-friendly (first 30 minutes included)
- More transparent (clear breakdown of charges)
- More predictable (minimum €1 for short rentals)

**Build Status**: ✅ Successful
**Deployment**: ✅ Complete
**Documentation**: ✅ Complete

---

**Implementation Date**: December 18, 2024
**Version**: 2.0.0
**Status**: ✅ COMPLETE - All Payment Rules Updated and Deployed
