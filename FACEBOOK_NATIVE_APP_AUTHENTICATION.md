# Facebook Native App Authentication Implementation

This document explains the intelligent Facebook login system that automatically detects the Facebook mobile app and provides a seamless authentication experience.

## Overview

The system implements a smart detection mechanism that:
1. Detects if the Facebook mobile app is installed on the user's device
2. Uses native Facebook app authentication when available (better UX, single sign-on)
3. Falls back to web-based Facebook login when the app is not installed
4. Works seamlessly across iOS and Android platforms

## Architecture

### Components

1. **facebookAppDetection.ts** - Core detection and routing logic
2. **Login.tsx** - Updated Facebook sign-in handler with detection integration
3. **oauthHandler.ts** - OAuth callback processing (existing)

### Detection Flow

```
User taps "Sign in with Facebook"
          ↓
Detect device platform (iOS/Android/Web)
          ↓
    Is mobile device?
          ↓
    ┌─────┴─────┐
   YES          NO
    ↓            ↓
Attempt       Use web
Facebook      login only
app detection
    ↓
Is app installed?
    ↓
┌───┴───┐
YES     NO
 ↓       ↓
Native  Web
App     Login
Auth
```

## Implementation Details

### 1. Facebook App Detection

The system uses platform-specific detection methods:

#### iOS Detection
- Creates a hidden iframe with `fb://` URL scheme
- Monitors if the app responds to the scheme
- Checks `document.hidden` to detect app switch
- Timeout: 2 seconds

#### Android Detection
- Creates a hidden link with `fb://page` intent
- Attempts to trigger the Facebook app
- Monitors navigation timing and visibility
- Timeout: 2 seconds

### 2. Native App Authentication

When Facebook app is detected:

#### iOS
```
Direct URL navigation → Facebook app opens →
User authenticates → Returns to app via deep link
```

#### Android
```
Intent URL with fallback → Facebook app opens →
User authenticates → Returns to app via deep link
```

Intent format:
```
intent://authenticate#Intent;
package=com.facebook.katana;
scheme=https;
S.browser_fallback_url=<encoded_auth_url>;
end
```

### 3. Web Fallback

When Facebook app is not installed:
- Opens Facebook OAuth in system browser/webview
- Standard OAuth 2.0 flow
- Redirects back to app after authentication

## User Experience

### Scenario 1: Facebook App Installed
1. User taps "Sign in with Facebook"
2. System detects Facebook app (0.5-2 seconds)
3. Facebook app opens immediately
4. User sees their logged-in Facebook account
5. One tap to authorize
6. Returns to PawaTasty app (authenticated)

**Time to authenticate: ~3-5 seconds**

### Scenario 2: Facebook App Not Installed
1. User taps "Sign in with Facebook"
2. System detects no Facebook app (2 seconds)
3. Browser opens with Facebook login page
4. User enters credentials
5. Completes 2FA if enabled
6. Returns to PawaTasty app (authenticated)

**Time to authenticate: ~15-30 seconds**

## Security Features

1. **No Credentials in App**: All authentication happens in Facebook's environment
2. **Deep Link Validation**: Only accepts callbacks from authorized sources
3. **Session Token Exchange**: Auth code exchanged for session server-side
4. **Automatic Fallback**: If native app fails, web login ensures authentication works
5. **Timeout Protection**: Detection doesn't hang indefinitely

## Platform Support

| Platform | Native App Auth | Web Fallback | Deep Link Support |
|----------|----------------|--------------|-------------------|
| iOS App | ✅ | ✅ | ✅ |
| Android App | ✅ | ✅ | ✅ |
| Mobile Web | ❌ | ✅ | ❌ |
| Desktop Web | ❌ | ✅ | ❌ |

## Configuration Requirements

### Supabase Configuration
1. Enable Facebook provider in Authentication settings
2. Add Facebook App ID and App Secret
3. Configure redirect URLs:
   - `pawatasty://auth/callback` (mobile)
   - `https://your-domain.com` (web)

### Mobile App Configuration

#### iOS (Xcode)
```xml
<!-- Info.plist -->
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>pawatasty</string>
    </array>
  </dict>
</array>

<key>LSApplicationQueriesSchemes</key>
<array>
  <string>fb</string>
  <string>fbapi</string>
  <string>fbauth2</string>
</array>
```

#### Android (AndroidManifest.xml)
```xml
<activity android:name=".MainActivity">
  <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data
      android:scheme="pawatasty"
      android:host="auth"
      android:pathPrefix="/callback" />
  </intent-filter>
</activity>
```

## Testing

### Test Facebook App Detection

```javascript
// In browser console
import { detectFacebookApp } from './utils/facebookAppDetection';

const result = await detectFacebookApp();
console.log('Facebook app installed:', result.isInstalled);
console.log('Should use native app:', result.shouldUseNativeApp);
```

### Test Native App Opening

1. Ensure Facebook app is installed
2. Tap "Sign in with Facebook"
3. Verify Facebook app opens (not browser)
4. Check console logs for detection results

### Test Web Fallback

1. Uninstall Facebook app (or use device without it)
2. Tap "Sign in with Facebook"
3. Verify browser opens with Facebook login
4. Check console logs confirm fallback used

### Test Deep Link Return

```bash
# iOS Simulator
xcrun simctl openurl booted "pawatasty://auth/callback?code=test_code_123"

# Android Emulator/Device
adb shell am start -W -a android.intent.action.VIEW \
  -d "pawatasty://auth/callback?code=test_code_123" \
  com.pawatasty.app
```

## Console Logs

The system provides detailed logging:

```
🔑 Starting Facebook OAuth...
  - Mobile app: true
  - Redirect URL: pawatasty://auth/callback
🔍 Detecting Facebook app installation...
  - Facebook app installed: true
  - Should use native app: true
✅ Facebook OAuth URL received: https://...
📱 Attempting to open Facebook native app...
✅ Successfully opened Facebook app
✅ User navigated to Facebook app
```

## Error Handling

### Detection Timeout
- If detection takes >2 seconds, assumes app not installed
- Proceeds with web fallback
- No user-visible error

### Native App Launch Failure
- If app doesn't open within 1.5 seconds
- Automatically falls back to web login
- Logs warning in console

### Web Fallback Failure
- Shows error message to user
- Suggests alternative login methods
- Logs detailed error information

## Performance

- **Detection overhead**: 0.5-2 seconds
- **Native app launch**: <1 second
- **Web fallback**: Standard OAuth timing
- **Total time (native)**: ~3-5 seconds
- **Total time (web)**: ~15-30 seconds

## Future Enhancements

1. **Cache Detection Results**: Store detection for 24 hours to skip on subsequent logins
2. **Manual Override**: Allow users to choose native vs web
3. **Facebook Lite Support**: Detect and support Facebook Lite app
4. **Analytics**: Track usage of native vs web flows
5. **Prefetch**: Start detection on page load (before button tap)

## Troubleshooting

### Facebook App Opens but Doesn't Return
- Check deep link configuration
- Verify redirect URL matches exactly
- Test deep link manually

### Always Uses Web Login
- Check platform detection
- Verify Facebook app is actually installed
- Check console logs for detection results

### Infinite Loop
- Check OAuth callback handling
- Verify session storage
- Check profile completion logic

## Support

For issues:
1. Check console logs for detailed flow
2. Verify all configuration steps completed
3. Test on actual devices (not just simulators)
4. Check Supabase Dashboard for OAuth errors
