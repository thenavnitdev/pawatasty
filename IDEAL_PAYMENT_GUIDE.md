# iDEAL Payment Implementation Guide

## Overview

iDEAL is the most popular online payment method in the Netherlands, used by most Dutch banks. This guide explains how iDEAL payments work in the application and how to test them.

## How iDEAL Works

iDEAL is a **redirect-based payment method**:

1. User selects iDEAL as payment method
2. User enters their name
3. User is redirected to their bank's website
4. User authorizes the payment at their bank
5. User is redirected back to the app
6. Payment method is automatically activated

## Key Differences from Cards

| Feature | Credit/Debit Card | iDEAL |
|---------|------------------|-------|
| Entry Method | Direct card input | Bank redirect |
| Verification | CVV/3D Secure | Bank login |
| Setup Time | Instant | 30-60 seconds |
| Works for | Subscriptions & One-time | Subscriptions & One-time |
| User leaves app | No | Yes (temporarily) |

## User Flow

### Step 1: Select iDEAL
- User navigates to Payment Methods
- Clicks "Add Payment Method"
- Selects "iDEAL" option (only shown for Dutch users)

### Step 2: Enter Name
- User enters their full name
- Sees informational message about redirect
- Clicks "Add Payment Method" button

### Step 3: Bank Redirect
- Automatically redirected to iDEAL payment page
- Selects their bank (ABN AMRO, ING, Rabobank, etc.)
- Logs into their bank's website
- Authorizes the payment method

### Step 4: Return to App
- Automatically redirected back to app
- Setup is completed automatically
- Payment method appears as "iDEAL" in list
- Can immediately be used for payments

## Technical Implementation

### Frontend Components

**1. AddCardModal** (`src/components/AddCardModal.tsx`)
- Shows iDEAL option for Dutch users (country code: NL)
- Collects user's name
- Creates Setup Intent via API
- Shows IdealPaymentSetup component

**2. IdealPaymentSetup** (`src/components/IdealPaymentSetup.tsx`)
- Receives Setup Intent client secret
- Uses Stripe.js `confirmSetup()` method
- Redirects to iDEAL bank selection
- Handles errors if redirect fails

**3. App.tsx** (`src/App.tsx`)
- Checks for redirect return URL parameters
- Calls payment method completion API
- Cleans up URL parameters
- Shows success message

### Backend Flow

**1. Create Setup Intent** (Payment Methods Edge Function)
```typescript
// POST /functions/v1/payment-methods
{
  type: 'ideal',
  cardholderName: 'John Doe',
  isPrimary: true
}
```

Response includes:
- `requiresAction: true`
- `setupIntentId: 'seti_xxx'`
- `clientSecret: 'seti_xxx_secret_xxx'`
- `paymentMethodId: 123` (database ID)

**2. Confirm Setup** (Frontend with Stripe.js)
```typescript
stripe.confirmSetup({
  clientSecret: 'seti_xxx_secret_xxx',
  confirmParams: {
    return_url: 'https://yourdomain.com/?payment_setup_complete=123&setup_intent=seti_xxx'
  }
})
```

**3. Complete Setup** (After Redirect)
```typescript
// PUT /functions/v1/payment-methods/123/complete
{
  setupIntentId: 'seti_xxx'
}
```

Updates payment method:
- Status: 'pending' → 'active'
- Stores Stripe payment method ID
- Sets setup completion timestamp

### Database Schema

Payment methods table stores:
```sql
{
  id: 123,
  user_id: 'uuid',
  type: 'ideal',
  last_four: 'iDEAL',
  card_brand: 'ideal',
  stripe_payment_method_id: 'pm_xxx',
  stripe_setup_intent_id: 'seti_xxx',
  payment_method_status: 'active',
  setup_completed_at: '2024-12-09T...',
  is_primary: true,
  supports_subscriptions: true,
  supports_off_session: true,
  supports_one_time: true
}
```

## URL Parameters

The app uses URL parameters to track the redirect flow:

