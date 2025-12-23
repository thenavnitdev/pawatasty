# Promo Content Display System Documentation

## Overview
The promo content display system shows targeted promotional content to users in the app menu based on their subscription type and scheduling rules.

## System Architecture

### Database Table: `promo_content`

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | Primary key |
| `promo_title` | text | Title for admin reference |
| `content_type` | text | 'text' or 'image' |
| `text_content` | text | Text content for text-based promos |
| `image_url` | text | URL to image for image-based promos |
| `target_flex_users` | boolean | Show to flex (pay-as-you-go) users |
| `target_subscription_users` | boolean | Show to silver/gold subscribers |
| `is_active` | boolean | Whether promo is currently enabled |
| `display_nr` | integer | Display order (lower = higher priority) |
| `scheduled_start` | timestamptz | Optional start date/time |
| `scheduled_end` | timestamptz | Optional end date/time |
| `created_by` | text | Admin user who created the promo |
| `created_at` | timestamptz | Creation timestamp |
| `updated_at` | timestamptz | Last update timestamp |

### Edge Function: `promo-content`

**Endpoint:** `{SUPABASE_URL}/functions/v1/promo-content`

**Authentication:** Required (Bearer token)

**Method:** GET

**Response:**
```json
{
  "success": true,
  "promos": [
    {
      "id": 1,
      "promo_title": "Welcome Flex Users",
      "content_type": "text",
      "text_content": "Get 50% off your first rental!",
      "image_url": null,
      "target_flex_users": true,
      "target_subscription_users": false,
      "is_active": true,
      "display_nr": 1,
      "scheduled_start": null,
      "scheduled_end": null
    }
  ],
  "userSubscriptionType": "flex"
}
```

### Frontend Component: `Menu.tsx`

The menu component displays promos in a carousel format at the top of the menu screen.

## Filtering Rules

### 1. User Type Filtering

The system automatically determines the user's subscription type:
- **Flex users:** `subscription === 'flex'`
- **Subscription users:** `subscription === 'silver'` OR `subscription === 'gold'`

Promos are filtered based on:
- Flex users see promos where `target_flex_users = true`
- Subscription users see promos where `target_subscription_users = true`
- A promo can target both groups by setting both flags to true

### 2. Active Status Filtering

Only promos with `is_active = true` are fetched from the database.

### 3. Date Range Filtering

Promos are filtered by current date/time:
- If `scheduled_start` is set: Promo only shows after this date/time
- If `scheduled_end` is set: Promo only shows before this date/time
- If neither is set: Promo is always active (when `is_active = true`)

**Example:**
```sql
-- Promo active from Dec 1-31, 2025
scheduled_start = '2025-12-01 00:00:00+00'
scheduled_end = '2025-12-31 23:59:59+00'
```

### 4. Display Order

Promos are sorted by `display_nr` in ascending order:
- `display_nr = 1` shows first
- `display_nr = 2` shows second
- etc.

## Frontend Display

### Menu Component Behavior

1. **Load on Open:** Promos are fetched when the menu opens
2. **Carousel Display:** Multiple promos are shown in a carousel with navigation
3. **Auto-rotation:** User can manually navigate between promos using the arrow button
4. **Indicators:** Dots at the bottom show total promos and current position

### Visual Presentation

- **Container:** Dark gradient background (slate-700 to slate-800)
- **Title:** White, bold text
- **Text Content:** Gray-300 text for descriptions
- **Images:** Full-width with rounded corners
- **Navigation:** Arrow button to cycle through promos
- **Indicators:** White dots for active, semi-transparent for inactive

## Testing the System

### 1. Check Database Content
```sql
SELECT
  id,
  promo_title,
  content_type,
  is_active,
  target_flex_users,
  target_subscription_users,
  display_nr,
  scheduled_start,
  scheduled_end
FROM promo_content
ORDER BY display_nr;
```

