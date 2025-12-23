/*
  # Enable Leaked Password Protection

  1. Security Enhancement
    - Enable HaveIBeenPwned.org password breach checking
    - Prevents users from using compromised passwords
    - This is a best practice security feature

  2. Configuration Steps (Manual - Dashboard Only)
    - Navigate to: Dashboard > Authentication > Policies
    - Find "Leaked Password Protection" setting
    - Toggle it ON to enable

  3. How It Works
    - When enabled, Supabase Auth checks passwords against HaveIBeenPwned.org database
    - If a password appears in known breaches, registration/password change is rejected
    - User is prompted to choose a different, more secure password
    - No password data is sent to external services (uses k-anonymity model)

  4. Note
    - This cannot be configured via SQL migrations
    - Must be configured through the Supabase Dashboard UI
    - Highly recommended for production environments
    - Since email/password auth is disabled, this setting is less critical
      but should still be enabled for defense-in-depth

  5. Current Auth Methods
    - Phone + OTP (Primary)
    - Google OAuth
    - Facebook OAuth
    - Email/Password (DISABLED - but still good to enable password protection)
*/

-- This migration serves as documentation
-- The actual password protection setting must be configured in the Supabase Dashboard
-- under Authentication > Policies

-- No SQL changes needed - password policies are managed at the project level
