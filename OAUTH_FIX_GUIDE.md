# OAuth Fix Guide - Google & Facebook Login

## Quick Diagnosis

Run this in your browser console on the login page to check what's happening:

```javascript
// Try Google login and check the console
// Look for these messages:
// ✅ "Google OAuth initiated" = Working correctly
// ❌ "not enabled" or "not configured" = Provider not set up in Supabase
```

## The Issue

Facebook and Google login buttons are implemented correctly in the code, but **the OAuth providers must be configured in your Supabase dashboard** for them to work.

## Step-by-Step Fix

### Step 1: Verify Current Status

1. Open your browser console (F12)
2. Go to your app's login page
3. Click the Google or Facebook button
4. Check the console output:
   - If you see: `❌ Google OAuth error: Provider not enabled` → Continue to Step 2
   - If you see: `✅ Google OAuth initiated` → OAuth is configured, check Step 3

### Step 2: Configure OAuth Providers in Supabase

#### A. Access Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Log in to your account
3. Select your project: `dopjawhuylqipltnuydp`
4. Navigate to **Authentication** → **Providers** (left sidebar)

#### B. Configure Google OAuth

1. **In Supabase Dashboard:**
   - Click on **Google** in the providers list
   - Toggle **Enable Sign in with Google** to ON

2. **Create Google OAuth Credentials:**
   - Go to https://console.cloud.google.com
   - Create a new project or select existing one (e.g., "PawaTasty")
   - In the left menu, go to **APIs & Services** → **Credentials**
   - Click **+ CREATE CREDENTIALS** → **OAuth 2.0 Client ID**
   - If prompted, configure the OAuth consent screen first:
     - User Type: **External**
     - App name: **PawaTasty**
     - User support email: Your email
     - Developer contact: Your email
     - Click **Save and Continue** through the scopes and test users pages
   - Back to Create OAuth Client ID:
     - Application type: **Web application**
     - Name: **PawaTasty Web**
     - Authorized JavaScript origins:
       - `http://localhost:5173` (for development)
       - `https://yourdomain.com` (for production)
     - Authorized redirect URIs:
       - `https://dopjawhuylqipltnuydp.supabase.co/auth/v1/callback`
     - Click **CREATE**
   - Copy the **Client ID** and **Client Secret**

3. **Back in Supabase:**
   - Paste the **Client ID** into the "Client ID" field
   - Paste the **Client Secret** into the "Client Secret" field
   - Click **Save**

#### C. Configure Facebook OAuth

1. **In Supabase Dashboard:**
   - Click on **Facebook** in the providers list
   - Toggle **Enable Sign in with Facebook** to ON

2. **Create Facebook App:**
   - Go to https://developers.facebook.com/apps
   - Click **Create App**
   - Select app type: **Consumer**
   - Display Name: **PawaTasty**
   - App Contact Email: Your email
   - Click **Create App**
   - From the dashboard, click **Add Product**
   - Find **Facebook Login** and click **Set Up**
   - Select **Web** as the platform
   - Site URL: `http://localhost:5173` (for now)
   - Click **Save** and **Continue**
   - Go to **Facebook Login** → **Settings** (left sidebar)
   - In **Valid OAuth Redirect URIs**, add:
     - `https://dopjawhuylqipltnuydp.supabase.co/auth/v1/callback`
   - Click **Save Changes**
   - Go to **Settings** → **Basic** (left sidebar)
   - Copy the **App ID** and **App Secret** (click Show)

3. **Back in Supabase:**
   - Paste the **App ID** into the "Client ID" field
   - Paste the **App Secret** into the "Client Secret" field
   - Click **Save**

#### D. Configure Site URLs

1. In Supabase Dashboard, go to **Authentication** → **URL Configuration**

2. Set **Site URL**:
   - For development: `http://localhost:5173`
   - For production: `https://yourdomain.com`

3. Add **Redirect URLs**:
   - `http://localhost:5173/**` (for development)
   - `https://yourdomain.com/**` (for production)
   - `pawatasty://auth/callback` (for mobile app)

4. Click **Save**

### Step 3: Test the OAuth Flow

