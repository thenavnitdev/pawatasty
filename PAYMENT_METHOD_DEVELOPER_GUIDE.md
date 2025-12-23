# Payment Method Developer Guide

## Quick Reference for Using the New Payment System

### Overview

All payment methods now require a valid `stripe_payment_method_id` before they can be used. This ensures reliable payment processing for subscriptions, rentals, and one-time charges.

## Payment Method Types & Their Flows

### 1. Credit/Debit Cards

**Frontend Flow**:
```javascript
// 1. Initialize Stripe
const stripe = await loadStripe(publishableKey);
const elements = stripe.elements();
const cardElement = elements.create('card');
cardElement.mount('#card-element');

// 2. Create Payment Method when user submits
const { error, paymentMethod } = await stripe.createPaymentMethod({
  type: 'card',
  card: cardElement,
  billing_details: {
    name: cardholderName,
  },
});

if (error) {
  // Handle error
  return;
}

// 3. Send to backend
const response = await fetch('/functions/v1/payment-methods', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    type: 'card',
    stripePaymentMethodId: paymentMethod.id, // This is critical!
    isPrimary: true,
  }),
});

const result = await response.json();
// Backend automatically creates 0.50 EUR validation charge
console.log('Validation charge:', result.validationCharge);
```

### 2. SEPA Direct Debit

**Frontend Flow**:
```javascript
// 1. Collect IBAN and name from user
const iban = 'DE89370400440532013000';
const name = 'John Doe';

// 2. Send to backend (backend creates Stripe PM)
const response = await fetch('/functions/v1/payment-methods', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    type: 'sepa_debit',
    iban: iban,
    cardholderName: name,
    email: userEmail, // Optional
  }),
});

const result = await response.json();
// Backend creates Stripe PM and validation charge automatically
```

### 3. iDEAL (Redirect Flow)

**Frontend Flow**:
```javascript
// 1. Request setup intent
const response = await fetch('/functions/v1/payment-methods', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    type: 'ideal',
    cardholderName: 'John Doe',
  }),
});

const result = await response.json();

if (result.requiresAction) {
  // 2. Redirect user to Stripe checkout
  window.location.href = result.checkoutUrl;

  // 3. User completes setup at Stripe
  // 4. Webhook activates payment method automatically
  // 5. User returns to success_url

  // 6. After return, refresh payment methods
  const methods = await fetchPaymentMethods();
  // Payment method now active with stripe_payment_method_id
}
```

### 4. Apple Pay / Google Pay

**Frontend Flow**:
```javascript
// 1. Initialize Payment Request
const stripe = await loadStripe(publishableKey);
const paymentRequest = stripe.paymentRequest({
  country: 'NL',
  currency: 'eur',
  total: {
    label: 'Payment Method Validation',
    amount: 50, // 0.50 EUR
  },
  requestPayerName: true,
  requestPayerEmail: true,
});

// 2. Check availability
const result = await paymentRequest.canMakePayment();
if (!result) {
  // Apple Pay / Google Pay not available
  return;
}

// 3. Handle payment method
paymentRequest.on('paymentmethod', async (ev) => {
  // 4. Send to backend
  const response = await fetch('/functions/v1/payment-methods', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: result.applePay ? 'applepay' : 'googlepay',
      stripePaymentMethodId: ev.paymentMethod.id,
    }),
  });

  const data = await response.json();
  if (data.id) {
    ev.complete('success');
  } else {
    ev.complete('fail');
  }
});

// 5. Show payment sheet
paymentRequest.show();
```

## Fetching Payment Methods

```javascript
const response = await fetch('/functions/v1/payment-methods', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
  },
});

const { paymentMethods } = await response.json();

// Each payment method includes:
paymentMethods.forEach(pm => {
  console.log({
    id: pm.id,
    type: pm.type,
    lastFour: pm.lastFour,
    cardBrand: pm.cardBrand,
    stripePaymentMethodId: pm.stripePaymentMethodId, // Always present for active methods
    status: pm.status, // 'active', 'pending', 'failed', 'inactive'
    supportsSubscriptions: pm.supportsSubscriptions,
    supportsOffSession: pm.supportsOffSession,
    supportsOneTime: pm.supportsOneTime,
    isPrimary: pm.isPrimary,
  });
});
```

## Filtering Payment Methods by Capability

