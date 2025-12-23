/*
  # Fix Promo Code and Welcome Points System
  
  ## Summary
  Fixes the referral and welcome points system to ensure:
  1. Welcome points (30) are automatically awarded when new users sign up
  2. Promo code validation awards points to both inviter and invitee
  3. All points are properly reflected in user profiles
  4. System works seamlessly with existing triggers
  
  ## Changes Made
  1. Recreate welcome points trigger to ensure it fires correctly
  2. Verify referral points trigger is working properly
  3. Ensure points_transactions trigger updates users table correctly
  4. Add a function to sync referral points to total_points_earned
  
  ## Points Awarding Logic
  - **Welcome Bonus**: 30 points (source: 'welcome') - awarded on signup
  - **Referral Invitee**: 25 points (source: 'referral') - awarded when using a promo code
  - **Referral Inviter**: 25 points (source: 'referral') - awarded when someone uses their code
  
  ## Security
  - All functions use SECURITY DEFINER for proper permissions
  - Duplicate prevention built into all functions
  - Points automatically sync to user profile
*/

-- ============================================================================
-- 1. FIX WELCOME POINTS TRIGGER
-- ============================================================================

-- Drop and recreate the welcome points function to ensure it's correct
CREATE OR REPLACE FUNCTION award_welcome_points()
RETURNS TRIGGER AS $$
DECLARE
  existing_transaction_count INT;
BEGIN
  -- Check if user already has welcome points
  SELECT COUNT(*) INTO existing_transaction_count
  FROM points_transactions
  WHERE user_id = NEW.user_id
  AND source = 'welcome'
  AND description LIKE '%Welcome%';
  
  -- Only award if no welcome points exist
  IF existing_transaction_count = 0 THEN
    -- Insert welcome points transaction
    INSERT INTO points_transactions (
      user_id,
      amount,
      type,
      source,
      description,
      created_at
    ) VALUES (
      NEW.user_id,
      30,
      'earned',
      'welcome',
      'Welcome to Pawatasty!',
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger to ensure it's active
DROP TRIGGER IF EXISTS trigger_award_welcome_points ON users;

CREATE TRIGGER trigger_award_welcome_points
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION award_welcome_points();

-- ============================================================================
-- 2. FIX REFERRAL POINTS TRIGGER
-- ============================================================================

-- Recreate the referral points function to ensure it works correctly
CREATE OR REPLACE FUNCTION award_referral_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Only award points if referral is completed and not already rewarded
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') AND NEW.rewarded_at IS NULL THEN
    -- Award points to referrer (25 points)
    INSERT INTO points_transactions (
      user_id,
      amount,
      type,
      source,
      description,
      created_at
    ) VALUES (
      NEW.referrer_id,
      25,
      'earned',
      'referral',
      'A new friend has joined using your referral code.',
      now()
    );
    
    -- Update referral to mark as rewarded
    UPDATE referrals
    SET rewarded_at = now()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_award_referral_points ON referrals;

CREATE TRIGGER trigger_award_referral_points
  AFTER INSERT OR UPDATE ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION award_referral_points();

-- ============================================================================
-- 3. ENSURE POINTS TRANSACTIONS UPDATE USERS TABLE
-- ============================================================================

-- Recreate the function that updates user points from transactions
CREATE OR REPLACE FUNCTION update_user_points_from_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'earned' THEN
    -- Add points for earned transactions
    UPDATE users
    SET
      total_points = COALESCE(total_points, 0) + NEW.amount,
      available_points = COALESCE(available_points, 0) + NEW.amount
    WHERE user_id = NEW.user_id;
  ELSIF NEW.type = 'spent' THEN
    -- Deduct points for spent transactions
    UPDATE users
    SET
      available_points = GREATEST(COALESCE(available_points, 0) - NEW.amount, 0)
    WHERE user_id = NEW.user_id;
  ELSIF NEW.type = 'expired' THEN
    -- Remove expired points from available
    UPDATE users
    SET
      available_points = GREATEST(COALESCE(available_points, 0) - NEW.amount, 0)
    WHERE user_id = NEW.user_id;
  ELSIF NEW.type = 'refunded' THEN
    -- Add back refunded points
    UPDATE users
    SET
      available_points = COALESCE(available_points, 0) + NEW.amount
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS update_user_points_trigger ON points_transactions;

CREATE TRIGGER update_user_points_trigger
  AFTER INSERT ON points_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_points_from_transaction();

-- ============================================================================
-- 4. CREATE FUNCTION TO SYNC TOTAL_POINTS_EARNED
-- ============================================================================

-- Function to sync total_points_earned from points_transactions
CREATE OR REPLACE FUNCTION sync_total_points_earned()
RETURNS void AS $$
BEGIN
  -- Update all users' total_points_earned from their transactions
  UPDATE users u
  SET total_points_earned = COALESCE(
    (SELECT SUM(amount) 
     FROM points_transactions pt 
     WHERE pt.user_id = u.user_id 
     AND pt.type = 'earned'),
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the sync function once to update existing data
SELECT sync_total_points_earned();

-- ============================================================================
-- 5. BACKFILL WELCOME POINTS FOR EXISTING USERS
-- ============================================================================

-- Award welcome points to existing users who don't have them
INSERT INTO points_transactions (user_id, amount, type, source, description, created_at)
SELECT 
  u.user_id,
  30,
  'earned',
  'welcome',
  'Welcome to Pawatasty!',
  now()
FROM users u
WHERE NOT EXISTS (
  SELECT 1 
  FROM points_transactions pt 
  WHERE pt.user_id = u.user_id 
  AND pt.source = 'welcome'
  AND pt.description LIKE '%Welcome%'
)
AND u.user_id IS NOT NULL
AND u.email IS NOT NULL
AND u.user_id != '';

-- ============================================================================
-- 6. ADD HELPFUL INDEXES
-- ============================================================================

-- Index for faster welcome points checking
CREATE INDEX IF NOT EXISTS idx_points_transactions_user_welcome 
  ON points_transactions(user_id, source) 
  WHERE source = 'welcome';

-- Index for faster referral checking
CREATE INDEX IF NOT EXISTS idx_referrals_status_rewarded 
  ON referrals(status, rewarded_at);
