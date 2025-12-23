/*
  # Disable Email/Password Authentication
  
  1. Authentication Configuration
    - Email/password authentication should be disabled in Supabase Dashboard
    - Keep enabled: Phone (SMS), Google OAuth, Facebook OAuth
    
  2. Configuration Steps (Manual - Dashboard Only)
    - Navigate to: Dashboard > Authentication > Providers
    - Disable "Email" provider
    - Ensure the following are enabled:
      * Phone
      * Google
      * Facebook
    
  3. Note
    - This cannot be configured via SQL migrations
    - Must be configured through the Supabase Dashboard UI
    - Users can only sign up/login with: Phone, Google, or Facebook
*/

-- This migration serves as documentation
-- The actual authentication provider settings must be configured in the Supabase Dashboard
-- under Authentication > Providers

-- No SQL changes needed - authentication providers are managed at the project level
