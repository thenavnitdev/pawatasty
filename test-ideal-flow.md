# Testing iDeal Flow

## Steps to Debug

1. **Open DevTools Console**
   - Press F12 or Cmd+Option+I
   - Go to Console tab

2. **Select iDeal Payment**
   - Click iDeal button
   - Check console for: "📍 Current selectedMethod: ideal"

3. **Click "Confirm Payment"**
   - Button should show "Confirm Payment" (not "Pay €144.00")
   - Check console for these messages:
     ```
     🔘 Confirm button clicked
     📍 Current selectedMethod: ideal
     📤 Will initialize payment with method: ideal
     === initializeStripePayment START ===
     Selected payment method: ideal
     Payment method to use: ideal
     Calling edge function...
     Edge function response: { clientSecret: "pi_..." }
     Setting clientSecret and enabling Stripe Elements
     State updated - should show Stripe form now
     === initializeStripePayment END ===
     ```

4. **Check for Errors**
   - Look for any red error messages in console
   - Look for failed network requests in Network tab

5. **What Should Happen**
   - Loading spinner appears briefly
   - Screen transitions to Stripe PaymentElement
   - Shows iDeal bank selector

## Common Issues

### Issue 1: Stripe Elements Not Showing
**Symptoms:** Button clicked but stays on same screen
**Possible Causes:**
- `useStripeElements` not being set to true
- `clientSecret` is null/undefined
- Error in edge function

**Check:**
```javascript
console.log('useStripeElements:', useStripeElements);
console.log('clientSecret:', clientSecret);
```

### Issue 2: Edge Function Error
**Symptoms:** Alert/error message appears
**Check:** Console for error message

### Issue 3: Stripe Not Configured
**Symptoms:** "Payment processing is not configured"
**Solution:** Add STRIPE_SECRET_KEY to Supabase secrets

## Manual Test

Open browser console and run:
```javascript
// Check if button shows correct text
document.querySelector('button').textContent  // Should be "Confirm Payment"

// Check selectedMethod
console.log('selectedMethod should be ideal')
```

## Expected Flow

```
User on Payment Method screen
↓
Clicks iDeal button → selectedMethod = 'ideal'
↓
Sees message: "You will be redirected to iDeal..."
↓
Clicks "Confirm Payment" button
↓
Button shows "Loading..." with spinner
↓
Edge function creates PaymentIntent
↓
Returns clientSecret
↓
useStripeElements = true
↓
Screen changes to Stripe Elements
↓
Shows iDeal bank selector
↓
User selects bank
↓
Clicks "Pay €144.00"
↓
Redirects to bank
```

## Debug Steps

1. Click iDeal
2. Open Console
3. Click "Confirm Payment"
4. Watch console output
5. Share any errors you see
