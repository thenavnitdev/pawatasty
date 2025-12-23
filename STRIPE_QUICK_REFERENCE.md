# Stripe Payment System - Quick Reference Guide

## Payment Methods

### Add Credit Card
```typescript
import { paymentMethodsAPI } from './services/mobile/paymentMethods';

// 1. Create Stripe Payment Method using Stripe Elements
const { paymentMethod } = await stripe.createPaymentMethod({
  type: 'card',
  card: cardElement,
  billing_details: { name: cardholderName }
});

// 2. Save to backend
await paymentMethodsAPI.savePaymentMethod({
  type: 'card',
  stripePaymentMethodId: paymentMethod.id,
  isPrimary: true
});
```

### Add iDEAL/Bancontact
```typescript
// 1. Create setup intent via backend
const response = await paymentMethodsAPI.savePaymentMethod({
  type: 'ideal',
  cardholderName: 'User Name',
  isPrimary: true
});

// 2. Redirect to bank
if (response.requiresAction) {
  await stripe.confirmIdealSetup(response.clientSecret, {
    payment_method: {
      billing_details: { name: 'User Name' }
    },
    return_url: window.location.origin + '/payment-complete'
  });
}
```

### Add SEPA Direct Debit
```typescript
await paymentMethodsAPI.savePaymentMethod({
  type: 'sepa_debit',
  iban: 'NL91ABNA0417164300',
  cardholderName: 'Account Holder',
  isPrimary: true
});
```

---

## Subscriptions

### Subscribe to Plan
```typescript
// 1. Create payment intent
const response = await fetch(`${supabaseUrl}/functions/v1/subscription-payment/create-intent`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 999, // €9.99
    planName: 'Silver',
    billingFrequency: 'monthly',
    paymentMethod: 'card'
  })
});

const { clientSecret, paymentIntentId } = await response.json();

// 2. Confirm payment with Stripe
const { error } = await stripe.confirmCardPayment(clientSecret, {
  payment_method: savedPaymentMethodId
});

// 3. Confirm with backend
if (!error) {
  await fetch(`${supabaseUrl}/functions/v1/subscription-payment/confirm`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      paymentIntentId,
      paymentMethodId: savedPaymentMethodId
    })
  });
}
```

---

## Unified Payment System

### Create Payment for Any Context
```typescript
const context = {
  type: 'rental', // or 'subscription', 'penalty', 'deal', 'topup'
  stationId: 'ST123456',
  description: 'Powerbank rental pre-authorization'
};

// 1. Create payment intent
const response = await fetch(`${supabaseUrl}/functions/v1/unified-payment/create-intent`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    context,
    paymentMethodType: 'card'
  })
});

const { clientSecret, paymentIntentId, pricing } = await response.json();

// 2. Confirm payment
const { error } = await stripe.confirmCardPayment(clientSecret, {
  payment_method: paymentMethodId
});

// 3. Finalize
if (!error) {
  const result = await fetch(`${supabaseUrl}/functions/v1/unified-payment/confirm`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      paymentIntentId,
      paymentMethodId,
      context
    })
  });

  const { success, redirectTo, data } = await result.json();
  // Handle success
}
```

### Charge Saved Payment Method (Off-Session)
```typescript
const response = await fetch(`${supabaseUrl}/functions/v1/unified-payment/charge-saved-method`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    paymentMethodId: 'pm_xxx',
    context: {
      type: 'rental',
      rentalId: '12345'
    }
  })
});

const { success, paymentIntentId, error } = await response.json();
```

---

## Database Queries

### Get User's Payment Methods
```sql
SELECT * FROM payment_methods
WHERE user_id = auth.uid()
  AND payment_method_status = 'active'
ORDER BY is_primary DESC, created_at DESC;
```

### Get Primary Payment Method
```sql
SELECT * FROM payment_methods
WHERE user_id = auth.uid()
  AND is_primary = true
  AND payment_method_status = 'active'
LIMIT 1;
```

### Check if User Has Active Payment Method
```sql
SELECT EXISTS(
  SELECT 1 FROM payment_methods
  WHERE user_id = auth.uid()
    AND payment_method_status = 'active'
) AS has_payment_method;
```

