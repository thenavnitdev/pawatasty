/*
  # Fix Security Issues - Part 4: RLS Configuration

  1. OTP Codes Table
    - Add service role policy for OTP codes table

  2. Session Table
    - Enable RLS on session table if it exists
    - Add service role policy

  3. Extensions
    - Move extensions from public schema to extensions schema
*/

-- ============================================================================
-- OTP_CODES TABLE - ADD SERVICE ROLE POLICY
-- ============================================================================

DO $$
BEGIN
  -- Drop existing policy if it exists
  DROP POLICY IF EXISTS "Service role can manage OTP codes" ON otp_codes;
  
  -- Create new policy
  EXECUTE 'CREATE POLICY "Service role can manage OTP codes"
    ON otp_codes FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true)';
END $$;

-- ============================================================================
-- SESSION TABLE - ENABLE RLS IF EXISTS
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'session' AND table_schema = 'public'
  ) THEN
    EXECUTE 'ALTER TABLE session ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing policy if it exists
    BEGIN
      DROP POLICY IF EXISTS "Service role can manage sessions" ON session;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    
    -- Create new policy
    EXECUTE 'CREATE POLICY "Service role can manage sessions"
      ON session FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
  END IF;
END $$;

-- ============================================================================
-- MOVE EXTENSIONS TO EXTENSIONS SCHEMA
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
BEGIN
  -- Move cube extension if it exists in public schema
  IF EXISTS (
    SELECT 1 FROM pg_extension 
    WHERE extname = 'cube' 
    AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    ALTER EXTENSION cube SET SCHEMA extensions;
  END IF;
  
  -- Move earthdistance extension if it exists in public schema
  IF EXISTS (
    SELECT 1 FROM pg_extension 
    WHERE extname = 'earthdistance' 
    AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    ALTER EXTENSION earthdistance SET SCHEMA extensions;
  END IF;
END $$;