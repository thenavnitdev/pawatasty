# Unified Payment System Documentation

## Overview

The unified payment system provides a single, consistent interface for handling all payment types in the application. It dynamically fetches pricing from the backend, integrates with Stripe, and automatically redirects users to the appropriate destination after successful payment.

## Key Features

- **Dynamic Pricing**: All prices are fetched from the backend database - no hardcoded values
- **Multiple Payment Types**: Supports subscriptions, rentals, penalties, deals, bookings, and top-ups
- **Stripe Integration**: Complete Stripe payment flow with support for cards, iDEAL, PayPal, Apple Pay, and Google Pay
- **Saved Payment Methods**: Users can save and reuse payment methods
- **Automatic Redirects**: Smart redirects based on payment context
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Payment Retry Logic**: Built-in retry functionality for failed payments

## Architecture

### Components

1. **UnifiedPaymentMethod** (`src/components/UnifiedPaymentMethod.tsx`)
   - Main payment UI component
   - Handles payment method selection
   - Manages payment flow
   - Shows pricing breakdown

2. **Unified Payment Edge Function** (`supabase/functions/unified-payment/index.ts`)
   - Backend payment processing
   - Stripe integration
   - Dynamic pricing calculation
   - Payment confirmation and database updates

3. **Payment Types** (`src/types/payment.ts`)
   - TypeScript types for payment contexts
   - Pricing details structures
   - API request/response types

## Usage Examples

### 1. Subscription Payment

```tsx
import UnifiedPaymentMethod from './components/UnifiedPaymentMethod';
import { PaymentContext } from './types/payment';

function SubscriptionFlow() {
  const [showPayment, setShowPayment] = useState(false);

  const handleSubscribe = () => {
    setShowPayment(true);
  };

  const context: PaymentContext = {
    type: 'subscription',
    planName: 'Gold',
    billingFrequency: 'annually',
    description: 'Gold Membership - Annual',
  };

  if (showPayment) {
    return (
      <UnifiedPaymentMethod
        context={context}
        onBack={() => setShowPayment(false)}
        onSuccess={(data) => {
          console.log('Membership activated:', data.membershipLevel);
          // Redirect to membership page
          window.location.href = '/membership-success';
        }}
        onError={(error) => {
          console.error('Payment failed:', error);
        }}
      />
    );
  }

  return (
    <button onClick={handleSubscribe}>
      Subscribe to Gold
    </button>
  );
}
```

### 2. Rental Payment

```tsx
function RentalFlow() {
  const [showPayment, setShowPayment] = useState(false);
  const [stationId, setStationId] = useState('station-123');

  const context: PaymentContext = {
    type: 'rental',
    stationId: stationId,
    description: 'Power Bank Rental Pre-authorization',
  };

  if (showPayment) {
    return (
      <UnifiedPaymentMethod
        context={context}
        onBack={() => setShowPayment(false)}
        onSuccess={() => {
          console.log('Rental started');
          // Redirect to active rental page
        }}
      />
    );
  }

  return (
    <button onClick={() => setShowPayment(true)}>
      Rent Power Bank
    </button>
  );
}
```

### 3. Deal/Booking Payment

```tsx
function BookingFlow() {
  const [showPayment, setShowPayment] = useState(false);
  const dealId = 'deal-456';
  const merchantId = 'merchant-789';

  const context: PaymentContext = {
    type: 'booking',
    dealId: dealId,
    merchantId: merchantId,
    guests: 2,
    bookingDate: '2024-12-10',
    bookingTime: '19:00',
    description: 'Restaurant Booking - 2 Guests',
  };

  if (showPayment) {
    return (
      <UnifiedPaymentMethod
        context={context}
        onBack={() => setShowPayment(false)}
        onSuccess={(data) => {
          console.log('Booking confirmed:', data.bookingId);
          // Redirect to booking confirmation
        }}
      />
    );
  }

  return (
    <button onClick={() => setShowPayment(true)}>
      Book Now
    </button>
  );
}
```

### 4. Penalty Payment

