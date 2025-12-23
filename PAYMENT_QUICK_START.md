# Payment Method - Quick Start Guide

## 🚀 Quick Implementation

### 1. Import the Component

```tsx
import UnifiedPaymentMethod from './components/UnifiedPaymentMethod';
import { PaymentContext } from './types/payment';
```

### 2. Choose Your Payment Type

#### 💳 Subscription Payment
```tsx
const context: PaymentContext = {
  type: 'subscription',
  planName: 'Gold',              // 'flex', 'silver', or 'gold'
  billingFrequency: 'annually',  // 'monthly' or 'annually'
};
```

#### 🔋 Rental Payment
```tsx
const context: PaymentContext = {
  type: 'rental',
  stationId: 'station-abc-123',
};
```

#### ⚠️ Penalty Payment
```tsx
const context: PaymentContext = {
  type: 'penalty',
  rentalId: 'rental-xyz-456',
};
```

#### 🍽️ Booking Payment
```tsx
const context: PaymentContext = {
  type: 'booking',
  dealId: 'deal-789',
  merchantId: 'merchant-012',
  guests: 2,
  bookingDate: '2024-12-10',
  bookingTime: '19:00',
};
```

#### 💰 Wallet Top-up
```tsx
const context: PaymentContext = {
  type: 'topup',
  topupAmount: 20.00,
};
```

### 3. Render the Component

```tsx
<UnifiedPaymentMethod
  context={context}
  onBack={() => {
    // Handle back button
    setShowPayment(false);
  }}
  onSuccess={(data) => {
    // Handle successful payment
    console.log('Payment succeeded!', data);
    // Auto-redirects based on context type
  }}
  onError={(error) => {
    // Handle payment error (optional)
    console.error('Payment failed:', error);
  }}
/>
```

## 📋 Complete Example

```tsx
import { useState } from 'react';
import UnifiedPaymentMethod from './components/UnifiedPaymentMethod';
import { PaymentContext } from './types/payment';

function MyComponent() {
  const [showPayment, setShowPayment] = useState(false);

  const handlePayNow = () => {
    setShowPayment(true);
  };

  if (showPayment) {
    const context: PaymentContext = {
      type: 'subscription',
      planName: 'Gold',
      billingFrequency: 'annually',
    };

    return (
      <UnifiedPaymentMethod
        context={context}
        onBack={() => setShowPayment(false)}
        onSuccess={(data) => {
          console.log('Success!', data);
          setShowPayment(false);
        }}
      />
    );
  }

  return (
    <button onClick={handlePayNow}>
      Pay Now
    </button>
  );
}
```

## 🎯 Key Features

### ✅ Dynamic Pricing
Prices are automatically fetched from the database - no hardcoding needed!

### ✅ Multiple Payment Methods
- Credit/Debit Cards
- Apple Pay (on Apple devices)
- Google Pay (on Android/other)
- iDEAL
- PayPal

### ✅ Saved Payment Methods
Users can save cards and pay with one click on future purchases.

### ✅ Smart Redirects
After payment, users are automatically sent to the right place:
- Subscriptions → Membership page
- Rentals → Active rental screen
- Bookings → Confirmation page
- Penalties → History
- Top-ups → Wallet

## 🔒 Security

- All prices fetched from backend (can't be manipulated)
- Stripe handles sensitive card data
- JWT authentication on all API calls
- PCI-compliant payment processing

## 🧪 Testing

Use Stripe test cards:

```
Success:     4242 4242 4242 4242
3D Secure:   4000 0027 6000 3184
Declined:    4000 0000 0000 0002
```

Any future date and any 3-digit CVC.

## 📚 Need More Info?

See `UNIFIED_PAYMENT_SYSTEM.md` for:
- Detailed API reference
- Advanced configuration
- Troubleshooting guide
- Database schema requirements

## ⚡ That's It!

You're ready to accept payments. The system handles everything else automatically.
