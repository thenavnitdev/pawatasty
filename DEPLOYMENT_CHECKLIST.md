# Deployment Checklist

Complete guide for deploying your application to production.

---

## Pre-Deployment Checklist

### 1. Environment Variables ✅
Verify all required environment variables are set:

```bash
# Frontend (.env)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_BASE_URL=your_api_url (optional)
```

**Verification:**
```bash
cat .env | grep VITE_SUPABASE
```

### 2. Database Status ✅
Verify database is ready:

- [ ] All migrations applied
- [ ] RLS enabled on all tables
- [ ] RLS policies configured
- [ ] Subscription plans seeded
- [ ] Test data populated (optional)

**Verification:**
```bash
# Run health check
node test-system-health.js
```

### 3. Edge Functions ✅
Verify all Edge Functions deployed:

- [ ] 18 Edge Functions active
- [ ] CORS configured on all functions
- [ ] Authentication working
- [ ] Error handling implemented

**Verification:**
```bash
# Test API integration
node test-api-integration.js
```

### 4. Feature Flags ✅
Configure feature flags in `src/services/apiConfig.ts`:

```typescript
export const API_FEATURES = {
  USE_EDGE_MERCHANTS: true,      // ✅ Ready
  USE_EDGE_STATIONS: true,       // ✅ Ready
  USE_EDGE_CATEGORIES: true,     // ✅ Ready
  USE_EDGE_DEALS: true,          // ✅ Ready
  USE_EDGE_ORDERS: true,         // ✅ Ready
  USE_EDGE_LIKED_MERCHANTS: true,// ✅ Ready
  USE_EDGE_PROFILE: true,        // ✅ Ready
  USE_EDGE_SUBSCRIPTIONS: true,  // ✅ Ready
  USE_EDGE_REVIEWS: true,        // ✅ Ready
};
```

**Strategy:**
- **Week 1:** Enable 2-3 features, monitor
- **Week 2:** Enable 3-4 more features
- **Week 3:** Enable all features
- **Week 4:** Monitor and optimize

### 5. Build Verification ✅

```bash
npm run build
```

**Expected Output:**
```
✓ built in ~5s
dist/index.html     0.59 kB
dist/assets/*.css   ~50 kB
dist/assets/*.js    ~575 kB
```

---

## Deployment Steps

### Step 1: Code Review
- [ ] All tests passing
- [ ] No console errors
- [ ] Code properly formatted
- [ ] Documentation updated

### Step 2: Database Backup
```sql
-- Take backup before deployment
-- Use Supabase Dashboard → Database → Backups
```

### Step 3: Deploy Edge Functions
All Edge Functions are already deployed. To update:

```bash
# Functions are updated via Supabase CLI or Dashboard
# Current deployment is complete and active
```

### Step 4: Build Frontend
```bash
npm run build
```

### Step 5: Deploy Frontend
Deploy the `dist/` folder to your hosting provider:

**Options:**
- Vercel
- Netlify
- Cloudflare Pages
- AWS S3 + CloudFront
- Your own server

**Example (Vercel):**
```bash
vercel --prod
```

### Step 6: Verify Deployment
```bash
# Test production URL
curl https://your-domain.com
```

---

## Post-Deployment Verification

### 1. Smoke Tests
- [ ] Homepage loads
- [ ] Authentication works
- [ ] Merchants display
- [ ] Search functions
- [ ] Bookings work
- [ ] Reviews post successfully
- [ ] Profile updates save

### 2. Monitor Edge Functions
Check Supabase Dashboard → Edge Functions:
- [ ] No errors in logs
- [ ] Response times < 1s
- [ ] Success rate > 99%

### 3. Database Monitoring
Check Supabase Dashboard → Database:
- [ ] Connection pool healthy
- [ ] Query performance good
- [ ] No failed queries

### 4. Error Monitoring
Set up error tracking:
- [ ] Sentry integration (optional)
- [ ] Log aggregation
- [ ] Alert notifications

---

## Rollback Plan

If issues occur:

### Quick Rollback
```bash
# Disable problematic feature
# Edit src/services/apiConfig.ts
USE_EDGE_MERCHANTS: false  # Back to external API
```

### Full Rollback
```bash
# Deploy previous version
git checkout previous-tag
npm run build
# Deploy dist/ folder
```

### Database Rollback
```sql
-- Restore from backup
-- Use Supabase Dashboard → Database → Backups
```

---

## Performance Optimization

