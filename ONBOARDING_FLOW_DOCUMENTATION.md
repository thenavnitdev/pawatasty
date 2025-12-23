# Complete Onboarding Flow Documentation

## Overview

This app implements a Supabase-powered onboarding flow using **phone number + OTP authentication** as the primary signup method, with automatic email verification during profile completion.

---

## Authentication Methods

### ✅ Enabled Methods
1. **Phone Number (SMS OTP)** - Primary method
2. **Google OAuth** - Social login
3. **Facebook OAuth** - Social login

### ❌ Disabled Methods
- Email/Password authentication (completely removed from UI and code)

---

## Complete User Journey

### 1. Initial Login Screen (`Login.tsx`)

**What Users See:**
- Google sign-in button
- Facebook sign-in button
- Divider: "Or sign in with"
- Phone number input with country code selector
- "Continue with mobile" button
- Terms & Privacy toggle

**Flow:**
1. User selects their country code (defaults to Netherlands +31)
2. User enters phone number
3. User agrees to Terms & Privacy
4. User taps "Continue with mobile"
5. System calls `supabase.auth.signInWithOtp({ phone, channel: 'sms' })`
6. Supabase sends OTP via SMS
7. User is redirected to OTP Verification screen

---

### 2. OTP Verification Screen (`OTPVerification.tsx`)

**What Users See:**
- 6-digit OTP input boxes
- Auto-focus and auto-advance between boxes
- Countdown timer (3 minutes)
- "Resend code" option when timer expires
- Automatic verification when all 6 digits are entered

**Flow:**
1. User enters 6-digit code (can paste entire code)
2. System automatically calls `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`
3. On success:
   - Supabase creates authenticated session
   - System checks if user profile exists in database
   - If new user: Creates user record with placeholder email (`[phone]@phone.pawatasty.com`)
   - Sets `profile_completed: false`
   - Redirects to Profile Completion screen

**Database Operations:**
```typescript
// Check if user exists
const existingUser = await supabase
  .from('users')
  .select('*')
  .eq('phone_nr', phoneNumber)
  .maybeSingle();

// If new user, create profile
if (!existingUser) {
  await supabase
    .from('users')
    .insert({
      user_id: data.user.id,
      phone_nr: phoneNumber,
      email: phoneNumber.replace(/[^0-9]/g, '') + '@phone.pawatasty.com',
      profile_completed: false,
    });
}
```

---

### 3. Complete Profile Screen (`ProfileCompletion.tsx`)

**What Users See (Phone Signup):**
- Welcome message: "Complete your profile"
- Avatar with their name (updates as they type)
- **Your Name** input field (required)
- **Email Address** input field (required)
- **Phone Number** (read-only, already captured)
- "Save Profile" button
- Visual feedback:
  - Spinner icon while sending verification email
  - Green checkmark when verification email sent
  - Success message: "Verification email sent - please check your inbox"

**Automatic Email Verification:**

When the user types their email address, the system automatically:

1. **Validates email format** (basic regex check)
2. **Waits 2 seconds** after user stops typing (debounced)
3. **Silently calls in background:**
   ```typescript
   await supabase.auth.updateUser({ email: emailAddress })
   ```
4. **Supabase automatically sends verification email** to the provided address
5. **Shows visual feedback** (spinner → checkmark + message)
6. **Never interrupts user** - runs completely in background

**Important Implementation Details:**

```typescript
// Debounced email verification
useEffect(() => {
  if (emailTimeoutRef.current) {
    clearTimeout(emailTimeoutRef.current);
  }

  if (signupMethod === 'phone' && email && email.length > 5) {
    // Wait 2 seconds after user stops typing
    emailTimeoutRef.current = setTimeout(() => {
      triggerEmailVerification(email);
    }, 2000);
  }

  return () => {
    if (emailTimeoutRef.current) {
      clearTimeout(emailTimeoutRef.current);
    }
  };
}, [email, signupMethod, triggerEmailVerification]);

// Automatic verification trigger
const triggerEmailVerification = async (emailAddress: string) => {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailAddress)) return;

  // Skip placeholder emails
  if (emailAddress.includes('@phone.pawatasty.com')) return;

  try {
    setIsVerifyingEmail(true);

    // This triggers Supabase to send verification email automatically
    const { data, error } = await supabase.auth.updateUser({
      email: emailAddress,
    });

    if (!error) {
      setEmailVerificationSent(true);
    }
  } catch (err) {
    // Silently fail - don't interrupt user experience
  } finally {
    setIsVerifyingEmail(false);
  }
};
```

