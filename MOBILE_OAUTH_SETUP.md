# Mobile OAuth Setup Guide (Google & Facebook)

This guide explains how to set up Google and Facebook OAuth login for the PawaTasty mobile apps (iOS and Android).

## Overview

The app now supports OAuth login via:
- Google Sign-In
- Facebook Login

When a user taps the login button, the app opens the provider's native app (if installed) or web browser, completes authentication, and redirects back to the PawaTasty app via deep linking.

---

## 1. Configure Supabase

### Add Redirect URL

In your Supabase Dashboard:

1. Go to **Authentication** → **URL Configuration**
2. Add this redirect URL:
   ```
   pawatasty://auth/callback
   ```

### Enable OAuth Providers

#### Google OAuth

1. Go to **Authentication** → **Providers** → **Google**
2. Enable the Google provider
3. Add your Google OAuth credentials:
   - Client ID
   - Client Secret
4. Save changes

#### Facebook OAuth

1. Go to **Authentication** → **Providers** → **Facebook**
2. Enable the Facebook provider
3. Add your Facebook App credentials:
   - App ID
   - App Secret
4. Save changes

---

## 2. Configure Mobile App Deep Linking

### iOS Configuration

1. Open your Xcode project
2. Select your app target
3. Go to **Info** tab
4. Add a new URL Type:
   - **Identifier**: `com.pawatasty.app`
   - **URL Schemes**: `pawatasty`
   - **Role**: Editor

5. In your `Info.plist`, add:
   ```xml
   <key>CFBundleURLTypes</key>
   <array>
     <dict>
       <key>CFBundleURLSchemes</key>
       <array>
         <string>pawatasty</string>
       </array>
       <key>CFBundleURLName</key>
       <string>com.pawatasty.app</string>
     </dict>
   </array>
   ```

6. Handle the deep link in your AppDelegate or SceneDelegate:
   ```swift
   func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
     if url.scheme == "pawatasty" {
       // Pass the URL to your WebView or React Native bridge
       NotificationCenter.default.post(name: .handleOAuthCallback, object: url)
       return true
     }
     return false
   }
   ```

### Android Configuration

1. Open `AndroidManifest.xml`
2. Add intent filter to your main activity:
   ```xml
   <activity android:name=".MainActivity">
     <!-- Existing intent filters -->

     <!-- OAuth Deep Link Handler -->
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

3. Handle the deep link in your MainActivity:
   ```kotlin
   override fun onNewIntent(intent: Intent?) {
     super.onNewIntent(intent)
     val action = intent?.action
     val data = intent?.data

     if (action == Intent.ACTION_VIEW && data != null) {
       if (data.scheme == "pawatasty" && data.host == "auth") {
         // Pass the URL to your WebView or React Native bridge
         handleOAuthCallback(data.toString())
       }
     }
   }
   ```

---

## 3. Mobile App Implementation

### For React Native

If you're using React Native WebView:

```typescript
import { WebView } from 'react-native-webview';
import { Linking } from 'react-native';

function App() {
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    // Listen for deep links
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (url.startsWith('pawatasty://auth/callback')) {
        console.log('OAuth callback received:', url);

        // Pass the callback URL to the WebView
        webViewRef.current?.injectJavaScript(`
          window.location.href = '${url}';
        `);
      }
    });

    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url && url.startsWith('pawatasty://auth/callback')) {
        console.log('App opened via OAuth callback:', url);
        webViewRef.current?.injectJavaScript(`
          window.location.href = '${url}';
        `);
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <WebView
      ref={webViewRef}
      source={{ uri: 'https://your-app-url.com' }}
    />
  );
}
```

### For Native WebView

If you're using native WebView:

#### iOS (Swift)

```swift
import WebKit

class ViewController: UIViewController {
    var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()

        // Setup WebView
        webView = WKWebView()
        view.addSubview(webView)

        // Listen for OAuth callback notifications
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleOAuthCallback(_:)),
            name: .handleOAuthCallback,
            object: nil
        )
    }

    @objc func handleOAuthCallback(_ notification: Notification) {
        guard let url = notification.object as? URL else { return }

        // Load the callback URL in the WebView
        webView.load(URLRequest(url: url))
    }
}