### 1. Frontend Optimization
- [ ] Enable code splitting
- [ ] Optimize bundle size
- [ ] Implement lazy loading
- [ ] Add service worker (PWA)

**Code Splitting Example:**
```typescript
// Use dynamic imports
const MerchantDetails = lazy(() => import('./components/MerchantDetails'));
```

### 2. Edge Function Optimization
- [ ] Cache responses where appropriate
- [ ] Minimize database queries
- [ ] Use connection pooling
- [ ] Implement pagination

### 3. Database Optimization
- [ ] Add indexes on frequently queried columns
- [ ] Optimize slow queries
- [ ] Enable statement cache
- [ ] Review RLS policies for performance

---

## Security Checklist

### Pre-Production
- [ ] All secrets in environment variables
- [ ] No hardcoded credentials
- [ ] RLS enabled on all tables
- [ ] API keys rotated
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation in place

### Authentication
- [ ] Email verification working
- [ ] Password reset functional
- [ ] JWT expiration set
- [ ] Session management secure
- [ ] OAuth providers configured (if used)

### API Security
- [ ] All sensitive endpoints require auth
- [ ] Rate limiting on auth endpoints
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection

---

## Monitoring Setup

### 1. Uptime Monitoring
Services to use:
- UptimeRobot (free)
- Pingdom
- StatusCake

**Endpoints to monitor:**
- Frontend: `https://your-domain.com`
- API: `https://your-supabase-url.supabase.co/functions/v1/merchants`

### 2. Performance Monitoring
- [ ] Google Analytics
- [ ] Core Web Vitals
- [ ] Lighthouse CI
- [ ] Real User Monitoring (RUM)

### 3. Error Tracking
- [ ] Frontend errors (Sentry)
- [ ] Edge Function errors (Supabase logs)
- [ ] Database errors (Supabase monitoring)

### 4. Business Metrics
Track:
- Daily active users
- Bookings per day
- Reviews submitted
- Subscription conversions
- Revenue metrics

---

## Progressive Rollout Strategy

### Week 1: Beta Testing (10% traffic)
```typescript
// Feature flags for 10% of users
const isEnabled = Math.random() < 0.1;
USE_EDGE_MERCHANTS: isEnabled
```

**Monitor:**
- Error rates
- Response times
- User feedback

### Week 2: Gradual Increase (50% traffic)
```typescript
const isEnabled = Math.random() < 0.5;
```

**Monitor:**
- System stability
- Database load
- Edge Function performance

### Week 3: Full Rollout (100% traffic)
```typescript
USE_EDGE_MERCHANTS: true  // All users
```

**Monitor:**
- Overall system health
- User satisfaction
- Performance metrics

### Week 4: Optimization
- Analyze metrics
- Fix bottlenecks
- Optimize slow queries
- Remove old API code

---

## Maintenance Schedule

### Daily
- [ ] Check error logs
- [ ] Monitor uptime
- [ ] Review user reports

### Weekly
- [ ] Review performance metrics
- [ ] Check database health
- [ ] Update dependencies (if needed)
- [ ] Backup verification

### Monthly
- [ ] Security audit
- [ ] Cost optimization review
- [ ] Feature usage analysis
- [ ] User feedback review

---

## Emergency Contacts

**Supabase Support:**
- Dashboard: https://app.supabase.com
- Documentation: https://supabase.com/docs
- Community: https://github.com/supabase/supabase/discussions

**Team Contacts:**
- Technical Lead: [Contact Info]
- DevOps: [Contact Info]
- On-Call: [Contact Info]

---

## Success Criteria

Deployment is successful when:
- ✅ All health checks pass
- ✅ Error rate < 1%
- ✅ Response time < 1s (p95)
- ✅ Uptime > 99.9%
- ✅ Zero data loss
- ✅ User satisfaction maintained

---

## Next Steps After Deployment

1. **Monitor for 48 hours** - Watch all metrics closely
2. **Gather feedback** - Survey users, check reviews
3. **Optimize** - Fix any issues, improve performance
4. **Document** - Update runbooks, create incident reports
5. **Celebrate** - You've successfully deployed! 🎉

---

## Quick Reference Commands

```bash
# Health check
node test-system-health.js

# API integration test
node test-api-integration.js

# Build production
npm run build

# Run locally
npm run dev

# Type check
npm run typecheck

# Lint code
npm run lint
```

---

**Last Updated:** 2025-10-21
**Status:** Ready for Production ✅