```tsx
function PenaltyFlow() {
  const [showPayment, setShowPayment] = useState(false);
  const rentalId = 'rental-123';

  const context: PaymentContext = {
    type: 'penalty',
    rentalId: rentalId,
    description: 'Late Return Penalty',
  };

  if (showPayment) {
    return (
      <UnifiedPaymentMethod
        context={context}
        onBack={() => setShowPayment(false)}
        onSuccess={() => {
          console.log('Penalty paid');
          // Redirect to history
        }}
      />
    );
  }

  return (
    <button onClick={() => setShowPayment(true)}>
      Pay Penalty
    </button>
  );
}
```

### 5. Wallet Top-up

```tsx
function TopUpFlow() {
  const [showPayment, setShowPayment] = useState(false);
  const [amount, setAmount] = useState(20);

  const context: PaymentContext = {
    type: 'topup',
    topupAmount: amount,
    description: `Wallet Top-up €${amount}`,
  };

  if (showPayment) {
    return (
      <UnifiedPaymentMethod
        context={context}
        onBack={() => setShowPayment(false)}
        onSuccess={(data) => {
          console.log('New balance:', data.newBalance);
          // Redirect to wallet
        }}
      />
    );
  }

  return (
    <div>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
      />
      <button onClick={() => setShowPayment(true)}>
        Top Up €{amount}
      </button>
    </div>
  );
}
```

## Payment Context Reference

### PaymentContext Properties

```typescript
interface PaymentContext {
  type: 'subscription' | 'rental' | 'penalty' | 'deal' | 'booking' | 'topup';

  // Subscription
  planId?: string;
  planName?: string;
  billingFrequency?: 'monthly' | 'annually';

  // Rental
  stationId?: string;
  deviceId?: string;

  // Penalty
  penaltyId?: string;
  rentalId?: string;

  // Deal/Booking
  dealId?: string;
  merchantId?: string;
  guests?: number;
  bookingDate?: string;
  bookingTime?: string;

  // Top-up
  topupAmount?: number;

  // Common
  userId?: string;
  description?: string;
}
```

## Pricing Calculation

The system automatically calculates pricing based on the payment context:

### Subscription
- Fetches from `membership_pricing` table
- Uses `monthly_price` or `yearly_price` based on billing frequency
- No hardcoded prices

### Rental
- Pre-authorization amount: €0.50
- Actual rental cost calculated at return time

### Penalty
- Fetches from `rentals` table
- Uses `penalty_amount` field

### Deal/Booking
- Fetches from `deals` table
- Includes `price` and optional `service_fee`

### Top-up
- Uses the amount specified in `topupAmount`

## Redirect Destinations

After successful payment, users are automatically redirected:

| Payment Type | Redirect To |
|--------------|-------------|
| Subscription | `/membership-success` |
| Rental | `/rental-active` |
| Penalty | `/history` |
| Deal/Booking | `/booking-confirmed` |
| Top-up | `/wallet` |

You can override this behavior by providing custom logic in the `onSuccess` callback.

## Error Handling

The system provides comprehensive error handling:

```tsx
<UnifiedPaymentMethod
  context={context}
  onBack={() => setShowPayment(false)}
  onSuccess={(data) => {
    // Handle success
  }}
  onError={(error) => {
    // Handle error
    console.error('Payment error:', error);

    // Show user-friendly error message
    alert(`Payment failed: ${error}`);

    // Log for debugging
    // Track error analytics
  }}
/>
```

### Common Errors

- **"Payment processing is not configured"**: Stripe secret key not set
- **"Unable to fetch [type] pricing"**: Database query failed
- **"Payment failed"**: Stripe payment was declined
- **"Payment requires additional action"**: 3D Secure or other verification needed

## Saved Payment Methods

Users can save payment methods for faster checkout:

1. First payment with a card automatically saves it
2. Users can add more cards via "Add New" button
3. Saved methods appear at the top of the payment page
4. One-click payment with saved methods
5. Users can delete saved methods from Settings

## Testing

### Test with Stripe Test Cards

```
Success: 4242 4242 4242 4242
3D Secure: 4000 0027 6000 3184
Declined: 4000 0000 0000 0002
```

### Test Different Payment Contexts