```javascript
// For subscriptions - need recurring support
const subscriptionMethods = paymentMethods.filter(pm =>
  pm.status === 'active' && pm.supportsSubscriptions
);

// For rentals - need off-session support
const rentalMethods = paymentMethods.filter(pm =>
  pm.status === 'active' && pm.supportsOffSession
);

// For one-time payments
const oneTimeMethods = paymentMethods.filter(pm =>
  pm.status === 'active' && pm.supportsOneTime
);
```

## Error Handling

### Missing stripe_payment_method_id Error

```javascript
{
  "error": "This payment method is missing required Stripe payment information...",
  "paymentMethodType": "ideal",
  "paymentMethodId": 123,
  "requiresReAdd": true
}
```

**Solution**: Show user a message to remove and re-add the payment method.

### Payment Method Not Supported Error

```javascript
{
  "error": "This payment method type does not support recurring subscriptions...",
  "paymentMethodType": "sepa_debit"
}
```

**Solution**: Guide user to add a different payment method type.

### Validation Charge Failed

```javascript
{
  "error": "Payment failed",
  "details": { ... },
  "debugInfo": {
    "paymentMethodType": "card",
    "stripePaymentMethodId": "pm_xxx",
    "amount": 50
  }
}
```

**Solution**: The 0.50 EUR validation charge failed. Check card balance or try different method.

## Subscription Payment Flow

```javascript
// 1. Get payment methods
const methods = await fetchPaymentMethods();

// 2. Filter for subscription support
const validMethods = methods.filter(pm =>
  pm.status === 'active' && pm.supportsSubscriptions
);

if (validMethods.length === 0) {
  // Prompt user to add a payment method
  showAddPaymentMethodModal();
  return;
}

// 3. Upgrade subscription
const response = await fetch('/functions/v1/subscriptions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    tier: 'gold',
    paymentMethodId: validMethods[0].id, // Use primary method
  }),
});

// Backend automatically:
// - Validates payment method has stripe_payment_method_id
// - Checks supports_subscriptions flag
// - Creates payment intent with setup_future_usage: off_session
// - Updates user membership
```

## Rental Flow

```javascript
// 1. Start rental
const response = await fetch('/functions/v1/rental-management/start', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    itemId: 'pb_123',
    stationId: 'station_456',
    merchantName: 'Coffee Shop',
  }),
});

// Backend automatically:
// - Finds active payment method with supports_off_session
// - Validates stripe_payment_method_id exists
// - Verifies payment method with Stripe API
// - Creates rental record

// 2. End rental (charges automatically)
const endResponse = await fetch('/functions/v1/rental-management/end', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    rentalId: 789,
  }),
});

// Backend automatically:
// - Calculates usage fees
// - Charges off-session using stripe_payment_method_id
// - Updates rental with payment details
```

## Status Meanings

- **active**: Ready to use, has valid stripe_payment_method_id
- **pending**: Setup in progress (iDEAL/Bancontact redirect pending)
- **failed**: Setup failed, cannot be used
- **inactive**: Missing stripe_payment_method_id or deprecated

## Best Practices

1. **Always check status** before showing payment methods to user
2. **Filter by capability** based on use case (subscription vs rental)
3. **Handle redirects** properly for iDEAL/Bancontact
4. **Show clear errors** when payment methods need attention
5. **Refresh after redirect** to get updated status
6. **Use primary method** as default selection
7. **Validate on frontend** before sending to backend

## Common Issues & Solutions

### Issue: "Payment method not found or inactive"
**Solution**: Payment method was deleted or marked inactive. Fetch fresh list.

### Issue: "Please add a payment method first"
**Solution**: User has no active payment methods. Show add payment method flow.

### Issue: "No active payment method found that supports automatic charging"
**Solution**: User needs to add a method that supports off-session (card, SEPA, iDEAL, or Bancontact).

### Issue: Validation charge fails with insufficient funds
**Solution**: User needs 0.50 EUR available. This charge confirms the payment method works.

## Testing

Use Stripe test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires auth: `4000 0025 0000 3155`

For iDEAL test mode, Stripe provides a test bank that always succeeds.

## Security Notes

- Never send card details directly to your backend
- Always use Stripe.js to create payment methods
- Backend validates all payment methods with Stripe API
- Webhook signatures verified for security
- Payment methods attached to customers only