extension Notification.Name {
    static let handleOAuthCallback = Notification.Name("handleOAuthCallback")
}
```

#### Android (Kotlin)

```kotlin
import android.webkit.WebView
import android.webkit.WebViewClient

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        setContentView(webView)

        webView.settings.javaScriptEnabled = true
        webView.loadUrl("https://your-app-url.com")

        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        val data = intent?.data
        if (data != null && data.scheme == "pawatasty") {
            // Load the callback URL in the WebView
            webView.loadUrl(data.toString())
        }
    }
}
```

---

## 4. How It Works

### OAuth Flow

1. **User taps Google/Facebook button** in the app
2. **App detects environment**:
   - If mobile app → uses `pawatasty://auth/callback`
   - If web browser → uses `window.location.origin`
3. **OAuth provider opens** (native app or browser)
4. **User logs in** with their credentials
5. **Provider redirects** to `pawatasty://auth/callback?code=XXXXX`
6. **Mobile OS intercepts** the deep link and opens the app
7. **App receives** the deep link with auth code
8. **App calls** `supabase.auth.exchangeCodeForSession(code)`
9. **Supabase returns** authenticated session
10. **User is logged in** and navigates to home screen

### Code Flow

The app automatically handles OAuth callbacks through:

1. **Login.tsx** - Detects mobile environment and uses correct redirect URL
2. **App.tsx** - Intercepts OAuth callback and exchanges code for session
3. **oauthHandler.ts** - Utility functions for processing OAuth callbacks

---

## 5. Testing

### Test on iOS

1. Build and run the app on iOS device/simulator
2. Tap "Sign in with Google" or "Sign in with Facebook"
3. Complete authentication in the browser/app
4. Verify app reopens and user is logged in
5. Check console logs for OAuth flow

### Test on Android

1. Build and run the app on Android device/emulator
2. Tap "Sign in with Google" or "Sign in with Facebook"
3. Complete authentication in the browser/app
4. Verify app reopens and user is logged in
5. Check Logcat for OAuth flow

### Debug Deep Links

#### iOS
```bash
xcrun simctl openurl booted "pawatasty://auth/callback?code=test123"
```

#### Android
```bash
adb shell am start -W -a android.intent.action.VIEW -d "pawatasty://auth/callback?code=test123" com.pawatasty.app
```

---

## 6. Troubleshooting

### OAuth Provider Not Opening

**Problem**: Nothing happens when tapping OAuth button

**Solution**:
- Check console logs for errors
- Verify OAuth provider is enabled in Supabase
- Check redirect URL is correct

### App Not Reopening After OAuth

**Problem**: OAuth completes but app doesn't reopen

**Solution**:
- Verify deep link configuration (URL scheme on iOS, intent filter on Android)
- Check that redirect URL matches: `pawatasty://auth/callback`
- Test deep link manually using debug commands

### Session Not Established

**Problem**: App reopens but user isn't logged in

**Solution**:
- Check console logs for "exchangeCodeForSession" errors
- Verify auth code is present in callback URL
- Check Supabase credentials are correct
- Ensure network connectivity

### Infinite Login Loop

**Problem**: User logs in but immediately returns to login screen

**Solution**:
- Check profile completion logic in App.tsx
- Verify user record exists in database
- Check `profile_completed` flag in users table

---

## 7. Security Considerations

1. **Never expose OAuth secrets** in client-side code
2. **Use HTTPS** for all API endpoints
3. **Validate sessions** on the server side
4. **Implement token refresh** for long-lived sessions
5. **Handle expired sessions** gracefully
6. **Log security events** for monitoring

---

## 8. Additional Resources

- [Supabase OAuth Documentation](https://supabase.com/docs/guides/auth/social-login)
- [iOS Universal Links Guide](https://developer.apple.com/documentation/xcode/allowing-apps-and-websites-to-link-to-your-content)
- [Android App Links Guide](https://developer.android.com/training/app-links)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login)

---

## Support

For issues or questions:
- Check console logs for detailed error messages
- Verify all configuration steps were completed
- Test OAuth flow in web browser first
- Contact support with logs and screenshots
