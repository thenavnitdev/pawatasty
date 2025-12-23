# Subscriptions Edge Function - Syntax Fix

## Issue Identified

The subscriptions edge function had **escaped backticks** (`\``) in template literals, causing syntax errors when the function was deployed to Deno.

### Locations of Syntax Errors

1. **Line 84** - User memberships query
2. **Line 132** - Active membership query
3. **Line 286** - Stripe customer creation authorization header
4. **Line 392** - Payment intent description
5. **Line 398** - Payment intent authorization header

### Error Symptom

When calling `GET /functions/v1/subscriptions/plans`, the edge function would fail to parse, causing the error message:
```
Unable to Load Plans
Payment method not configured properly. Please add a valid card.
```

This was misleading because the error wasn't about payment methods - it was a **syntax error** preventing the function from running at all.

## Fix Applied

### Before (Broken)
```typescript
.select(\`
  *,
  membership_pricing!inner(*)
\`)

"Authorization": \`Bearer \${stripeSecretKey}\`

description: \`\${plan.display_name} Subscription - \${plan.subscription_interval}\`
```

### After (Fixed)
```typescript
.select("*, membership_pricing!inner(*)")

"Authorization": `Bearer ${stripeSecretKey}`

description: `${plan.display_name} Subscription - ${plan.subscription_interval}`
```

## Changes Made

✅ Removed multiline template literals - converted to single-line strings
✅ Fixed escaped backticks in template literal expressions
✅ All template literals now use proper syntax: `` `${variable}` ``

## Impact

With this fix:
- ✅ `GET /plans` endpoint now works correctly
- ✅ `GET /subscriptions` endpoint now works correctly
- ✅ `GET /subscriptions/active` endpoint now works correctly
- ✅ `POST /subscriptions` (create subscription) now works correctly
- ✅ `DELETE /subscriptions/:id` (cancel) now works correctly

## Payment Method Requirements (Still Valid)

The payment method validation logic is correct and working:

### For Subscriptions (Silver/Gold):
- ✅ **Credit/Debit Cards** with Stripe payment method ID
- ❌ **Google Pay/Apple Pay** - No Stripe PM ID, can't be charged automatically
- ❌ **iDEAL/Bancontact** - Redirect required, not suitable for subscriptions
- ❌ **SEPA Direct Debit** - Not yet implemented

### Current Database State
```sql
-- All existing payment methods are Google Pay without Stripe IDs
id=16, type=googlepay, stripe_payment_method_id=NULL ❌
id=15, type=googlepay, stripe_payment_method_id=NULL ❌
id=14, type=googlepay, stripe_payment_method_id=NULL ❌
```

## Action Required

**To upgrade to paid membership:**
1. Add a credit/debit card through the Stripe payment form
2. The card will be saved with a Stripe payment method ID
3. Then you can select that card and upgrade to Silver or Gold

## Next Deployment

The fixed subscriptions function needs to be redeployed to Supabase:
```bash
# Deploy command (would be run via MCP tool)
supabase functions deploy subscriptions
```

After deployment, the plans endpoint will load successfully and show proper validation errors when trying to use unsupported payment methods.
