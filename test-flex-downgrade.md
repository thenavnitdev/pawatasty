# Test: Flex Plan Free Downgrade

## Test Scenario: Downgrade from Gold/Silver to Flex (Free)

### Prerequisites
- User must be authenticated
- User must currently be on a paid plan (Silver or Gold)

### Test Steps

#### Step 1: Check Current Subscription
```javascript
// Check user's current plan
const { data: { user } } = await supabase.auth.getUser();
const { data: currentUser } = await supabase
  .from('users')
  .select('subscription, current_level')
  .eq('user_id', user.id)
  .single();

console.log('Current Plan:', currentUser.subscription);
console.log('Current Level:', currentUser.current_level);
// Expected: subscription = 'gold' or 'silver', current_level = 2 or 3
```

#### Step 2: Initiate Flex Downgrade (No Payment Method)
```javascript
const { data: { session } } = await supabase.auth.getSession();

const response = await fetch(
  `${SUPABASE_URL}/functions/v1/subscriptions`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tier: 'flex',
      paymentMethodId: null, // No payment method needed!
    }),
  }
);

const result = await response.json();
console.log('Downgrade Result:', result);

// Expected Response:
// {
//   "success": true,
//   "message": "Downgraded to Flex plan successfully",
//   "tier": "flex",
//   "level": 1,
//   "amount": 0,
//   "paymentIntentId": null
// }
```

#### Step 3: Verify Subscription Updated
```javascript
const { data: updatedUser } = await supabase
  .from('users')
  .select('subscription, current_level')
  .eq('user_id', user.id)
  .single();

console.log('Updated Plan:', updatedUser.subscription);
console.log('Updated Level:', updatedUser.current_level);

// Expected:
// subscription = 'flex'
// current_level = 1
```

#### Step 4: Verify Membership Record
```javascript
const { data: membership } = await supabase
  .from('user_memberships')
  .select('*')
  .eq('user_id', user.id)
  .single();

console.log('Membership Tier:', membership.membership_tier);
console.log('Subscription Status:', membership.subscription_status);
console.log('End Date:', membership.subscription_end_date);
console.log('Stripe Subscription ID:', membership.stripe_subscription_id);

// Expected:
// membership_tier = 'flex'
// subscription_status = 'active'
// subscription_end_date = null (Flex has no expiration)
// stripe_subscription_id = null (no Stripe subscription)
```

#### Step 5: Verify No Stripe Payment Created
```bash
# Check Stripe dashboard - no new payment intents should be created
# Search for user's email or customer ID
# Verify no new charges in the last few minutes
```

### Expected Results

✅ **API Response**
- Returns success: true
- Returns amount: 0
- Returns paymentIntentId: null
- Returns tier: "flex"
- Returns level: 1

✅ **Database Updates**
- users.subscription = 'flex'
- users.current_level = 1
- user_memberships.membership_tier = 'flex'
- user_memberships.subscription_end_date = null
- user_memberships.stripe_subscription_id = null

✅ **No Payment Processing**
- No Stripe payment intent created
- No charges in Stripe dashboard
- No payment method validation

✅ **User Experience**
- No payment method selection modal
- Instant downgrade (no delays)
- Success message: "Plan Changed!"

### Error Cases to Test

#### Test Case 1: Already on Flex
```javascript
// Try to "downgrade" to Flex when already on Flex
// Expected: Success (idempotent operation)
```

#### Test Case 2: Unauthenticated Request
```javascript
// Try without authentication token
// Expected: 401 Unauthorized error
```

#### Test Case 3: Invalid Tier
```javascript
// Try with tier: 'invalid'
// Expected: "Invalid subscription tier" error
```

### Test Paid Plan Upgrades Still Work

After testing Flex downgrade, verify paid plans still require payment:

```javascript
// Try to upgrade to Gold
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/subscriptions`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tier: 'gold',
      paymentMethodId: null, // No payment method provided
    }),
  }
);

const result = await response.json();
console.log('Result:', result);

// Expected: Error "Missing payment method"
```

## Manual UI Testing

1. **Open app** and navigate to Memberships
2. **Select Flex plan** card
3. **Verify button text** shows "Downgrade" (if coming from Gold/Silver)
4. **Click Downgrade**
5. **Verify no payment modal** appears
6. **Verify success message**: "Plan Changed! You have successfully switched to the Flex Plan"
7. **Check user menu** - verify plan shows as "Flex"

## Success Criteria

- ✅ Flex downgrades are completely free (€0)
- ✅ No payment method required
- ✅ No Stripe transactions created
- ✅ User plan updates immediately
- ✅ Success message displays correctly
- ✅ Paid plan upgrades still require payment method
- ✅ All database records updated correctly