### Outgoing (to bank)
```
https://checkout.stripe.com/...?return_url=...
```

### Return (from bank)
```
https://yourdomain.com/?payment_setup_complete=123&setup_intent=seti_xxx
```

Parameters:
- `payment_setup_complete`: Database payment method ID
- `setup_intent`: Stripe Setup Intent ID
- `setup_intent_client_secret`: Alternative parameter (also supported)

## Testing iDEAL

### Test Mode

In Stripe test mode, iDEAL can be tested without a real bank account:

**Test Banks Available:**
- Test Bank (always succeeds)
- Test Bank - Insufficient Funds (fails)
- Test Bank - Lost Card (fails)
- Test Bank - Cancellation (user cancels)

### Testing Steps

1. **Setup Stripe Test Mode**
   - Use test API keys (pk_test_...)
   - Enable iDEAL in Stripe Dashboard (Payment Methods)

2. **Create Test iDEAL Payment**
   - Select iDEAL in app
   - Enter any name
   - Select "Test Bank" when redirected
   - Click "Authorize Test Payment"

3. **Verify Success**
   - Redirected back to app
   - Payment method appears with status "active"
   - Can be used for test subscriptions

4. **Test Failure Scenarios**
   - Select "Test Bank - Insufficient Funds"
   - Verify error handling
   - Payment method should remain "pending" or be deleted

### Production Testing

In live mode, use real bank accounts:

1. **Netherlands Bank Account Required**
   - Must have account at supported Dutch bank
   - ABN AMRO, ING, Rabobank, SNS, etc.

2. **Small Test Payment**
   - iDEAL requires no validation charge
   - Setup is free
   - Can test with actual bank authorization

3. **Verify Bank Authorization**
   - Complete login at your bank
   - Confirm the authorization
   - Return to app to complete

## Error Handling

### Common Errors and Solutions

**1. User Cancels at Bank**
```
Error: "User cancelled the payment"
```
Solution: Payment method remains in "pending" state. User can retry or choose different method.

**2. Network Error During Redirect**
```
Error: "Failed to complete payment setup"
```
Solution: App auto-retries completion when user returns. Check network connection.

**3. Session Expired**
```
Error: "Invalid token" or "Not authenticated"
```
Solution: User needs to log in again. Session may have expired during bank redirect.

**4. Setup Intent Already Used**
```
Error: "This SetupIntent was already confirmed"
```
Solution: Clean up URL parameters and start fresh. Payment method may already be active.

### Handling Redirect Edge Cases

**User closes browser:**
- Setup Intent remains in "processing" state
- When user returns and logs in, they can retry
- Old pending methods can be cleaned up

**User doesn't return:**
- Payment method stays "pending" in database
- Automatic cleanup can remove old pending methods
- User can create new payment method

**Multiple devices:**
- Setup Intent tied to specific return URL
- User must complete on same device/browser
- Cross-device will fail - start new setup

## Supported Banks

iDEAL supports all major Dutch banks:

### Major Banks
- ABN AMRO
- ING
- Rabobank
- SNS Bank
- ASN Bank
- Triodos Bank
- RegioBank

### Online Banks
- bunq
- Knab
- N26 (Netherlands)
- Revolut (Netherlands)

### Others
- All Dutch cooperative banks
- Most smaller regional banks

## Configuration

### Environment Variables

