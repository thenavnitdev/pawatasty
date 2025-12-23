# Stripe Setup Checklist - Start Charging Money

This checklist ensures your payment system is properly configured to charge customers.

## ✅ Prerequisites

### 1. Stripe Account Setup
- [ ] Create a Stripe account at https://stripe.com
- [ ] Complete business verification (for live mode)
- [ ] Enable test mode for testing

### 2. Get Stripe API Keys
- [ ] Go to Stripe Dashboard → Developers → API keys
- [ ] Copy **Publishable key** (starts with `pk_test_` or `pk_live_`)
- [ ] Copy **Secret key** (starts with `sk_test_` or `sk_live_`)

**⚠️ NEVER commit secret keys to git or expose them in frontend code!**

---

## 🔧 Configuration Steps

### 3. Configure Frontend (Already Done)
- [x] `VITE_STRIPE_PUBLISHABLE_KEY` is set in `.env` file
- [x] Value: `pk_test_51M2D1ECcTUIOQ9MlHx82jO3oGqleOMKvBub1sYxHYTODiKzxwwAWb3hUiqgvHXCf92WXbklGIYgjLtpvh5DiQ9ll00eCtUxgsy`

### 4. Configure Supabase Edge Functions (CRITICAL)
- [ ] Go to Supabase Dashboard
- [ ] Navigate to: **Project Settings → Edge Functions → Manage secrets**
- [ ] Add new secret:
  - Name: `STRIPE_SECRET_KEY`
  - Value: Your Stripe secret key (sk_test_xxx or sk_live_xxx)
- [ ] Click "Save"

**This step is REQUIRED for payments to work!**

### 5. Deploy Edge Functions
Deploy the three payment edge functions:

```bash
# Deploy payment methods function
supabase functions deploy payment-methods

# Deploy subscription payment function
supabase functions deploy subscription-payment

# Deploy rental management function
supabase functions deploy rental-management
```

Or deploy all at once:
```bash
supabase functions deploy
```

---

## 🧪 Testing Payment Flows

### 6. Test Payment Method Addition (€0.01 Validation)

**Expected Behavior:**
- User adds a new card/SEPA payment method
- System charges **€0.01** to validate
- If successful, payment method is saved
- If fails, payment method is rejected

**Test Cards:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Expiry: Any future date
- CVC: Any 3 digits

**Verify in Stripe:**
1. Go to Stripe Dashboard → Payments
2. Find charge for €0.01
3. Check metadata has: `type: payment_method_validation`

### 7. Test Subscription Payment (Full Price Upfront)

**Expected Behavior:**
- User selects Silver or Gold plan
- System charges **full subscription price immediately**
- User membership is updated to new tier
- Subscription period begins

**Test Amounts:**
- Silver Monthly: €9.99 = 999 cents
- Gold Monthly: €19.99 = 1999 cents
- Silver Annual: €99.00 = 9900 cents
- Gold Annual: €199.00 = 19900 cents

**Verify in Stripe:**
1. Go to Stripe Dashboard → Payments
2. Find charge for subscription amount
3. Check metadata has: `type: subscription_payment`
4. Verify description: "{Plan} subscription - {frequency} - Full payment upfront"

### 8. Test Powerbank Rental (€1.00 per 30 min)

**Expected Behavior:**

**Pricing Structure:**
- €1.00 per 30 minutes (rounded up to nearest block)
- €5.00 daily cap (per 24-hour period)
- €50.00 penalty if not returned within 5 days
- Applies to ALL users (Flex, Silver, Gold)

**A) Rental Start:**
- User starts rental
- System charges **€1.00** immediately
- This covers first 30 minutes

**B) Rental End:**
- User returns powerbank
- System calculates total duration
- Rounds up to nearest 30-minute block
- Applies daily cap if applicable
- Charges difference between total and €1.00 already paid

**Test Scenarios:**

