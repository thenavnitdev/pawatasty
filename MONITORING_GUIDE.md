# Monitoring & Observability Guide

Complete guide for monitoring your application in production.

---

## Overview

This guide covers:
- System health monitoring
- Performance tracking
- Error detection and alerting
- Business metrics
- Incident response

---

## 1. Supabase Dashboard Monitoring

### Access Your Dashboard
```
https://app.supabase.com/project/{your-project-id}
```

### Key Areas to Monitor

#### A. Database Health
**Location:** Database → Performance

**Metrics to watch:**
- Active connections (should be < 20)
- Query execution time (p95 < 100ms)
- Cache hit ratio (should be > 90%)
- Disk usage (should be < 80%)

**Red flags:**
- ⚠️ Connection pool exhausted
- ⚠️ Slow queries (> 1s)
- ⚠️ Disk space > 80%
- ⚠️ High error rate

#### B. Edge Functions Logs
**Location:** Edge Functions → Logs

**What to look for:**
- HTTP status codes distribution
- Error messages
- Response times
- Invocation count

**Common issues:**
```
401 Unauthorized - Auth token missing/invalid
500 Internal Server Error - Function crashed
504 Gateway Timeout - Function took > 10s
```

#### C. Authentication
**Location:** Authentication → Users

**Metrics:**
- Daily active users
- New sign-ups
- Failed login attempts
- Session duration

**Red flags:**
- ⚠️ Spike in failed logins (possible attack)
- ⚠️ Drop in daily active users
- ⚠️ Unusual sign-up patterns

#### D. Storage
**Location:** Storage → Settings

**Metrics:**
- Storage used
- Bandwidth consumed
- Request count

---

## 2. System Health Monitoring

### Automated Health Checks

Run health check script:
```bash
node test-system-health.js
```

**Schedule:** Every 5 minutes via cron or CI/CD

**Expected output:**
```
✅ Database Connection: Connected
✅ Edge Function: Merchants
✅ Edge Function: Stations
... (all systems operational)

Success Rate: 100%
```

### Set Up Alerts

**Using cron (Linux/Mac):**
```bash
# Add to crontab
*/5 * * * * cd /path/to/project && node test-system-health.js || curl -X POST https://your-alerting-service.com/alert
```

**Using GitHub Actions:**
```yaml
name: Health Check
on:
  schedule:
    - cron: '*/5 * * * *'
jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: node test-system-health.js
```

---

## 3. Performance Monitoring

### Frontend Performance

#### Core Web Vitals
Monitor using Google Lighthouse or Web Vitals:

**Target Metrics:**
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

**Tools:**
- Chrome DevTools → Lighthouse
- PageSpeed Insights
- Web Vitals extension

#### Bundle Size Monitoring
```bash
npm run build
```

**Targets:**
- Main bundle: < 600 KB
- CSS: < 50 KB
- Gzip compression enabled

### Backend Performance

#### Edge Function Response Times
**Location:** Supabase Dashboard → Edge Functions

**Target Metrics:**
- p50: < 200ms
- p95: < 500ms
- p99: < 1000ms

**Monitor these endpoints:**
```
/merchants         - Should be fast (< 300ms)
/stations          - Should be fast (< 300ms)
/reviews           - Can be slower (< 1s)
/orders-management - Can be slower (< 1s)
```

#### Database Query Performance
**Location:** Supabase Dashboard → Database → Query Performance

**Optimization checklist:**
- [ ] Add indexes on frequently queried columns
- [ ] Use `select` to limit returned columns
- [ ] Implement pagination for large datasets
- [ ] Cache frequently accessed data

**Slow query example:**
```sql
-- Add index to improve performance
CREATE INDEX idx_merchants_category
ON merchants(business_category);

CREATE INDEX idx_reviews_merchant
ON reviews(merchant_id);
```

---

## 4. Error Tracking

### Edge Function Errors

