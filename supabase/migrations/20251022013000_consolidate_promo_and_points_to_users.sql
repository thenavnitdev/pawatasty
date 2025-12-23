/*
  # Consolidate Promo Codes and Points into Users Table

  ## Problem
  - Multiple tables creating duplicates: user_promo_codes, points_balance
  - Users getting multiple promo codes
  - Data unnecessarily split across tables
  - Need single source of truth in users table

  ## Solution
  1. Add missing columns to users table
  2. Migrate data from separate tables to users table
  3. Drop old tables to prevent duplicates
  4. Update triggers to work with users table
  5. Keep history tables (points_transactions, referrals) for audit trail

  ## Changes
  - Add to users table: total_points, available_points, pending_points, referral_count
  - Migrate existing data from user_promo_codes and points_balance
  - Drop user_promo_codes and points_balance tables
  - Keep promo_codes, points_transactions, and referrals for history/admin
  - Update all triggers and functions

  ## Security
  - RLS policies already exist on users table
  - Maintain RLS on remaining tables
*/

-- Step 1: Add points and referral columns to users table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'total_points'
  ) THEN
    ALTER TABLE users ADD COLUMN total_points integer DEFAULT 0 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'available_points'
  ) THEN
    ALTER TABLE users ADD COLUMN available_points integer DEFAULT 0 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'pending_points'
  ) THEN
    ALTER TABLE users ADD COLUMN pending_points integer DEFAULT 0 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'referral_count'
  ) THEN
    ALTER TABLE users ADD COLUMN referral_count integer DEFAULT 0 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'total_points_earned'
  ) THEN
    ALTER TABLE users ADD COLUMN total_points_earned integer DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Step 2: Migrate data from user_promo_codes if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_promo_codes') THEN
    -- Migrate promo codes and referral data to users table
    -- Use user_id as UUID if it exists in user_promo_codes
    UPDATE users u
    SET
      promo_code = COALESCE(u.promo_code, upc.promo_code),
      referral_count = GREATEST(COALESCE(u.referral_count, 0), COALESCE(upc.referral_count, 0)),
      total_points_earned = GREATEST(COALESCE(u.total_points_earned, 0), COALESCE(upc.total_points_earned, 0))
    FROM user_promo_codes upc
    WHERE u.user_id = upc.user_id;
  END IF;
END $$;

-- Step 3: Migrate data from points_balance if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'points_balance') THEN
    -- Migrate points balance to users table
    UPDATE users u
    SET
      total_points = GREATEST(COALESCE(u.total_points, 0), COALESCE(pb.total_points, 0)),
      available_points = GREATEST(COALESCE(u.available_points, 0), COALESCE(pb.available_points, 0)),
      pending_points = GREATEST(COALESCE(u.pending_points, 0), COALESCE(pb.pending_points, 0))
    FROM points_balance pb
    WHERE u.user_id = pb.user_id;
  END IF;
END $$;

-- Step 4: Ensure all users have promo codes (including any that didn't have them before)
UPDATE users
SET promo_code = upper(substring(md5(random()::text || user_id::text || clock_timestamp()::text) from 1 for 6))
WHERE promo_code IS NULL OR promo_code = '';

-- Step 5: Handle any duplicate promo codes by regenerating
DO $$
DECLARE
  dup_user RECORD;
  new_code text;
  code_exists boolean;
BEGIN
  FOR dup_user IN
    SELECT user_id, promo_code
    FROM users
    WHERE promo_code IN (
      SELECT promo_code
      FROM users
      WHERE promo_code IS NOT NULL
      GROUP BY promo_code
      HAVING COUNT(*) > 1
    )
    ORDER BY created_at DESC
  LOOP
    LOOP
      new_code := upper(substring(md5(random()::text || dup_user.user_id || clock_timestamp()::text) from 1 for 6));

      SELECT EXISTS (
        SELECT 1 FROM users WHERE promo_code = new_code
      ) INTO code_exists;

      EXIT WHEN NOT code_exists;
    END LOOP;

    UPDATE users
    SET promo_code = new_code
    WHERE user_id = dup_user.user_id;
  END LOOP;
END $$;

-- Step 6: Add constraint to ensure unique promo codes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_promo_code_unique'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_promo_code_unique UNIQUE (promo_code);
  END IF;
END $$;

-- Step 7: Add check constraints for points
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_points_non_negative'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_points_non_negative CHECK (
      total_points >= 0 AND
      available_points >= 0 AND
      pending_points >= 0
    );
  END IF;
END $$;

-- Step 8: Create or replace function to update user points from transactions
CREATE OR REPLACE FUNCTION update_user_points_from_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'earned' THEN
    UPDATE users
    SET
      total_points = total_points + NEW.amount,
      available_points = available_points + NEW.amount,
      updated_at = now()
    WHERE user_id = NEW.user_id::text;
  ELSIF NEW.type = 'spent' THEN
    UPDATE users
    SET
      available_points = available_points - NEW.amount,
      updated_at = now()
    WHERE user_id = NEW.user_id::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Drop old trigger if exists and create new one for users table
DROP TRIGGER IF EXISTS update_points_balance_trigger ON points_transactions;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_points_trigger'
  ) THEN
    CREATE TRIGGER update_user_points_trigger
      AFTER INSERT ON points_transactions
      FOR EACH ROW
      EXECUTE FUNCTION update_user_points_from_transaction();
  END IF;
END $$;

-- Step 10: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_promo_code ON users(promo_code) WHERE promo_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_points ON users(available_points) WHERE available_points > 0;
CREATE INDEX IF NOT EXISTS idx_users_referral_count ON users(referral_count) WHERE referral_count > 0;

-- Step 11: Drop the old tables to prevent duplicates (safe since data is migrated)
DROP TABLE IF EXISTS user_promo_codes CASCADE;
DROP TABLE IF EXISTS points_balance CASCADE;

-- Step 12: Drop old triggers that referenced deleted tables
DROP TRIGGER IF EXISTS create_user_promo_code_trigger ON auth.users;
DROP TRIGGER IF EXISTS create_user_points_balance_trigger ON auth.users;

-- Step 13: Drop old functions that are no longer needed
DROP FUNCTION IF EXISTS create_user_promo_code() CASCADE;
DROP FUNCTION IF EXISTS create_user_points_balance() CASCADE;
DROP FUNCTION IF EXISTS update_points_balance() CASCADE;
DROP FUNCTION IF EXISTS generate_unique_promo_code() CASCADE;