### 2. Test API Endpoint
```javascript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/promo-content`,
  {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  }
);
const result = await response.json();
console.log('Promos for user:', result);
```

### 3. Verify Frontend Display
1. Open the app and sign in
2. Open the menu (tap hamburger icon)
3. Check if promos appear at the top of the menu
4. Verify correct content based on user type
5. Test navigation between multiple promos

### 4. Test Filtering

#### Test Active Status:
```sql
-- Disable a promo
UPDATE promo_content SET is_active = false WHERE id = 1;
-- Verify it doesn't appear in app
```

#### Test User Targeting:
```sql
-- Create flex-only promo
INSERT INTO promo_content (
  promo_title, content_type, text_content,
  target_flex_users, target_subscription_users,
  is_active, display_nr
) VALUES (
  'Flex Special', 'text', 'Exclusive for flex users!',
  true, false,
  true, 99
);
-- Sign in as flex user and verify it appears
-- Sign in as subscription user and verify it doesn't appear
```

#### Test Date Scheduling:
```sql
-- Create future-scheduled promo
INSERT INTO promo_content (
  promo_title, content_type, text_content,
  target_flex_users, target_subscription_users,
  is_active, display_nr,
  scheduled_start, scheduled_end
) VALUES (
  'Future Promo', 'text', 'Coming soon!',
  true, true,
  true, 98,
  NOW() + INTERVAL '1 day',
  NOW() + INTERVAL '7 days'
);
-- Verify it doesn't appear yet
-- Wait until scheduled_start and verify it appears
```

## Common Issues & Solutions

### Issue: Promos not appearing in menu

**Possible causes:**
1. `is_active = false` - Check and update: `UPDATE promo_content SET is_active = true WHERE id = ?`
2. Wrong targeting - Verify `target_flex_users` or `target_subscription_users` matches user type
3. Outside schedule - Check `scheduled_start` and `scheduled_end` dates
4. User not authenticated - Ensure user is signed in
5. API error - Check browser console and edge function logs

### Issue: Wrong promos showing for user type

**Solution:**
```sql
-- Check user's subscription type
SELECT user_id, subscription FROM users WHERE user_id = 'xxx';

-- Check promo targeting
SELECT promo_title, target_flex_users, target_subscription_users
FROM promo_content WHERE is_active = true;
```

### Issue: Promos in wrong order

**Solution:**
```sql
-- Update display order
UPDATE promo_content SET display_nr = 1 WHERE id = ?;  -- First
UPDATE promo_content SET display_nr = 2 WHERE id = ?;  -- Second
UPDATE promo_content SET display_nr = 3 WHERE id = ?;  -- Third
```

### Issue: Expired promos still showing

**Solution:**
```sql
-- Check schedules
SELECT promo_title, scheduled_start, scheduled_end, NOW() as current_time
FROM promo_content
WHERE is_active = true;

-- Set end date for expired promos
UPDATE promo_content
SET scheduled_end = NOW() - INTERVAL '1 hour'
WHERE id = ?;
```

## Best Practices

### 1. Content Creation
- Use clear, concise titles for admin reference
- Keep text content brief and engaging
- Use high-quality images (recommended: 800x400px)
- Test content on multiple screen sizes

### 2. Targeting Strategy
- Target both groups if promo is universal
- Use flex-only promos to encourage upgrades
- Use subscription-only promos as member benefits

### 3. Scheduling
- Schedule holiday/seasonal promos in advance
- Set end dates to auto-expire time-sensitive content
- Leave both dates NULL for evergreen content

### 4. Display Order Management
- Reserve low numbers (1-10) for priority promos
- Use gaps (10, 20, 30) to allow easy insertion
- Update order as new promos are added

### 5. Maintenance
- Regularly review and deactivate outdated promos
- Monitor engagement and update content accordingly
- Keep active promo count reasonable (3-5 max)

## Security

### Row Level Security (RLS)
The `promo_content` table should have RLS enabled with policies:
- **Read:** Public access for active promos (handled by edge function)
- **Write:** Admin only (via admin panel)

### Edge Function Security
- Requires valid authentication token
- Returns only promos targeted to user's type
- Filters server-side to prevent manipulation

## Performance Considerations

### Caching
- Edge function queries are lightweight (indexed columns)
- Frontend caches promos during menu session
- Reload on menu open ensures fresh content

### Database Optimization
```sql
-- Indexes for fast filtering
CREATE INDEX idx_promo_content_active ON promo_content(is_active);
CREATE INDEX idx_promo_content_display ON promo_content(display_nr);
CREATE INDEX idx_promo_content_dates ON promo_content(scheduled_start, scheduled_end);
```

## Analytics Recommendations

Track promo effectiveness:
1. Log promo impressions (when displayed)
2. Track promo interactions (tap/click events)
3. Monitor conversion rates (bookings/signups after viewing)
4. A/B test different content types and messaging

## Future Enhancements

Potential improvements:
- Click-through URLs for promos
- Analytics integration
- Admin panel for promo management
- A/B testing framework
- Push notification integration
- User-specific targeting (based on behavior/location)
- Impression tracking and frequency capping
