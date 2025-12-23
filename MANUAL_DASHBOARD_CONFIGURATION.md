# Manual Supabase Dashboard Configuration Required

This document outlines configuration changes that **MUST** be made in the Supabase Dashboard UI. These settings cannot be configured via SQL migrations or code.

## ⚠️ Required Action: Enable Leaked Password Protection

### Security Warning
```
Leaked Password Protection Disabled: Supabase Auth prevents the use of compromised
passwords by checking against HaveIBeenPwned.org. Enable this feature to enhance security.
```

### Why This Warning Appears
- This is a **project-level security setting** in Supabase
- The security scanner checks for this setting **regardless** of which auth methods are enabled
- Even though email/password authentication is **disabled** in our app, this setting should still be enabled
- It's a best practice recommendation from Supabase

### How to Fix

**Steps to enable Leaked Password Protection:**

1. **Navigate to Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project

2. **Go to Authentication Settings**
   - Click on **"Authentication"** in the left sidebar
   - Click on **"Policies"** or **"Settings"** tab
   - Look for **"Security"** or **"Password Protection"** section

3. **Enable the Feature**
   - Find the setting: **"Leaked Password Protection"** or **"Breach Detection"**
   - **Toggle it ON** (enable it)
   - Save changes if required

4. **Verify**
   - Run your security scan again
   - The warning should now be cleared

### What This Setting Does

When enabled, Supabase Auth will:
- Check passwords against the HaveIBeenPwned.org database of compromised passwords
- Reject any password that has been found in known data breaches
- Use k-anonymity model (no actual passwords are sent to external services)
- Prompt users to choose a more secure password if needed

### Why Enable It If Email/Password Auth Is Disabled?

Even though our app uses **Phone + OTP**, **Google OAuth**, and **Facebook OAuth** (NOT email/password):

1. **Defense in Depth** - Extra security layer doesn't hurt
2. **Best Practice** - Supabase recommends enabling it for all projects
3. **Future-Proofing** - If email/password auth is ever re-enabled
4. **Clean Security Scans** - Removes the warning from security reports
5. **Zero Cost** - No performance impact since users aren't using passwords

### Current Authentication Methods

Our app uses:
- ✅ Phone + OTP (Primary)
- ✅ Google OAuth
- ✅ Facebook OAuth
- ❌ Email/Password (DISABLED)

### Notes

- This setting is **NOT** configurable via SQL or code
- It **MUST** be enabled through the Supabase Dashboard UI
- It is a **global project setting**, not a per-user setting
- Once enabled, the security warning will disappear

---

## Other Dashboard Settings to Verify

While you're in the Dashboard, verify these settings:

### Authentication → Providers

**Disabled Providers:**
- ❌ Email (should be OFF/disabled)

**Enabled Providers:**
- ✅ Phone (should be ON/enabled)
- ✅ Google (should be ON/enabled with OAuth credentials)
- ✅ Facebook (should be ON/enabled with OAuth credentials)

### Authentication → Settings

**Recommended Settings:**
- **Email Confirmation:** OFF (since email auth is disabled)
- **Phone Confirmation:** ON (verify OTP is required)
- **Leaked Password Protection:** ON (as described above)
- **Session Timeout:** Configure as needed (default is fine)

---

## Summary

**Action Required:** Go to Supabase Dashboard → Authentication → Policies/Settings → Enable "Leaked Password Protection"

**Why:** To clear the security warning and follow best practices

**Impact:** None on current functionality since we don't use email/password auth

**Time Required:** < 1 minute
