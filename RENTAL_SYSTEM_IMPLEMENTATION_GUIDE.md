# Rental System with Automated Stripe Workflow

## Complete Implementation Guide

This guide provides a detailed step-by-step automated workflow for implementing a powerbank/item rental system with validation charges and usage-based billing.

---

## System Overview

### Pricing Structure
- **Validation Charge**: €0.50 when payment method is added
- **Usage Fee**: €1 per 30 minutes (rounded up)
- **Daily Cap**: €5 maximum per 24-hour period
- **Penalty**: €25 if rental exceeds 5 days
- **Auto-charge**: Final fee charged automatically using saved payment method

### Database Tables (Ready to Implement)
```sql
-- rental_sessions: Tracks each rental with timestamps
-- rental_charges: Records all charges (validation, usage, penalty)
-- See migration file for full schema
```

---

## Step-by-Step Automated Flow

### 1. **Collect and Save Payment Method + Validation Charge**

#### Stripe API Calls

**Step 1a: Create Setup Intent** (Save payment method securely)
```typescript
POST https://api.stripe.com/v1/setup_intents
Headers:
  Authorization: Bearer sk_live_xxx

Body:
  customer=cus_xxx
  payment_method_types[]=card
  payment_method_types[]=ideal
  payment_method_types[]=sepa_debit

Response:
{
  "id": "seti_xxx",
  "client_secret": "seti_xxx_secret_yyy",
  "status": "requires_payment_method"
}
```

**Step 1b: Confirm Setup Intent** (Frontend with Stripe Elements)
```typescript
const stripe = await loadStripe('pk_live_xxx');
const { error, setupIntent } = await stripe.confirmCardSetup(
  clientSecret,
  {
    payment_method: {
      card: cardElement,
      billing_details: { name: 'Customer Name' }
    }
  }
);

// setupIntent.payment_method = 'pm_xxx' (saved for future use)
```

**Step 1c: Charge Validation Fee** (€0.50 immediately)
```typescript
POST https://api.stripe.com/v1/payment_intents
Headers:
  Authorization: Bearer sk_live_xxx

Body:
  amount=50  // €0.50 in cents
  currency=eur
  customer=cus_xxx
  payment_method=pm_xxx  // From step 1b
  confirm=true
  description=Rental validation charge
  metadata[type]=validation

Response:
{
  "id": "pi_xxx",
  "status": "succeeded",
  "amount": 50,
  "charges": {
    "data": [{
      "id": "ch_xxx",
      "paid": true
    }]
  }
}
```

---

### 2. **Start Rental Session**

```typescript
// Edge Function: POST /rental-management/start
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/rental-management/start`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      itemId: 'PB-12345',
      merchantName: 'Coffee Shop Amsterdam',
      stationId: 'STATION-001',
      paymentMethodId: 'pm_xxx',
      validationChargeId: 'pi_xxx'
    })
  }
);

// Database Record Created:
{
  id: 'uuid',
  user_id: 'user-uuid',
  item_id: 'PB-12345',
  start_time: '2025-12-05T10:00:00Z',
  status: 'active',
  validation_charge_id: 'pi_xxx',
  validation_paid: true,
  payment_method_id: 'pm-uuid'
}
```

---

### 3. **End Rental Session & Calculate Fees**

```typescript
// Edge Function: POST /rental-management/end
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/rental-management/end`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      rentalSessionId: 'rental-uuid',
      itemId: 'PB-12345'
    })
  }
);

// Backend Processing:
// 1. Get rental session from database
// 2. Calculate duration
// 3. Apply pricing logic
// 4. Charge payment method automatically
```

#### Fee Calculation Logic

```typescript
function calculateRentalFee(startTime: Date, endTime: Date) {
  const totalMinutes = Math.floor((endTime - startTime) / 60000);

  // Calculate full days
  const fullDays = Math.floor(totalMinutes / 1440);
  const remainingMinutes = totalMinutes % 1440;

  // Calculate 30-minute blocks (round up)
  const blocks = Math.ceil(remainingMinutes / 30);

  // Base fee: €1 per 30 minutes
  let usageFee = blocks * 1.00;

  // Apply daily cap for partial day
  if (usageFee > 5.00) usageFee = 5.00;

  // Add full days (€5 per day)
  usageFee += fullDays * 5.00;

  // Apply penalty if > 5 days
  const penalty = totalMinutes > 7200 ? 25.00 : 0;

  return {
    totalMinutes,
    usageFee,
    penalty,
    totalFee: usageFee + penalty
  };
}
```