#### View Logs
**Location:** Supabase Dashboard → Edge Functions → Select Function → Logs

**Filter by:**
- Error status codes (4xx, 5xx)
- Specific function
- Time range

**Common errors to watch:**

```javascript
// Authentication errors
"Missing authorization header" - User not logged in
"Invalid JWT" - Token expired or corrupted

// Database errors
"column does not exist" - Schema mismatch
"permission denied" - RLS policy issue

// Validation errors
"Missing required field" - Input validation failed
```

### Frontend Errors

#### Browser Console Monitoring
Add error tracking to your app:

```typescript
// src/main.tsx
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Send to error tracking service
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Send to error tracking service
});
```

#### Optional: Sentry Integration
```bash
npm install @sentry/react
```

```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: "production",
  tracesSampleRate: 0.1,
});
```

---

## 5. Business Metrics

### Key Performance Indicators (KPIs)

#### User Engagement
Track in Supabase Dashboard or custom analytics:

```sql
-- Daily active users
SELECT COUNT(DISTINCT user_id) as dau
FROM activity_log
WHERE DATE(created_at) = CURRENT_DATE;

-- New sign-ups today
SELECT COUNT(*) as new_users
FROM users
WHERE DATE(created_at) = CURRENT_DATE;

-- User retention (7-day)
SELECT
  COUNT(DISTINCT CASE WHEN last_active > NOW() - INTERVAL '7 days' THEN user_id END) as active,
  COUNT(*) as total,
  (COUNT(DISTINCT CASE WHEN last_active > NOW() - INTERVAL '7 days' THEN user_id END)::float / COUNT(*) * 100) as retention_rate
FROM users;
```

#### Booking Metrics
```sql
-- Bookings today
SELECT COUNT(*) as bookings_today
FROM orders
WHERE DATE(created_at) = CURRENT_DATE;

-- Average booking value
SELECT AVG(total_cost) as avg_booking_value
FROM orders
WHERE status = 'completed';

-- Popular merchants
SELECT m.company_name, COUNT(o.id) as booking_count
FROM merchants m
JOIN orders o ON m.id = o.merchant_id
WHERE o.created_at > NOW() - INTERVAL '30 days'
GROUP BY m.id, m.company_name
ORDER BY booking_count DESC
LIMIT 10;
```

#### Review Metrics
```sql
-- Average rating
SELECT AVG(rating) as avg_rating
FROM reviews;

-- Reviews by merchant
SELECT
  m.company_name,
  COUNT(r.id) as review_count,
  AVG(r.rating) as avg_rating
FROM merchants m
LEFT JOIN reviews r ON m.id = r.merchant_id
GROUP BY m.id, m.company_name
ORDER BY review_count DESC;
```

#### Revenue Metrics
```sql
-- Monthly revenue
SELECT
  DATE_TRUNC('month', created_at) as month,
  SUM(total_cost) as revenue
FROM orders
WHERE status = 'completed'
GROUP BY month
ORDER BY month DESC;

-- Subscription revenue
SELECT
  sp.name as plan_name,
  COUNT(us.id) as subscribers,
  SUM(sp.price::numeric) as mrr
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.status = 'active'
GROUP BY sp.id, sp.name;
```

---

## 6. Alerting Strategy

### Critical Alerts (Immediate Response)

**Trigger:** Send alert immediately
**Channel:** SMS, Phone call, Slack

- Database down
- Edge Functions failing (> 50% error rate)
- Authentication broken
- Payment processing failing

### Warning Alerts (Review within 1 hour)

**Trigger:** Send alert
**Channel:** Email, Slack

- High error rate (> 5%)
- Slow response times (p95 > 2s)
- High database load (> 80%)
- Low disk space (> 80%)

### Info Alerts (Review daily)

**Trigger:** Daily digest
**Channel:** Email

- New feature usage stats
- Daily metrics summary
- Performance trends
- User feedback

---

## 7. Dashboard Setup

