# OAuth Setup Guide

All three login methods (Google, Facebook, and Phone) are now active in your app. To make Google and Facebook login work, you need to configure OAuth providers in your Supabase dashboard.

## Current Status

- **Phone Login**: Already configured and working
- **Google Login**: Needs OAuth configuration in Supabase
- **Facebook Login**: Needs OAuth configuration in Supabase

## How to Configure OAuth Providers

### Step 1: Access Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Log in and select your project: `dopjawhuylqipltnuydp`
3. Navigate to **Authentication** > **Providers**

### Step 2: Configure Google OAuth

1. Click on **Google** in the providers list
2. Toggle **Enable Sign in with Google** to ON
3. You'll need to create a Google OAuth app:
   - Go to https://console.cloud.google.com
   - Create a new project or select an existing one
   - Enable Google+ API
   - Go to **Credentials** > **Create Credentials** > **OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Add authorized redirect URIs:
     - `https://dopjawhuylqipltnuydp.supabase.co/auth/v1/callback`
   - Copy the **Client ID** and **Client Secret**
4. Back in Supabase, paste:
   - Client ID
   - Client Secret
5. Click **Save**

### Step 3: Configure Facebook OAuth

1. Click on **Facebook** in the providers list
2. Toggle **Enable Sign in with Facebook** to ON
3. You'll need to create a Facebook app:
   - Go to https://developers.facebook.com/apps
   - Click **Create App**
   - Choose app type: **Consumer**
   - Add **Facebook Login** product
   - In Facebook Login settings, add OAuth Redirect URIs:
     - `https://dopjawhuylqipltnuydp.supabase.co/auth/v1/callback`
   - Copy the **App ID** and **App Secret** from Settings > Basic
4. Back in Supabase, paste:
   - Client ID (Facebook App ID)
   - Client Secret (Facebook App Secret)
5. Click **Save**

### Step 4: Configure Redirect URLs (Important!)

In Supabase Dashboard under **Authentication** > **URL Configuration**:

1. Add your site URL:
   - For development: `http://localhost:5173`
   - For production: Your deployed domain

2. Add redirect URLs:
   - For web: Your site URL (e.g., `https://yourdomain.com`)
   - For mobile: `pawatasty://auth/callback`

## Testing

After configuration:

1. **Web Browser**:
   - Click Google or Facebook button
   - Complete OAuth flow
   - Should redirect back to your app and log you in

2. **Mobile App**:
   - Click Google or Facebook button
   - Complete OAuth flow in browser
   - Should deep link back to app with `pawatasty://auth/callback`

## Troubleshooting

### "Provider not enabled" error
- Make sure the provider is toggled ON in Supabase Dashboard
- Save the configuration after enabling

### Redirect URI mismatch
- Double-check that redirect URIs match exactly in both provider console and Supabase
- No trailing slashes
- HTTPS for production

### Mobile deep linking not working
- Ensure your mobile app is configured to handle `pawatasty://` scheme
- Test deep linking separately before OAuth

### Provider returns error
- Check that OAuth app is in production mode (not test/development)
- Verify all required scopes are granted
- Check OAuth app status page for any restrictions

## Security Notes

- Keep Client Secrets secure and never commit them to version control
- Use environment variables for any OAuth credentials in your backend
- Regularly rotate OAuth secrets
- Monitor OAuth app usage in provider consoles
- Set up proper scopes - only request what you need

## Current Implementation

Your app already has:
- OAuth sign-in buttons in the Login component
- OAuth callback handling in App.tsx
- Session management for OAuth users
- Profile completion flow for new OAuth users
- Support for both web and mobile deep link OAuth flows
