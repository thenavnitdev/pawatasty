# OAuth Session Management Fix

## Problem
When users logged in with Google or Facebook, the app would redirect to the OAuth provider, successfully authenticate, but then crash and refresh automatically upon returning to the app. The session was not being maintained, causing users to repeat the login process.

## Root Causes

1. **Session Detection Disabled**: `detectSessionInUrl: false` in Supabase configuration prevented automatic OAuth callback detection
2. **Missing PKCE Flow**: OAuth wasn't using the secure PKCE flow
3. **Improper Async Handling**: Auth state change listener used `async` callback which could cause deadlocks
4. **Race Condition**: App didn't wait for OAuth callback processing before checking session

## Changes Made

### 1. Supabase Configuration (`src/lib/supabase.ts`)
- **Enabled session detection**: `detectSessionInUrl: true`
- **Added PKCE flow**: `flowType: 'pkce'` for secure OAuth
- These changes allow Supabase to automatically detect and process OAuth callbacks

### 2. OAuth Redirect Handling (`src/components/Login.tsx`)
- Updated Google and Facebook sign-in to use proper redirect configuration
- Removed premature `setLoading(false)` to allow redirect to complete
- Added `skipBrowserRedirect: false` to ensure proper redirect flow

### 3. Auth State Listener (`src/App.tsx`)
- **Fixed deadlock**: Wrapped async operations in `(async () => {})()` block instead of using `async` callback
- Added provider logging to track OAuth sign-ins
- Improved error handling for profile completion

### 4. Session Recovery (`src/App.tsx`)
- Added OAuth callback detection in `checkUser()` function
- Checks URL hash for `access_token` or `error` parameters
- Waits 1 second for Supabase to process callback before checking session
- Prevents premature "no session" errors

## How It Works Now

1. User clicks Google/Facebook login button
2. App redirects to OAuth provider
3. User authenticates with provider
4. Provider redirects back to app with auth tokens in URL hash
5. Supabase detects tokens and creates session automatically
6. App waits for session processing
7. `onAuthStateChange` fires with `SIGNED_IN` event
8. App loads user profile and navigates to appropriate screen
9. Session persists in localStorage - no more refresh loops

## Testing

To test the fix:
1. Clear browser storage and cookies
2. Open the app and click "Sign in with Google" or "Sign in with Facebook"
3. Complete authentication with the provider
4. Verify app returns to correct screen without crashing
5. Refresh the page - session should persist
6. Close and reopen the app - should stay logged in

## Notes

- OAuth providers (Google, Facebook) must be configured in Supabase Dashboard
- Redirect URLs must be whitelisted in OAuth provider settings
- Session tokens are stored in localStorage with key `supabase.auth.token`
- PKCE flow provides additional security for public clients