#### Example Calculations

| Duration | Calculation | Usage Fee | Penalty | Total |
|----------|-------------|-----------|---------|-------|
| 15 min   | 1 block × €1 | €1.00 | €0 | **€1.00** |
| 45 min   | 2 blocks × €1 | €2.00 | €0 | **€2.00** |
| 3 hours  | 6 blocks → cap | €5.00 | €0 | **€5.00** |
| 1 day    | 1 day × €5 | €5.00 | €0 | **€5.00** |
| 3 days   | 3 days × €5 | €15.00 | €0 | **€15.00** |
| 6 days   | 6 days × €5 | €30.00 | **€25** | **€55.00** |

---

### 4. **Charge Final Usage Fee Automatically**

```typescript
// Automatic Stripe API Call (Backend)
POST https://api.stripe.com/v1/payment_intents
Headers:
  Authorization: Bearer sk_live_xxx

Body:
  amount=1500  // €15.00 in cents
  currency=eur
  customer=cus_xxx
  payment_method=pm_xxx  // Saved from step 1
  confirm=true
  description=Rental usage charge - 3 days
  metadata[type]=usage
  metadata[rental_session_id]=rental-uuid
  metadata[duration_minutes]=4320
  metadata[usage_fee]=15.00
  metadata[penalty]=0

Response:
{
  "id": "pi_yyy",
  "status": "succeeded",
  "amount": 1500
}
```

```typescript
// Update database
UPDATE rental_sessions SET
  end_time = NOW(),
  status = 'completed',
  usage_charge_id = 'pi_yyy',
  usage_amount = 15.00,
  total_minutes = 4320,
  penalty_amount = 0
WHERE id = 'rental-uuid';

// Create charge record
INSERT INTO rental_charges (
  rental_session_id,
  charge_type,
  amount,
  stripe_payment_intent_id,
  status
) VALUES (
  'rental-uuid',
  'usage',
  15.00,
  'pi_yyy',
  'succeeded'
);
```

---

### 5. **Handle Payment Success/Failure with Webhooks**

#### Setup Webhook Endpoint

```typescript
// Edge Function: POST /rental-management/webhook
Deno.serve(async (req: Request) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  // Verify webhook signature
  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    STRIPE_WEBHOOK_SECRET
  );

  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(event.data.object);
      break;

    case 'payment_intent.payment_failed':
      await handlePaymentFailure(event.data.object);
      break;
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200
  });
});
```

#### Payment Success Handler

```typescript
async function handlePaymentSuccess(paymentIntent) {
  const { id, metadata } = paymentIntent;

  if (metadata.type === 'validation') {
    // Update validation status
    await supabase
      .from('rental_sessions')
      .update({ validation_paid: true })
      .eq('validation_charge_id', id);
  }

  if (metadata.type === 'usage') {
    // Update usage charge status
    await supabase
      .from('rental_charges')
      .update({ status: 'succeeded' })
      .eq('stripe_payment_intent_id', id);

    // Send receipt email
    await sendReceiptEmail(metadata.rental_session_id);
  }
}
```

#### Payment Failure Handler

```typescript
async function handlePaymentFailure(paymentIntent) {
  const { id, last_payment_error } = paymentIntent;

  // Log failure
  await supabase
    .from('rental_charges')
    .update({
      status: 'failed',
      error_message: last_payment_error.message
    })
    .eq('stripe_payment_intent_id', id);

  // Notify user
  await sendPaymentFailureNotification(paymentIntent.customer);

  // Optional: Retry with different payment method
  // or mark account for collection
}
```

---

## Edge Function Implementation

### Create Rental Management Edge Function

```bash
# Deploy edge function
supabase functions deploy rental-management
```

