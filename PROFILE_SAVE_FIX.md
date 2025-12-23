# Profile Save Error Fixes

## Issues Resolved

### 1. ❌ "Not authenticated" Error
**Symptom**: Red error box showing "Not authenticated"

**Root Cause**: Session expired or invalid, but no proper error handling

**Fix Applied**:
- Added session refresh before form submission
- Proper error handling for expired sessions
- Clear user feedback: "Session expired. Please log in again."
- Automatic sign out and redirect to login after 2 seconds

### 2. ❌ "Database update failed: duplicate key value violates unique constraint 'idx_users_email_unique_lower'"
**Symptom**: Error when trying to save profile with an email

**Root Cause**:
- The database has a unique constraint on email addresses (case-insensitive)
- The code was trying to update the email even when it hadn't changed
- No check if the email already belongs to another user

**Fix Applied**:
1. **Email Change Detection**: Only update email if it's different from existing
2. **Uniqueness Check**: Verify email isn't used by another user before updating
3. **Case-Insensitive Comparison**: Use `.toLowerCase()` for comparison
4. **User-Friendly Error**: Show "This email is already registered to another account"

## Technical Details

### Database Constraint
```sql
CREATE UNIQUE INDEX idx_users_email_unique_lower
ON public.users
USING btree (lower(email))
WHERE ((email IS NOT NULL) AND (email <> ''::text))
```

This ensures:
- Each email can only exist once in the database
- Case-insensitive uniqueness (Test@example.com = test@example.com)
- Empty strings and NULL values are allowed (for users without email)

### Code Changes

#### Before (Problematic)
```typescript
if (email.trim()) {
  userData.email = email.trim(); // ❌ Always tries to update
}
```

#### After (Fixed)
```typescript
if (email.trim()) {
  const newEmail = email.trim().toLowerCase();
  const existingEmail = existingUser?.email?.toLowerCase();

  if (newEmail !== existingEmail) {
    // Check if email is already used by another user
    const { data: emailCheck } = await supabase
      .from('users')
      .select('user_id')
      .ilike('email', newEmail)
      .neq('user_id', currentUser.id)
      .maybeSingle();

    if (emailCheck) {
      throw new Error('This email is already registered to another account');
    }

    userData.email = email.trim(); // ✅ Only update if different and unique
  }
}
```

## User Experience Flow

### Scenario 1: Session Expired
```
User fills out profile form
↓
Clicks "Save"
↓
Session refresh attempted
↓
Session is invalid
↓
User sees: "Session expired. Please log in again." ✅
↓
Auto-logout after 2 seconds
↓
Redirected to login screen
```

### Scenario 2: Email Already Exists
```
User enters email: test@example.com
↓
Clicks "Save"
↓
System checks if email belongs to another user
↓
Email found for different user_id
↓
User sees: "This email is already registered to another account" ✅
↓
User can correct the email and try again
```

### Scenario 3: Email Unchanged
```
User has email: test@example.com
↓
Form pre-fills with: test@example.com
↓
User changes name only
↓
Clicks "Save"
↓
System detects email hasn't changed
↓
Skips email update (avoids duplicate key error) ✅
↓
Only updates name fields
↓
Success!
```

### Scenario 4: Email Changed to New Unique Email
```
User has email: old@example.com
↓
Changes to: new@example.com
↓
Clicks "Save"
↓
System checks if new@example.com exists
↓
Not found for other users ✅
↓
Updates email to new@example.com
↓
Success!
```

## Benefits

1. ✅ **Better Error Messages**: Users see clear, actionable errors
2. ✅ **Prevents Data Conflicts**: No more duplicate email errors
3. ✅ **Efficient Updates**: Skips unnecessary database writes when data hasn't changed
4. ✅ **Session Management**: Handles expired sessions gracefully
5. ✅ **User Trust**: Proper validation prevents confusion and frustration

## Testing

To verify the fixes work:

1. **Test Session Expiration**:
   - Log in to the app
   - Open browser DevTools → Application → Storage
   - Clear Supabase session
   - Try to save profile
   - Should see "Session expired" message and redirect to login

2. **Test Duplicate Email**:
   - Create user A with email: test@example.com
   - Create user B and try to use: test@example.com
   - Should see "This email is already registered to another account"

3. **Test Email Unchanged**:
   - Log in as existing user
   - Leave email as-is, change name
   - Save profile
   - Should succeed without duplicate key error

4. **Test Case-Insensitive**:
   - User A has: test@example.com
   - User B tries: TEST@EXAMPLE.COM
   - Should be rejected as duplicate