1. **Clear browser cache and localStorage:**
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   ```

2. **Reload your app**

3. **Test Google Login:**
   - Click "Sign-in with Google"
   - You should be redirected to Google
   - Select your Google account
   - Grant permissions
   - You should be redirected back to your app
   - Check console for: `✅ Successfully authenticated user:`

4. **Test Facebook Login:**
   - Click "Sign-in with Facebook"
   - You should be redirected to Facebook
   - Enter your Facebook credentials
   - Grant permissions
   - You should be redirected back to your app
   - Check console for: `✅ Successfully authenticated user:`

### Step 4: Troubleshooting

#### Error: "Provider not enabled"
- **Solution:** Go back to Step 2 and make sure you toggled the provider ON and clicked Save

#### Error: "redirect_uri_mismatch"
- **Solution:** Check that the redirect URI in Google/Facebook console exactly matches:
  - `https://dopjawhuylqipltnuydp.supabase.co/auth/v1/callback`
  - No trailing slash
  - Exact match (copy-paste to be sure)

#### Button clicks but nothing happens
- **Solution:**
  - Open browser console (F12)
  - Look for error messages
  - Check if popup was blocked by browser
  - Try disabling popup blockers

#### "Invalid client" error
- **Solution:**
  - Double-check Client ID and Client Secret are correct
  - No extra spaces when copying
  - Re-generate credentials if needed

#### Facebook app in development mode
- **Solution:**
  - Go to Facebook App Dashboard
  - Settings → Basic
  - Toggle **App Mode** to **Live**
  - Note: You'll need to complete App Review for public use

#### Google OAuth not working in production
- **Solution:**
  - Make sure your production domain is added to Authorized JavaScript origins
  - Update redirect URIs in Google Console
  - Update Site URL in Supabase to production domain

## Mobile App Considerations

For mobile apps (React Native, Capacitor, etc.):

1. **Configure Deep Linking:**
   - iOS: Configure URL Scheme in Info.plist
   - Android: Configure intent-filter in AndroidManifest.xml
   - Scheme: `pawatasty://`

2. **Add Mobile Redirect:**
   - In Supabase URL Configuration, add:
     - `pawatasty://auth/callback`

3. **Test Deep Linking:**
   ```javascript
   // In mobile app, test if deep linking works
   window.open('pawatasty://auth/callback?test=true');
   ```

## What Was Fixed in the Code

1. **Added Terms Agreement Check:** OAuth buttons now check if user agreed to terms before proceeding

2. **Better Error Messages:** Now shows specific messages like "Google sign-in is not configured yet"

3. **Enhanced Logging:** Added detailed console logs to track OAuth flow:
   - Mobile vs Web detection
   - Redirect URLs
   - OAuth initiation status

4. **Added Debug Mode:** Supabase client now has debug mode enabled for better error visibility

5. **Provider-Specific Configuration:**
   - Google: Added `access_type: 'offline'` and `prompt: 'consent'`
   - Facebook: Added proper scopes `'email public_profile'`

## Expected Console Output

When OAuth is working correctly, you should see:

```
🔑 Starting Google OAuth...
  - Mobile app: false
  - Redirect URL: http://localhost:5173
  - Current URL: http://localhost:5173/
✅ Google OAuth initiated: { provider: 'google', url: 'https://accounts.google.com/...' }

// After redirect back:
🔑 Detected OAuth callback, waiting for session...
✅ Found active Supabase session: abc123...
✅ User profile loaded from database: { full_name: '...', ... }
✅ Profile is complete, showing map
```

## Quick Reference

**Supabase Project:** `dopjawhuylqipltnuydp`
**Supabase Auth Callback:** `https://dopjawhuylqipltnuydp.supabase.co/auth/v1/callback`
**Site URL (dev):** `http://localhost:5173`
**Mobile Deep Link:** `pawatasty://auth/callback`

## Next Steps

After OAuth is working:

1. Test profile completion flow for new OAuth users
2. Test returning user flow
3. Verify user data is saved correctly in database
4. Test on mobile app
5. Set up production OAuth credentials with real domains
6. Submit Facebook app for review if needed
7. Monitor OAuth usage in provider dashboards

## Support

If you're still having issues:

1. Check browser console for specific error messages
2. Check Supabase logs: Dashboard → Authentication → Logs
3. Verify OAuth app status in Google Console / Facebook Dashboard
4. Test with a different browser or incognito mode
5. Make sure popup blockers are disabled