### Get Subscription Pricing
```sql
SELECT * FROM membership_pricing
WHERE tier = 'silver' AND is_active = true;
```

---

## Webhook Handling

### Setup Webhook Endpoint
```
URL: https://your-project.supabase.co/functions/v1/stripe-webhook
Events: setup_intent.succeeded, setup_intent.setup_failed
```

### Webhook Response Format
```typescript
{
  received: true,
  paymentMethodActivated?: true,
  paymentMethodFailed?: true
}
```

---

## Environment Variables

### Frontend (.env)
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJh...
```

### Backend (Supabase Secrets)
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Error Handling

### Frontend Error Codes
```typescript
switch (error.code) {
  case 'card_declined':
    message = 'Your card was declined. Please try another card.';
    break;
  case 'insufficient_funds':
    message = 'Insufficient funds. Please try another card.';
    break;
  case 'expired_card':
    message = 'Your card has expired. Please use a different card.';
    break;
  default:
    message = error.message || 'Payment failed. Please try again.';
}
```

### Backend Error Responses
```typescript
{
  error: string;           // Error message
  details?: string;        // Additional details
  configured?: boolean;    // If service is configured
  hint?: string;          // Configuration hint
}
```

---

## Payment Method Capabilities

### Check Capabilities
```typescript
const capabilities = {
  card: {
    supportsSubscriptions: true,
    supportsOffSession: true,
    supportsOneTime: true
  },
  sepa_debit: {
    supportsSubscriptions: true,
    supportsOffSession: true,
    supportsOneTime: false
  },
  ideal: {
    supportsSubscriptions: true,
    supportsOffSession: true,
    supportsOneTime: true
  }
};
```

---

## Testing

### Test Cards
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0027 6000 3184
```

### Test iDEAL Banks
```
Bank: Test Bank (test mode only)
```

### Test SEPA IBANs
```
NL: NL91 ABNA 0417 1643 00
DE: DE89 3704 0044 0532 0130 00
BE: BE68 5390 0754 7034
```

---

## Common Tasks

### Set Payment Method as Primary
```typescript
await paymentMethodsAPI.setDefaultPaymentMethod(paymentMethodId);
```

### Delete Payment Method
```typescript
await paymentMethodsAPI.deletePaymentMethod(paymentMethodId);
```

### Complete Setup Intent
```typescript
await paymentMethodsAPI.completeSetup(paymentMethodId, setupIntentId);
```

### Get Customer Stripe ID
```sql
SELECT stripe_customer_id FROM users WHERE user_id = auth.uid();
```

---

## Debugging

### Frontend Console Logs
```typescript
console.log('Creating payment method...');
console.log('Payment method created:', paymentMethod.id);
console.log('Saving to backend...');
console.log('Payment method saved successfully');
```

### Backend Edge Function Logs
```bash
# View logs in Supabase Dashboard
Dashboard → Edge Functions → Select Function → Logs

# Or via CLI
supabase functions logs payment-methods --tail
```

### Stripe Dashboard
```
Dashboard → Payments → All payments
Dashboard → Customers → Select customer
Dashboard → Developers → Webhooks → View logs
```

---

## Security Checklist

- [ ] Never log full card numbers
- [ ] Never store CVV/CVC codes
- [ ] Use HTTPS only
- [ ] Validate webhook signatures
- [ ] Use RLS on payment_methods table
- [ ] Validate user ownership
- [ ] Use environment variables for keys
- [ ] Enable 3D Secure for EU
- [ ] Set up fraud detection
- [ ] Monitor failed payments

---

## Production Deployment

1. **Switch Keys**
   ```bash
   # Update .env
   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

   # Update Supabase Secrets
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_live_...
   ```

2. **Update Webhook URL**
   - Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `https://your-project.supabase.co/functions/v1/stripe-webhook`
   - Subscribe to events: `setup_intent.*`

3. **Test Production**
   - Small real transactions
   - Verify webhooks work
   - Check email receipts
   - Test refunds

---

**Last Updated:** December 9, 2025