```typescript
// supabase/functions/rental-management/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-11-20.acacia'
});

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const path = url.pathname.split('/').pop();

  switch (path) {
    case 'start':
      return await startRental(req);
    case 'end':
      return await endRental(req);
    case 'webhook':
      return await handleWebhook(req);
    default:
      return new Response('Not found', { status: 404 });
  }
});

async function startRental(req: Request) {
  const { itemId, merchantName, paymentMethodId } = await req.json();

  // Create validation charge
  const validationCharge = await stripe.paymentIntents.create({
    amount: 50,
    currency: 'eur',
    payment_method: paymentMethodId,
    confirm: true,
    description: 'Rental validation charge'
  });

  // Create rental session
  const session = await supabase
    .from('rental_sessions')
    .insert({
      user_id: userId,
      item_id: itemId,
      merchant_name: merchantName,
      validation_charge_id: validationCharge.id,
      validation_paid: true,
      payment_method_id: paymentMethodId
    })
    .select()
    .single();

  return new Response(JSON.stringify(session), { status: 200 });
}

async function endRental(req: Request) {
  const { rentalSessionId } = await req.json();

  // Get rental session
  const { data: session } = await supabase
    .from('rental_sessions')
    .select('*')
    .eq('id', rentalSessionId)
    .single();

  // Calculate fees
  const fees = calculateRentalFee(
    new Date(session.start_time),
    new Date()
  );

  // Charge usage fee
  const usageCharge = await stripe.paymentIntents.create({
    amount: Math.round(fees.totalFee * 100),
    currency: 'eur',
    customer: session.customer_id,
    payment_method: session.payment_method_id,
    confirm: true,
    description: `Rental usage - ${fees.totalMinutes} minutes`,
    metadata: {
      type: 'usage',
      rental_session_id: rentalSessionId
    }
  });

  // Update session
  await supabase
    .from('rental_sessions')
    .update({
      end_time: new Date().toISOString(),
      status: 'completed',
      usage_charge_id: usageCharge.id,
      usage_amount: fees.totalFee,
      total_minutes: fees.totalMinutes,
      penalty_amount: fees.penalty
    })
    .eq('id', rentalSessionId);

  return new Response(JSON.stringify({ fees, charge: usageCharge }), {
    status: 200
  });
}
```

---

## Testing Guide

### Test Validation Charge

```bash
# Add payment method
curl -X POST ${SUPABASE_URL}/functions/v1/payment-methods \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "card",
    "stripePaymentMethodId": "pm_card_visa"
  }'

# Verify €0.50 charge in Stripe Dashboard
```

### Test Rental Flow

```bash
# 1. Start rental
curl -X POST ${SUPABASE_URL}/functions/v1/rental-management/start \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": "PB-TEST-001",
    "merchantName": "Test Merchant",
    "paymentMethodId": "pm_xxx"
  }'

# 2. Wait or simulate time passage

# 3. End rental
curl -X POST ${SUPABASE_URL}/functions/v1/rental-management/end \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "rentalSessionId": "rental-uuid"
  }'

# 4. Check charge in Stripe Dashboard
```

---

## iDEAL Payment Integration

### Payment Method Added ✅
- iDEAL now available in AddCardModal for Netherlands users
- Shows bank redirect notice
- Integrated with Stripe payment flow

### Usage
```typescript
// iDEAL appears automatically for NL country code
// User enters name → redirected to bank → completes payment
// Returns to app with payment confirmed
```

---

## Summary Flow Diagram

```
User adds payment method
    ↓
Stripe Setup Intent created
    ↓
€0.50 validation charge (immediate)
    ↓
Payment method saved
    ↓
User starts rental
    ↓
Rental session created in DB
    ↓
User returns item
    ↓
Calculate fees (30min blocks, daily cap, penalty)
    ↓
Auto-charge saved payment method
    ↓
Webhook confirms payment
    ↓
Update DB → Send receipt
```

---

## Key Benefits

✅ **Fully Automated**: No manual intervention required
✅ **Validation**: €0.50 upfront prevents fraud
✅ **Usage-Based**: Fair pricing based on actual usage
✅ **Capped**: €5 daily maximum protects users
✅ **Penalties**: €25 fee for extended rentals (5+ days)
✅ **Webhook Driven**: Reliable payment confirmation
✅ **Multi-Payment**: Supports card, iDEAL, SEPA

---

## Status

✅ Database schema designed
✅ iDEAL payment method re-added
✅ Fee calculation logic documented
✅ API workflow defined
✅ Webhook handling specified

**Next Steps**: Deploy edge functions and test full flow

## Implementation Checklist

- [ ] Deploy rental-management edge function
- [ ] Configure Stripe webhook endpoint
- [ ] Test validation charge flow
- [ ] Test rental session creation
- [ ] Test fee calculation
- [ ] Test automatic charging
- [ ] Test webhook handling
- [ ] Monitor Stripe Dashboard for charges
- [ ] Test all payment methods (card, iDEAL, SEPA)
