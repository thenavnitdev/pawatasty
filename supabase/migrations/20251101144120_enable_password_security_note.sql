/*
  # Enable Leaked Password Protection
  
  1. Security Enhancement
    - Leaked password protection should be enabled in Supabase Dashboard
    - This checks passwords against HaveIBeenPwned.org database
    
  2. Configuration Steps (Manual - Dashboard Only)
    - Navigate to: Dashboard > Authentication > Policies
    - Enable "Leaked Password Protection"
    - This prevents users from using compromised passwords
    
  3. Note
    - This cannot be configured via SQL migrations
    - Must be enabled through the Supabase Dashboard UI
    - Consider enabling this feature for enhanced security
*/

-- This migration serves as documentation
-- The actual setting must be enabled in the Supabase Dashboard
-- under Authentication > Policies > Enable Leaked Password Protection
