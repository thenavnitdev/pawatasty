# Quick Reference Guide

## 🔧 What Was Fixed Today

### Critical Fixes
1. ✅ **Merchants Not Showing:** Added foreign key relationship between deals and merchants tables
2. ✅ **Missing RLS Policies:** Added policies for orders, payment_methods, user_subscriptions, points_transactions, deal_bookings
3. ✅ **Stripe Column Missing:** Added stripe_customer_id to users table
4. ✅ **Auth Flow Blocking:** Modified loadData() to always fetch merchants regardless of profile status

---

## 📚 Key Files Reference

### Configuration
- `src/services/apiConfig.ts` - Feature flags for edge function usage
- `src/lib/supabase.ts` - Supabase client setup
- `.env` - Environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)

### Services
- `src/services/mobile/index.ts` - All API exports
- `src/services/edgeFunctions.ts` - Edge function caller
- `src/services/mobile/client.ts` - API client with auth

### Main Components
- `src/App.tsx` - Main app logic and routing
- `src/components/MapView.tsx` - Map with merchant markers
- `src/components/DiscoverView.tsx` - List of merchants
- `src/components/MerchantDetails.tsx` - Merchant detail page

### Edge Functions
- `supabase/functions/merchants/index.ts` - Merchants + deals endpoint
- `supabase/functions/reviews/index.ts` - Reviews management
- `supabase/functions/user-profile/index.ts` - User profile

---

## 🗄️ Database Quick Reference

### Key Tables
```sql
-- Merchants (public read)
SELECT * FROM merchants WHERE merchant_id = 'MC123456';

-- Deals (public read, joined with merchants)
SELECT * FROM deals WHERE merchant_id = 'MC123456';

-- User's reviews (auth required)
SELECT * FROM reviews WHERE user_id = auth.uid()::text;

-- User's liked merchants (auth required)
SELECT * FROM liked_merchants WHERE user_id = auth.uid()::text;

-- User's orders (auth required)
SELECT * FROM orders WHERE user_id = auth.uid()::text;

-- User's payment methods (auth required)
SELECT * FROM payment_methods WHERE user_id = auth.uid()::text;
```

### Foreign Keys
- `deals.merchant_id` → `merchants.merchant_id` (CASCADE)

---

## 🔐 Authentication Quick Guide

### Login Flow
```typescript
// User logs in
const { data: { session } } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// Token stored in localStorage
localStorage.setItem('supabase_token', session.access_token);

// Used in edge function calls
Authorization: Bearer ${session.access_token}
```

### Checking Auth Status
```typescript
const { data: { user } } = await supabase.auth.getUser();
// user.id is the UUID used in auth.uid()
```

---

## 🚀 Edge Function URLs

Base URL: `${VITE_SUPABASE_URL}/functions/v1/`

### Public Endpoints (No Auth)
- `GET /merchants/merchants` - Get all merchants with deals
- `GET /merchants/merchants/:id` - Get specific merchant
- `GET /stations/stations` - Get all stations
- `GET /categories/categories` - Get all categories

### Authenticated Endpoints (Requires JWT)
- `GET /reviews/reviews/:merchantId` - Get merchant reviews
- `POST /reviews/reviews` - Create review
- `GET /liked-merchants/liked` - Get user's liked merchants
- `POST /liked-merchants/like/:merchantId` - Like merchant
- `DELETE /liked-merchants/unlike/:merchantId` - Unlike merchant
- `GET /user-profile/profile` - Get user profile
- `PUT /user-profile/profile` - Update profile
- `GET /orders-management/orders` - Get user orders
- `GET /payment-methods/methods` - Get payment methods
- `POST /payment-methods/methods` - Add payment method
- `GET /subscriptions/subscriptions` - Get subscriptions
- `GET /points-balance/balance` - Get points balance
- `POST /deals-booking/bookings` - Create booking

---

## 🐛 Common Issues & Solutions

### Issue: Merchants not showing on map
**Solution:** Foreign key relationship now exists, merchants should load
**Check:** Browser console for API errors
**Verify:** `SELECT * FROM merchants LIMIT 1;` returns data

### Issue: "Authentication required" error
**Solution:** User needs to be logged in via Supabase auth
**Check:** `localStorage.getItem('supabase_token')` has value
**Verify:** JWT token is valid and not expired

### Issue: RLS policy error "permission denied"
**Solution:** Ensure user_id in table matches auth.uid()::text
**Check:** RLS policy uses correct column name and type casting
**Verify:** `SELECT auth.uid()::text;` returns user's ID

### Issue: Edge function returns 404
**Solution:** Check function is deployed and slug matches
**Verify:** Use Supabase dashboard to check function status

### Issue: Images not loading
**Solution:** Check files_storage bucket exists and is public
**Check:** Image ID exists in database
**Verify:** URL format: `${SUPABASE_URL}/storage/v1/object/public/files_storage/${id}`

---

## 📊 Monitoring & Debugging

### Check Edge Function Logs
```bash
# View recent logs for merchants function
supabase functions logs merchants --tail

# View specific time range
supabase functions logs merchants --since 1h
```

### Database Queries for Debugging
```sql
-- Check merchant count
SELECT COUNT(*) FROM merchants;

-- Check deals with merchant info
SELECT d.*, m.company_name
FROM deals d
JOIN merchants m ON d.merchant_id = m.merchant_id
LIMIT 5;

-- Check RLS policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public';

-- Check current user
SELECT auth.uid();
```

### Frontend Debugging
```javascript
// Check current restaurants state
console.log('Restaurants:', restaurants);

// Check if edge functions are enabled
console.log('Using edge functions:', isFeatureEnabled('USE_EDGE_MERCHANTS'));

// Check auth token
console.log('Has token:', !!localStorage.getItem('supabase_token'));
```

---

## 📞 Support Information

### Documentation
- Main Analysis: `SYSTEM_ANALYSIS_REPORT.md`
- Connectivity Status: `SYSTEM_CONNECTIVITY_STATUS.md`
- This Guide: `QUICK_REFERENCE.md`

### Key Migrations Applied
- `fix_merchants_deals_relationship.sql` - Foreign key relationship
- `add_critical_rls_policies.sql` - RLS policies for all tables

### Last Updated
- Date: 2025-10-21
- Status: All systems operational
- Next Review: As needed

---

## 🎯 Quick Commands

```bash
# Build project
npm run build

# Run type check
npm run typecheck

# Check edge function status
# (Use Supabase dashboard)

# Test database connection
# Use Supabase SQL editor
```

---

**Remember:** All edge functions use Supabase auth. Ensure users are logged in before calling authenticated endpoints!