**Form Submission:**

When user clicks "Save Profile":

1. **Validates data:**
   - Full name (must have first and last name)
   - Email (valid format required)
   - Phone already validated during OTP

2. **Saves to Supabase database:**
   ```typescript
   await supabase
     .from('users')
     .update({
       full_name: fullName.trim(),
       first_name: nameParts[0],
       last_name: nameParts.slice(1).join(' '),
       email: email.trim(),
       phone_nr: phoneNumber,
       country: detectedCountry,
       profile_completed: true, // ✅ Important!
     })
     .eq('user_id', currentUser.id);
   ```

3. **Shows success confirmation**
4. **Redirects to main app** after 1.5 seconds
5. User can start using the app immediately

---

## Database Schema

### `users` Table

Key fields for onboarding:

```sql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,  -- Supabase Auth user ID
  email TEXT,
  phone_nr TEXT,
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  country TEXT,
  profile_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Row Level Security (RLS)

Users can only access their own data:

```sql
-- Users can view own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()::text));

-- Users can update own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()::text))
  WITH CHECK (user_id = (SELECT auth.uid()::text));
```

---

## Email Verification Process

### How It Works

1. **Automatic Trigger:**
   - When user types email in Profile Completion screen
   - After 2-second debounce (waits for user to finish typing)
   - Calls `supabase.auth.updateUser({ email })`

2. **Supabase Handles Everything:**
   - Receives the email update request
   - Automatically sends verification email to the address
   - Email contains magic link for verification
   - No additional code needed - it's built into Supabase Auth

3. **User Experience:**
   - User types email: `john@example.com`
   - Sees spinner for 1-2 seconds
   - Sees green checkmark + "Verification email sent"
   - Continues filling out profile
   - Clicks "Save Profile" when ready
   - Can start using app immediately (email verification not blocking)

4. **Email Verification (Optional for User):**
   - User receives email from Supabase
   - Clicks verification link in email
   - Email is marked as verified in Supabase Auth
   - User's `email_confirmed_at` field is updated
   - This can be used later for additional features (e.g., password reset)

### Configuration Required

**In Supabase Dashboard:**
1. Navigate to: **Authentication > Email Templates**
2. Customize the "Confirm signup" template (optional)
3. Ensure **Email Confirmations** are enabled
4. Configure SMTP settings (or use Supabase's default)

---

## OAuth Signup (Google/Facebook)

**What Happens:**

1. User clicks "Sign-in with Google" or "Sign-in with Facebook"
2. System calls `supabase.auth.signInWithOAuth({ provider: 'google' })`
3. User is redirected to Google/Facebook
4. User approves permissions
5. User is redirected back to app
6. Supabase creates session with user's email and name
7. System detects OAuth signup
8. Profile Completion screen shows:
   - Name (pre-filled from OAuth)
   - Email (pre-filled from OAuth, read-only)
   - Phone Number (user needs to add)
9. User adds phone number
10. System saves profile with `profile_completed: true`
11. User can start using app

**No Email Verification Needed:**
- OAuth providers (Google/Facebook) already verify email
- Email is trusted and marked as verified by Supabase automatically

---

## Key Features

### ✅ Implemented

1. **Phone + OTP Authentication**
   - SMS-based signup
   - 6-digit OTP verification
   - Auto-advance input fields
   - Resend code functionality
   - 3-minute timer

2. **Automatic Email Verification**
   - Background processing (no button clicks)
   - 2-second debounce
   - Visual feedback (spinner → checkmark)
   - Silent failure (doesn't interrupt user)
   - Success message

3. **Smart Profile Detection**
   - Detects signup method (phone/google/facebook)
   - Shows relevant fields based on method
   - Pre-fills data when available
   - Read-only fields for verified data

4. **Database Integration**
   - Automatic user profile creation
   - Profile completion tracking
   - RLS for security
   - Supabase Auth integration

5. **Visual Feedback**
   - Loading spinners
   - Success indicators
   - Error messages
   - Real-time name display in avatar

### ❌ Removed

1. **Email/Password Authentication**
   - No email input on login screen
   - No password fields
   - No "forgot password" flow
   - Completely removed from codebase

---

## Testing the Flow

### Manual Test Steps

1. **Phone Signup:**
   ```
   1. Open app
   2. Select country code (e.g., +31)
   3. Enter phone number: 612345678
   4. Click "Continue with mobile"
   5. Check phone for OTP
   6. Enter 6-digit code
   7. Should auto-verify and redirect to Profile Completion
   8. Enter name: "John Doe"
   9. Enter email: "john@example.com"
   10. Wait 2 seconds → see spinner → see checkmark
   11. Check email for verification link
   12. Click "Save Profile"
   13. Should redirect to main app
   ```

2. **Google Signup:**
   ```
   1. Open app
   2. Click "Sign-in with Google"
   3. Authorize with Google
   4. Redirect to Profile Completion
   5. Name and email pre-filled
   6. Add phone number
   7. Click "Save Profile"
   8. Redirect to main app
   ```

3. **Returning User:**
   ```
   1. Open app
   2. Enter phone number (already registered)
   3. Click "Continue with mobile"
   4. Enter OTP
   5. Should skip Profile Completion
   6. Go directly to main app
   ```

---

## Security Considerations

### ✅ Implemented

1. **RLS Policies:**
   - Users can only access their own data
   - All auth functions use `(SELECT auth.uid())`
   - Optimized for performance

2. **Email Validation:**
   - Format validation before sending
   - Skip placeholder emails
   - Silent failure for security

3. **Phone Verification:**
   - OTP required for signup
   - SMS sent by Supabase
   - Rate limiting handled by Supabase

4. **OAuth Security:**
   - Redirect URLs validated
   - Tokens handled by Supabase
   - No credentials stored in app

### 🔒 Best Practices

1. **Never store passwords** - We don't use them
2. **Verify phone before profile** - Required step
3. **Email verification optional** - Doesn't block signup
4. **Use Supabase Auth** - Don't build custom auth
5. **Enable RLS** - Always protect user data

---

## Troubleshooting

### Issue: OTP not received

**Solution:**
- Check phone number format (include country code)
- Verify Supabase SMS provider is configured
- Check Supabase Auth logs
- Ensure phone number is not banned

### Issue: Email verification not sending

**Solution:**
- Check Supabase email configuration
- Verify SMTP settings in dashboard
- Check browser console for errors
- Ensure email format is valid

### Issue: Profile completion loops

**Solution:**
- Check `profile_completed` flag in database
- Verify user_id matches between auth and users table
- Check RLS policies allow updates
- Review console logs for errors

### Issue: OAuth redirect fails

**Solution:**
- Verify redirect URLs in Supabase dashboard
- Check OAuth provider credentials
- Ensure correct provider names
- Review browser console for errors

---

## Future Enhancements

### Potential Improvements

1. **Phone Number Verification Badge**
   - Show verified badge after OTP
   - Display in user profile

2. **Email Verification Status**
   - Show verification status in profile
   - Resend verification email option
   - Verified badge when confirmed

3. **Profile Completion Progress**
   - Progress bar (50% → 100%)
   - Checklist of required fields
   - Skip options for optional data

4. **Enhanced OAuth**
   - Add more providers (Apple, Microsoft)
   - Request additional permissions
   - Import profile photo

5. **Onboarding Tutorial**
   - First-time user guide
   - Feature highlights
   - Interactive walkthrough

---

## Technical Notes

### Dependencies

- `@supabase/supabase-js` - Auth and database
- `react` - UI framework
- `lucide-react` - Icons

### Key Files

- `/src/components/Login.tsx` - Initial login screen
- `/src/components/OTPVerification.tsx` - OTP input and verification
- `/src/components/ProfileCompletion.tsx` - Profile form with auto email verification
- `/src/lib/supabase.ts` - Supabase client configuration
- `/src/utils/phoneValidation.ts` - Phone number validation
- `/src/utils/countryUtils.ts` - Country detection

### Environment Variables

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Summary

This onboarding flow provides a modern, secure, and user-friendly authentication experience using:

1. **Phone + OTP** as primary signup method
2. **Automatic email verification** during profile completion
3. **OAuth support** for Google and Facebook
4. **Smart profile detection** based on signup method
5. **Visual feedback** for all async operations
6. **Secure database** with RLS policies
7. **No email/password** authentication

The system is fully integrated with Supabase Auth and handles all edge cases gracefully while providing excellent user experience.
