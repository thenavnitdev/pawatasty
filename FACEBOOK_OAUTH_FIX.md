# Facebook OAuth Not Working - Step-by-Step Fix

## Quick Diagnosis

Open your app and browser console (F12), click the Facebook sign-in button, and look for these messages:

### If you see: `❌ Facebook OAuth error: not enabled` or `not configured`
**Problem:** Facebook provider is not enabled in Supabase Dashboard
**Solution:** Follow the "Enable Facebook in Supabase" section below

### If you see: `✅ Facebook OAuth initiated successfully`
**Problem:** Likely a Facebook app configuration issue
**Solution:** Follow the "Configure Facebook App" section below

### If nothing happens or popup is blocked
**Problem:** Browser popup blocker
**Solution:** Allow popups for your site and try again

## Step 1: Enable Facebook in Supabase Dashboard

1. **Go to Supabase Dashboard**
   - URL: https://supabase.com/dashboard
   - Log in with your Supabase account

2. **Select Your Project**
   - Click on project: `dopjawhuylqipltnuydp`

3. **Navigate to Authentication**
   - In the left sidebar, click **Authentication**
   - Then click **Providers**

4. **Find Facebook**
   - Scroll down to find "Facebook" in the providers list
   - You should see a toggle switch next to it

5. **Check if Facebook is Enabled**
   - If the toggle is OFF (gray), Facebook is NOT enabled
   - If the toggle is ON (green/blue), Facebook IS enabled but needs configuration

6. **Click on Facebook Provider**
   - This will open the configuration panel

## Step 2: Create Facebook App

1. **Go to Facebook Developers**
   - URL: https://developers.facebook.com/apps
   - Log in with your Facebook account

2. **Create a New App**
   - Click **Create App** button
   - Select app type: **Consumer**
   - Click **Next**

3. **Set App Details**
   - Display name: `PawaTasty` (or your app name)
   - App contact email: Your email address
   - Click **Create App**
   - Complete security check if prompted

4. **Add Facebook Login Product**
   - From the app dashboard, you'll see "Add products to your app"
   - Find **Facebook Login** in the list
   - Click **Set Up** button

5. **Select Platform**
   - Choose **Web**
   - Site URL: `http://localhost:5173` (for development)
   - Click **Save** and **Continue**
   - You can skip the rest of the quickstart

## Step 3: Configure Facebook Login Settings

1. **Go to Facebook Login Settings**
   - In the left sidebar, expand **Facebook Login**
   - Click on **Settings**

2. **Add OAuth Redirect URI**
   - Find the field: **Valid OAuth Redirect URIs**
   - Add this exact URL: `https://dopjawhuylqipltnuydp.supabase.co/auth/v1/callback`
   - Important: No trailing slash, exact match required
   - Click **Save Changes** at the bottom

3. **Get Your App Credentials**
   - In the left sidebar, click **Settings** → **Basic**
   - You'll see:
     - **App ID** (e.g., 123456789012345)
     - **App Secret** (click **Show** to reveal it)
   - Copy both of these

## Step 4: Configure Facebook in Supabase

1. **Go Back to Supabase Dashboard**
   - Authentication → Providers → Facebook

2. **Enable the Provider**
   - Toggle **Enable Sign in with Facebook** to ON

3. **Enter Facebook Credentials**
   - **Facebook Client ID**: Paste your Facebook App ID
   - **Facebook Client Secret**: Paste your Facebook App Secret

4. **Save Configuration**
   - Click **Save** button at the bottom

## Step 5: Configure Site URL in Supabase

1. **Still in Supabase Dashboard**
   - Go to **Authentication** → **URL Configuration**

2. **Set Site URL**
   - For development: `http://localhost:5173`
   - For production: `https://yourdomain.com`

3. **Add Redirect URLs**
   - Click **Add Redirect URL**
   - Add: `http://localhost:5173/**` (for development)
   - Add: `https://yourdomain.com/**` (for production, when ready)
   - Add: `pawatasty://auth/callback` (for mobile app)

4. **Save Changes**

## Step 6: Test Facebook Login