Required in `.env`:
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
STRIPE_SECRET_KEY=sk_test_... # Backend only
```

### Stripe Dashboard Setup

1. **Enable iDEAL**
   - Go to Settings → Payment methods
   - Enable "iDEAL"
   - Save changes

2. **Test vs Live Mode**
   - Test mode: Use test banks
   - Live mode: Use real banks
   - Toggle in Stripe Dashboard

3. **Webhooks (Optional)**
   - Setup Intent succeeded
   - Setup Intent failed
   - Payment method attached

### User Country Detection

iDEAL only shown to Dutch users:

```typescript
// Automatic detection based on phone number
if (countryCode === 'NL') {
  setShowIdeal(true);
}
```

To override for testing:
- Use Dutch phone number (+31...)
- Or manually set country in profile

## Best Practices

### User Experience

1. **Clear Messaging**
   - Explain redirect before it happens
   - Show loading state during redirect
   - Confirm success after return

2. **Error Recovery**
   - Allow retry without re-entering data
   - Provide alternative payment methods
   - Don't block user if iDEAL fails

3. **Mobile Optimization**
   - Deep linking for mobile apps
   - Proper return URL handling
   - Test on iOS and Android

### Security

1. **Validate Return**
   - Always verify Setup Intent status with Stripe
   - Don't trust URL parameters alone
   - Check user authentication

2. **Handle Expiry**
   - Setup Intents expire after 24 hours
   - Clean up expired pending methods
   - Allow user to create new setup

3. **Prevent Duplicates**
   - Check if payment method already exists
   - Validate Setup Intent is unused
   - Handle race conditions

### Performance

1. **Fast Redirect**
   - Minimize loading time before redirect
   - Use Stripe.js for instant redirect
   - Show progress indicator

2. **Quick Return**
   - Auto-detect return from bank
   - Complete setup immediately
   - Show success without delay

3. **Error Recovery**
   - Cache form data for retry
   - Allow quick re-attempt
   - Don't make user start over

## Troubleshooting

### iDEAL Option Not Showing

Check:
- [ ] User has Dutch phone number (+31...)
- [ ] User profile country code is 'NL'
- [ ] iDEAL enabled in Stripe Dashboard
- [ ] Running in supported country

### Redirect Fails

Check:
- [ ] Valid Setup Intent client secret
- [ ] Return URL is HTTPS (or localhost)
- [ ] No popup blockers
- [ ] Browser allows redirects

### Return Handling Fails

Check:
- [ ] URL parameters present
- [ ] User still authenticated
- [ ] Setup Intent not expired
- [ ] Network connection stable

### Payment Method Not Activating

Check:
- [ ] Setup Intent status is "succeeded"
- [ ] Completion endpoint called
- [ ] Database updated
- [ ] No validation errors

## Monitoring and Logs

### Frontend Logs

```javascript
// iDEAL setup
'Starting iDEAL setup confirmation...'
'Setup Intent ID: seti_xxx'
'✅ iDEAL setup initiated, redirecting to bank...'

// Return handling
'💳 Detected iDEAL/Bancontact return, completing setup...'
'✅ Payment method setup completed successfully'

// Errors
'❌ iDEAL setup error: [error message]'
'❌ Error completing payment setup: [error message]'
```

### Backend Logs

Monitor in Supabase Edge Functions:
- Setup Intent creation
- Payment method insertion
- Setup completion
- Status updates

### Stripe Dashboard

Check:
- Setup Intents logs
- Payment Methods attached
- Customer records
- Error rates

## Migration from Old Implementation

If upgrading from previous iDEAL implementation:

1. **Update Stripe.js Method**
   ```typescript
   // Old (deprecated)
   stripe.confirmIdealSetup(clientSecret, {...})

   // New (current)
   stripe.confirmSetup({clientSecret, confirmParams: {...}})
   ```

2. **Update Return URL Handling**
   - Add check in App.tsx for URL parameters
   - Call completion endpoint
   - Clean up URL

3. **Database Migration**
   - Ensure `stripe_setup_intent_id` column exists
   - Add `payment_method_status` column
   - Update RLS policies

## Summary

**Development:**
- Use Stripe test mode with test banks
- Test all error scenarios
- Verify redirect handling

**Production:**
- Enable iDEAL in Stripe Dashboard (live mode)
- Test with real Dutch bank account
- Monitor for errors and completion rates

**Key Points:**
- iDEAL requires bank redirect
- User must complete at their bank
- Return URL handled automatically
- Works for subscriptions and one-time payments

---

**Last Updated:** December 2024
**Status:** Production ready
**Supported Countries:** Netherlands (NL)
