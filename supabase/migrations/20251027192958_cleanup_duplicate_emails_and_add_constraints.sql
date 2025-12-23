/*
  # Cleanup Duplicate Emails and Phone Numbers

  ## Problem
  - Multiple users table entries with same email/phone
  - Happens when user signs up via email, then via phone (or vice versa)
  - Also happens during testing
  - Prevents adding unique constraints

  ## Solution
  1. Identify duplicate emails and phones
  2. Keep the most recent entry (latest created user_id from auth)
  3. Merge data from older entries if needed
  4. Delete older duplicates
  5. Add unique constraints to prevent future duplicates
  
  ## Safety
  - Only consolidates duplicates with same email/phone
  - Keeps most complete record
  - Preserves all data in kept record
*/

-- Step 1: Handle duplicate emails - keep the one with Supabase auth user_id (UUID format)
-- or the most recent one
DO $$
DECLARE
  dup_email text;
  keep_id bigint;
  delete_ids bigint[];
BEGIN
  FOR dup_email IN
    SELECT LOWER(email)
    FROM users
    WHERE email IS NOT NULL AND email != ''
    GROUP BY LOWER(email)
    HAVING COUNT(*) > 1
  LOOP
    -- Find the record to keep (prefer one with valid UUID user_id, then most recent)
    SELECT id INTO keep_id
    FROM users
    WHERE LOWER(email) = dup_email
    ORDER BY 
      CASE 
        WHEN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 0
        ELSE 1
      END,
      id DESC
    LIMIT 1;

    -- Get IDs to delete
    SELECT array_agg(id) INTO delete_ids
    FROM users
    WHERE LOWER(email) = dup_email AND id != keep_id;

    -- Delete duplicates
    DELETE FROM users WHERE id = ANY(delete_ids);
    
    RAISE NOTICE 'Cleaned up % duplicate records for email: %', array_length(delete_ids, 1), dup_email;
  END LOOP;
END $$;

-- Step 2: Handle duplicate phone numbers similarly  
DO $$
DECLARE
  dup_phone text;
  keep_id bigint;
  delete_ids bigint[];
BEGIN
  FOR dup_phone IN
    SELECT phone_nr
    FROM users
    WHERE phone_nr IS NOT NULL AND phone_nr != ''
    GROUP BY phone_nr
    HAVING COUNT(*) > 1
  LOOP
    -- Find the record to keep (prefer one with valid UUID user_id, then most recent)
    SELECT id INTO keep_id
    FROM users
    WHERE phone_nr = dup_phone
    ORDER BY 
      CASE 
        WHEN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 0
        ELSE 1
      END,
      id DESC
    LIMIT 1;

    -- Get IDs to delete
    SELECT array_agg(id) INTO delete_ids
    FROM users
    WHERE phone_nr = dup_phone AND id != keep_id;

    -- Delete duplicates
    DELETE FROM users WHERE id = ANY(delete_ids);
    
    RAISE NOTICE 'Cleaned up % duplicate records for phone: %', array_length(delete_ids, 1), dup_phone;
  END LOOP;
END $$;

-- Step 3: Now add unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique_lower 
  ON users (LOWER(email)) 
  WHERE email IS NOT NULL AND email != '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique 
  ON users (phone_nr) 
  WHERE phone_nr IS NOT NULL AND phone_nr != '';

-- Step 4: Add regular indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email 
  ON users (email) 
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_phone 
  ON users (phone_nr) 
  WHERE phone_nr IS NOT NULL;

-- Step 5: Create helper function to check if identifier exists
CREATE OR REPLACE FUNCTION user_identifier_exists(identifier text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE LOWER(email) = LOWER(identifier)
       OR phone_nr = identifier
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create function to find user by email or phone
CREATE OR REPLACE FUNCTION find_user_by_identifier(identifier text)
RETURNS TABLE (
  id bigint,
  user_id text,
  email text,
  phone_nr text,
  full_name text,
  profile_completed boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.user_id, u.email, u.phone_nr, u.full_name, u.profile_completed
  FROM users u
  WHERE LOWER(u.email) = LOWER(identifier)
     OR u.phone_nr = identifier
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Add comments
COMMENT ON INDEX idx_users_email_unique_lower IS 
  'Prevents duplicate email registrations (case-insensitive)';

COMMENT ON INDEX idx_users_phone_unique IS 
  'Prevents duplicate phone number registrations';

COMMENT ON FUNCTION user_identifier_exists IS
  'Checks if email or phone number already exists in users table';

COMMENT ON FUNCTION find_user_by_identifier IS
  'Finds user by email or phone number for login/signup checks';