| Duration | Blocks | Total Cost | Already Paid | End Charge | Notes |
|----------|--------|------------|--------------|------------|-------|
| 20 min   | 1      | €1.00      | €1.00        | €0.00      | Within included time |
| 30 min   | 1      | €1.00      | €1.00        | €0.00      | Exactly 1 block |
| 45 min   | 2      | €2.00      | €1.00        | €1.00      | 2 blocks |
| 60 min   | 2      | €2.00      | €1.00        | €1.00      | 2 blocks |
| 90 min   | 3      | €3.00      | €1.00        | €2.00      | 3 blocks |
| 3 hours  | 6      | €5.00      | €1.00        | €4.00      | Daily cap! |
| 24 hours | 48     | €5.00      | €1.00        | €4.00      | Daily cap! |
| 26 hours | 52     | €10.00     | €1.00        | €9.00      | 2 × daily cap |
| 6+ days  | N/A    | €50.00     | €1.00        | €49.00     | Late penalty! |

**Verify in Stripe:**
1. Start rental → Check for charge with `type: flex_rental_validation` (€1.00)
2. End rental (45 min) → Check for charge with `type: flex_rental_usage` (€1.00)
3. End rental (5 hours) → Check for charge with `type: flex_rental_usage` (€4.00, capped)
4. End rental (6+ days) → Check for charge with `type: flex_rental_penalty` (€49.00)

### 9. All Users Pay For Rentals

**Important Note:**
- ALL users (Flex, Silver, Gold) pay for powerbank rentals
- Pricing is the same across all tiers: €1.00 per 30 minutes, €5.00 daily cap
- No free rentals for Silver or Gold subscribers
- Physical powerbank costs apply to all users equally

---

## 🚀 Go Live Checklist

### 10. Before Going Live

- [ ] Replace test API keys with **live** API keys
- [ ] Test all payment flows in live mode with real cards
- [ ] Set up Stripe webhooks (optional but recommended)
- [ ] Configure webhook endpoint: `https://[your-project].supabase.co/functions/v1/stripe-webhook`
- [ ] Add webhook events:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `setup_intent.succeeded`
- [ ] Test error scenarios (declined cards, insufficient funds)
- [ ] Monitor first real transactions closely

### 11. Monitoring & Support

- [ ] Regularly check Stripe Dashboard → Payments
- [ ] Monitor for failed payments
- [ ] Set up email notifications for payment issues
- [ ] Review charge metadata to ensure correct types
- [ ] Check customer support tickets for payment issues

---

## 🔍 Troubleshooting

### "Payment processing not configured" Error
**Cause:** `STRIPE_SECRET_KEY` not set in Supabase
**Fix:** Add the secret key in Supabase Dashboard → Edge Functions → Secrets

### Payment Method Validation Fails
**Cause:** Card declined or invalid
**Fix:** Use Stripe test cards for testing

### Subscription Charge Not Appearing
**Cause:** Edge function not deployed or secret key missing
**Fix:** Deploy `subscription-payment` function and verify secret key

### Flex Rental Doesn't Charge
**Cause:** Payment method not attached or missing
**Fix:** Ensure user has active payment method before allowing rental

### Charges Appearing as Wrong Amount
**Cause:** Amount should be in cents (not euros)
**Fix:** Multiply euro amount by 100 (€1.00 = 100 cents)

---

## 📊 Payment Metadata Types

Track charges by metadata type:

1. `payment_method_validation` - Adding payment method (€0.01)
2. `subscription_payment` - Subscription purchase (full amount)
3. `flex_rental_validation` - Flex rental start (€1.00)
4. `flex_rental_usage` - Flex rental additional usage (variable)

---

## 🆘 Support

If payments still aren't working after following this checklist:

1. Check Stripe Dashboard → Logs for API errors
2. Check Supabase Edge Function logs for errors
3. Verify all edge functions are deployed: `supabase functions list`
4. Test API endpoints directly with curl/Postman
5. Review PAYMENT_FLOW_DOCUMENTATION.md for detailed flow diagrams

---

## ✅ Confirmation

Once you've completed this checklist, payments should be working correctly. You can verify by:

1. Adding a test payment method → See €0.01 charge in Stripe
2. Subscribing to a plan → See full amount charge in Stripe
3. Starting a Flex rental → See €1.00 charge in Stripe
4. Ending rental after 45 min → See additional usage charge in Stripe

All charges should have correct metadata types and descriptions.