1. **Clear Your Browser**
   ```javascript
   // Open browser console (F12) and run:
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

2. **Open Your App**
   - Go to: `http://localhost:5173`
   - You should see the login page

3. **Click Facebook Sign-in Button**
   - Watch the browser console for logs
   - You should see: `🔑 Starting Facebook OAuth...`
   - Then: `✅ Facebook OAuth initiated successfully:`

4. **Complete Facebook Login**
   - You'll be redirected to Facebook
   - Log in with your Facebook account
   - Grant permissions when asked
   - You should be redirected back to your app

5. **Check for Success**
   - Console should show: `✅ User authenticated:`
   - You should be logged into your app

## Troubleshooting Common Issues

### Issue: "App Not Set Up: This app is still in development mode"

**Problem:** Facebook app is in development mode

**Solution:**
1. Go to Facebook App Dashboard
2. Settings → Basic
3. Look for **App Mode** at the top
4. If it says "Development", your app only works for you (the developer) and test users
5. To make it public:
   - Complete App Review process
   - Or add specific Facebook users as test users:
     - Go to **Roles** → **Test Users**
     - Add users who need to test

### Issue: "URL Blocked: This redirect failed because the redirect URI is not whitelisted"

**Problem:** Redirect URI mismatch

**Solution:**
1. Check Facebook Login Settings → Valid OAuth Redirect URIs
2. Make sure it contains exactly: `https://dopjawhuylqipltnuydp.supabase.co/auth/v1/callback`
3. No extra spaces, no trailing slash
4. Save changes and try again

### Issue: "Given URL is not allowed by the Application configuration"

**Problem:** Your site URL is not added to Facebook app domains

**Solution:**
1. Go to Facebook App Dashboard
2. Settings → Basic
3. Scroll to **App Domains**
4. Add your domain: `localhost` (for development)
5. Save changes

### Issue: Console shows "not enabled" or "not configured"

**Problem:** Facebook provider is not enabled in Supabase

**Solution:**
1. Go to Supabase Dashboard → Authentication → Providers
2. Click on Facebook
3. Make sure the toggle is ON (enabled)
4. Make sure you've entered App ID and App Secret
5. Click Save

### Issue: "Invalid OAuth access token"

**Problem:** Facebook App Secret might be incorrect

**Solution:**
1. Go to Facebook App Dashboard → Settings → Basic
2. Click **Show** next to App Secret
3. Copy it again (carefully, no extra spaces)
4. Paste it again in Supabase Dashboard
5. Save and try again

### Issue: Login works but user data is missing

**Problem:** Missing permissions/scopes

**Solution:**
1. The app requests: `email,public_profile`
2. Make sure you grant these permissions during Facebook login
3. If you denied them, you need to:
   - Go to Facebook Settings → Apps and Websites
   - Remove the app
   - Try logging in again and grant permissions

### Issue: Works on localhost but not in production

**Problem:** Production domain not configured

