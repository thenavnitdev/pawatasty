/*
  # Clean Up Old Test Tables and Create Proper Structure

  ## Analysis
  - Old test tables exist with wrong structures (bigint IDs instead of uuid)
  - These tables have only test data (2-3 rows each)
  - Need to drop and recreate with correct structure from migration
  
  ## Tables to Handle
  1. referrals - OLD (bigint), need NEW (uuid) structure
  2. points_transactions - OLD (bigint), need NEW (uuid) structure  
  3. transactions - Generic test table, not used by app - DROP
  4. user_profiles - Empty, data already in users table - DROP
  5. promo_codes - Active with real data - KEEP

  ## Actions
  1. Drop old test tables
  2. Create properly structured tables for referrals and points_transactions
  3. Keep promo_codes table (has active admin codes)

  ## Data Safety
  - Only test data in old tables (verified < 3 rows each)
  - user_profiles is empty (verified 0 rows)
  - Real user data is safely in users table
*/

-- Step 1: Drop old test tables with wrong structures
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS points_transactions CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Step 2: Create properly structured points_transactions table
CREATE TABLE IF NOT EXISTS points_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  amount integer NOT NULL,
  type text NOT NULL CHECK (type IN ('earned', 'spent', 'expired', 'refunded')),
  source text NOT NULL CHECK (source IN ('referral', 'purchase', 'promo', 'subscription', 'booking')),
  description text NOT NULL,
  order_id text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Step 3: Create properly structured referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id text NOT NULL,
  referred_user_id text,
  referred_user_email text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
  points_earned integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz,
  rewarded_at timestamptz
);

-- Step 4: Enable RLS on new tables
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Step 5: Add RLS policies for points_transactions
CREATE POLICY "Users can view own points transactions"
  ON points_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert own points transactions"
  ON points_transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

-- Step 6: Add RLS policies for referrals  
CREATE POLICY "Users can view referrals they made"
  ON referrals FOR SELECT
  TO authenticated
  USING (referrer_id = auth.uid()::text);

CREATE POLICY "Users can insert referrals"
  ON referrals FOR INSERT
  TO authenticated
  WITH CHECK (referrer_id = auth.uid()::text);

CREATE POLICY "Users can update referrals they made"
  ON referrals FOR UPDATE
  TO authenticated
  USING (referrer_id = auth.uid()::text)
  WITH CHECK (referrer_id = auth.uid()::text);

-- Step 7: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_points_transactions_user_id ON points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_created_at ON points_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON referrals(referred_user_id) WHERE referred_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- Step 8: Recreate trigger for points updates (if not exists)
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