```typescript
// Test subscription
const subscriptionContext = {
  type: 'subscription',
  planName: 'Gold',
  billingFrequency: 'monthly',
};

// Test rental
const rentalContext = {
  type: 'rental',
  stationId: 'test-station',
};

// Test booking
const bookingContext = {
  type: 'booking',
  dealId: 'test-deal',
  merchantId: 'test-merchant',
  guests: 2,
};
```

## Migration from Old Payment System

To migrate from the old `PaymentMethod` component:

### Before
```tsx
<PaymentMethod
  onBack={onBack}
  planName="Gold"
  amount={99.99}
  billingFrequency="annually"
  onSuccess={onSuccess}
  paymentMode="subscription"
/>
```

### After
```tsx
<UnifiedPaymentMethod
  context={{
    type: 'subscription',
    planName: 'Gold',
    billingFrequency: 'annually',
    description: 'Gold Membership - Annual',
  }}
  onBack={onBack}
  onSuccess={onSuccess}
/>
```

Note: The `amount` prop is removed - pricing is now fetched from the backend automatically.

## Security Considerations

1. **All pricing comes from backend** - clients cannot manipulate prices
2. **Payment intents verified server-side** - no trust in client data
3. **Stripe customer IDs stored securely** - in user table
4. **Payment methods saved with Stripe** - not storing raw card data
5. **JWT authentication required** - all API calls are authenticated

## Database Schema Requirements

Ensure these tables exist and have the correct columns:

### membership_pricing
```sql
- tier (text): 'flex', 'silver', 'gold'
- monthly_price (numeric)
- yearly_price (numeric)
```

### deals
```sql
- id (uuid)
- price (numeric)
- service_fee (numeric, optional)
```

### rentals
```sql
- id (uuid)
- penalty_amount (numeric, optional)
- penalty_paid (boolean)
```

### users
```sql
- id (uuid)
- stripe_customer_id (text, optional)
- wallet_balance (numeric, default 0)
```

### payment_methods
```sql
- id (uuid)
- user_id (uuid)
- type (text): 'card', 'ideal', 'paypal'
- stripe_payment_method_id (text)
- last_four (text)
- card_brand (text)
- is_primary (boolean)
```

## API Reference

### Edge Function Endpoints

#### POST `/unified-payment/create-intent`
Creates a payment intent with dynamic pricing.

**Request:**
```json
{
  "context": {
    "type": "subscription",
    "planName": "Gold",
    "billingFrequency": "annually"
  },
  "paymentMethodType": "card"
}
```

**Response:**
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx",
  "pricing": {
    "basePrice": 99.99,
    "totalAmount": 99.99,
    "currency": "eur",
    "breakdown": [
      {
        "label": "Gold Membership (annually)",
        "amount": 99.99
      }
    ]
  }
}
```

#### POST `/unified-payment/confirm`
Confirms a payment and updates the database.

**Request:**
```json
{
  "paymentIntentId": "pi_xxx",
  "paymentMethodId": "pm_xxx",
  "context": {
    "type": "subscription",
    "planName": "Gold"
  }
}
```

**Response:**
```json
{
  "success": true,
  "redirectTo": "/membership-success",
  "data": {
    "membershipLevel": "gold"
  }
}
```

#### POST `/unified-payment/charge-saved-method`
Charges a saved payment method.

**Request:**
```json
{
  "paymentMethodId": "pm_xxx",
  "context": {
    "type": "booking",
    "dealId": "deal-123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "redirectTo": "/booking-confirmed",
  "paymentIntentId": "pi_xxx"
}
```

## Troubleshooting

### Payment form not loading
- Check that `VITE_STRIPE_PUBLISHABLE_KEY` is set in `.env`
- Verify Stripe key starts with `pk_`

### Pricing shows as €0
- Check database has correct pricing data
- Verify context includes all required fields (e.g., `planName`, `dealId`)

### Payment succeeds but database not updated
- Check edge function logs in Supabase dashboard
- Verify user has proper permissions in RLS policies

### Saved payment method not working
- Verify `stripe_customer_id` is set in users table
- Check payment method belongs to the correct Stripe customer

## Support

For issues or questions:
1. Check edge function logs: Supabase Dashboard → Edge Functions → unified-payment
2. Check browser console for client-side errors
3. Verify all environment variables are set
4. Test with Stripe test cards first