**Solution:**
1. Update Facebook app settings:
   - Valid OAuth Redirect URIs: Keep the Supabase callback URL (it doesn't change)
   - App Domains: Add your production domain
   - Site URL: Update to your production URL
2. Update Supabase URL Configuration:
   - Site URL: Change to production domain
   - Redirect URLs: Add production domain

## Using the Test Tool

I've created a diagnostic tool for you at `test-facebook-oauth.html`

1. **Open the file in your browser:**
   - File path: `project/test-facebook-oauth.html`
   - Double-click or open with browser

2. **Click "Test Facebook OAuth"**
   - This will show you exactly what error is happening
   - It provides detailed diagnostics

3. **Read the console logs**
   - Red = Error (shows what's wrong)
   - Green = Success (shows what's working)
   - Blue = Info (shows what's happening)

## Verification Checklist

Use this checklist to ensure everything is configured correctly:

### Supabase Dashboard
- [ ] Facebook provider is toggled ON
- [ ] Facebook Client ID is entered (matches Facebook App ID)
- [ ] Facebook Client Secret is entered (matches Facebook App Secret)
- [ ] Configuration is saved
- [ ] Site URL is set to `http://localhost:5173` (or your URL)
- [ ] Redirect URLs include your domain

### Facebook App Dashboard
- [ ] App is created and active
- [ ] Facebook Login product is added
- [ ] Valid OAuth Redirect URIs contains: `https://dopjawhuylqipltnuydp.supabase.co/auth/v1/callback`
- [ ] App ID is copied correctly
- [ ] App Secret is copied correctly (click Show, then copy)
- [ ] App is in Development mode (for testing) or Live mode (for production)

### Browser
- [ ] Popup blocker is disabled for your site
- [ ] localStorage is cleared before testing
- [ ] Console is open (F12) to see logs
- [ ] Using http://localhost:5173 (not 127.0.0.1 or another port)

### Code
- [ ] Latest changes are deployed (`npm run build`)
- [ ] Browser is refreshed after code changes
- [ ] No JavaScript errors in console

## What Should Happen (Success Flow)

1. User clicks "Sign-in with Facebook" button
2. Console shows: `🔑 Starting Facebook OAuth...`
3. Console shows: `✅ Facebook OAuth initiated successfully:`
4. Browser redirects to Facebook login page
5. User logs in and grants permissions
6. Facebook redirects back to your app with a code
7. Console shows: `🔔 Auth state changed: SIGNED_IN`
8. Console shows: `✅ User authenticated: [email/id]`
9. App shows profile completion or main app screen
10. User is successfully logged in

## Still Not Working?

If you've followed all steps and it's still not working:

1. **Check the exact error message**
   - Open browser console (F12)
   - Click Facebook sign-in button
   - Copy the complete error message

2. **Verify Facebook App Status**
   - Go to Facebook App Dashboard
   - Check for any warnings or errors at the top
   - Check if app is restricted or suspended

3. **Check Supabase Logs**
   - Supabase Dashboard → Authentication → Logs
   - Look for Facebook OAuth attempts
   - Check for error messages

4. **Try These Debug Steps**
   ```javascript
   // In browser console:

   // 1. Clear everything
   localStorage.clear();
   sessionStorage.clear();

   // 2. Test Supabase connection
   console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);

   // 3. Try manual OAuth
   const { data, error } = await supabase.auth.signInWithOAuth({
     provider: 'facebook',
     options: { redirectTo: window.location.origin }
   });
   console.log('OAuth Result:', { data, error });
   ```

5. **Common Mistakes**
   - App Secret has extra spaces when copied
   - Using wrong App ID/Secret (from a different app)
   - Redirect URI has trailing slash or wrong URL
   - Facebook app is suspended or restricted
   - Browser extensions blocking OAuth

## Production Deployment

When deploying to production:

1. **Update Facebook App**
   - Remove localhost from App Domains
   - Add production domain to App Domains
   - Keep the same OAuth Redirect URI (Supabase URL doesn't change)

2. **Update Supabase**
   - Change Site URL to production domain
   - Add production redirect URLs

3. **Facebook App Review (if needed)**
   - If your app will be used by public users (not just you)
   - Submit for Facebook App Review
   - Request permissions: `email`, `public_profile`
   - Provide demo video and test credentials

4. **Test in Production**
   - Test with a real Facebook account
   - Test the complete flow
   - Monitor Supabase logs for any issues

## Quick Reference

**Your Supabase Project:** `dopjawhuylqipltnuydp`
**OAuth Callback URL:** `https://dopjawhuylqipltnuydp.supabase.co/auth/v1/callback`
**Development Site URL:** `http://localhost:5173`
**Required Scopes:** `email,public_profile`

## Summary

The most common reason Facebook OAuth doesn't work is simply that it's not enabled in Supabase Dashboard. Make sure to:

1. ✅ Enable Facebook provider in Supabase
2. ✅ Create Facebook app and get App ID + Secret
3. ✅ Configure OAuth redirect URI in Facebook app
4. ✅ Add App ID and Secret to Supabase
5. ✅ Save all changes
6. ✅ Clear browser cache and test

If you follow these steps exactly, Facebook login will work!