### Custom Monitoring Dashboard

Create a simple monitoring dashboard:

```html
<!-- monitoring-dashboard.html -->
<!DOCTYPE html>
<html>
<head>
  <title>System Monitor</title>
  <script>
    async function checkHealth() {
      const supabaseUrl = 'YOUR_SUPABASE_URL';
      const results = [];

      // Test merchants endpoint
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/merchants`);
        results.push({
          name: 'Merchants API',
          status: res.ok ? 'OK' : 'ERROR',
          code: res.status
        });
      } catch (e) {
        results.push({ name: 'Merchants API', status: 'ERROR', code: 'N/A' });
      }

      // Display results
      document.getElementById('results').innerHTML = results
        .map(r => `<div class="${r.status.toLowerCase()}">${r.name}: ${r.status} (${r.code})</div>`)
        .join('');
    }

    // Check every 60 seconds
    setInterval(checkHealth, 60000);
    checkHealth(); // Initial check
  </script>
  <style>
    .ok { color: green; }
    .error { color: red; }
  </style>
</head>
<body>
  <h1>System Health</h1>
  <div id="results"></div>
</body>
</html>
```

---

## 8. Incident Response

### When Something Goes Wrong

#### Step 1: Assess Severity
- **Critical:** System down, data loss risk
- **High:** Major feature broken, affecting many users
- **Medium:** Minor feature broken, workaround available
- **Low:** Cosmetic issue, no functional impact

#### Step 2: Quick Diagnosis
```bash
# Check system health
node test-system-health.js

# Check recent logs
# Go to Supabase Dashboard → Edge Functions → Logs

# Check database
# Go to Supabase Dashboard → Database → Performance
```

#### Step 3: Immediate Mitigation
```typescript
// Disable problematic feature
// Edit src/services/apiConfig.ts
USE_EDGE_MERCHANTS: false  // Rollback to external API
```

#### Step 4: Fix and Deploy
```bash
# Fix the issue
# Test locally
npm run dev

# Build
npm run build

# Deploy
# Deploy dist/ folder to hosting
```

#### Step 5: Post-Mortem
Document:
- What happened
- What caused it
- How it was fixed
- How to prevent it

---

## 9. Monitoring Checklist

### Daily Checks
- [ ] Check Edge Function logs for errors
- [ ] Review database performance
- [ ] Check authentication metrics
- [ ] Review user feedback

### Weekly Checks
- [ ] Analyze performance trends
- [ ] Review business metrics
- [ ] Check system resource usage
- [ ] Update dependencies if needed

### Monthly Checks
- [ ] Security audit
- [ ] Cost optimization review
- [ ] Performance optimization
- [ ] User survey results

---

## 10. Key Metrics Summary

### System Health
| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Uptime | 99.9% | < 99% | < 95% |
| Error Rate | < 1% | > 5% | > 10% |
| Response Time (p95) | < 500ms | > 1s | > 2s |
| Database Load | < 50% | > 80% | > 95% |

### User Metrics
| Metric | Good | Needs Attention |
|--------|------|----------------|
| Daily Active Users | Growing | Declining |
| New Sign-ups | > 10/day | < 5/day |
| Session Duration | > 5 min | < 2 min |
| Bounce Rate | < 40% | > 60% |

### Business Metrics
| Metric | Target | Warning |
|--------|--------|---------|
| Bookings/day | > 50 | < 20 |
| Conversion Rate | > 5% | < 2% |
| Revenue Growth | > 10% MoM | Negative |
| Customer Satisfaction | > 4.5/5 | < 4.0/5 |

---

## Resources

- [Supabase Monitoring Docs](https://supabase.com/docs/guides/platform/metrics)
- [Edge Functions Logs](https://supabase.com/docs/guides/functions/debugging)
- [Database Performance](https://supabase.com/docs/guides/platform/performance)

---

**Last Updated:** 2025-10-21
