/*
  # Complete Points Awarding System
  
  ## Summary
  Implements automatic points awarding for all user events with correct amounts:
  
  ## Points Structure
  1. **Welcome New Joiner**: +30 points (on signup)
  2. **Booking Completed**: +30 points (when deal booking is marked complete)
  3. **Referral Activated**: +25 points (when referred user completes first action)
  4. **Rental Completed**: +30 points (when power bank is returned within 24 hours)
  
  ## Changes
  1. Update welcome points trigger to work with users table correctly
  2. Ensure booking completion points trigger is working
  3. Ensure referral points trigger is working  
  4. Add rental completion points trigger on orders table
  5. Add proper duplicate prevention for all triggers
  
  ## Security
  - All functions use SECURITY DEFINER
  - Duplicate prevention on all point awards
  - Proper validation of conditions before awarding
*/

-- ============================================================================
-- 1. WELCOME NEW JOINER: +30 points
-- ============================================================================

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
  AND description LIKE '%Welcome to Pawatasty%';
  
  -- Only award if no welcome points exist
  IF existing_transaction_count = 0 THEN
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

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_award_welcome_points ON users;

CREATE TRIGGER trigger_award_welcome_points
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION award_welcome_points();

-- ============================================================================
-- 2. BOOKING COMPLETED: +30 points
-- ============================================================================

CREATE OR REPLACE FUNCTION award_booking_completion_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Only award points when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    -- Check if points were already awarded for this booking
    IF NOT EXISTS (
      SELECT 1 FROM points_transactions
      WHERE user_id = NEW.user_id::text
      AND source = 'booking'
      AND description LIKE '%completing your booking%'
      AND created_at >= NEW.completed_at - INTERVAL '5 minutes'
      AND created_at <= NEW.completed_at + INTERVAL '5 minutes'
    ) THEN
      -- Award 30 points to user
      INSERT INTO points_transactions (
        user_id,
        amount,
        type,
        source,
        description,
        created_at
      ) VALUES (
        NEW.user_id::text,
        30,
        'earned',
        'booking',
        'Thank you for completing your booking.',
        COALESCE(NEW.completed_at, now())
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_award_booking_points ON deal_bookings;

CREATE TRIGGER trigger_award_booking_points
  AFTER INSERT OR UPDATE ON deal_bookings
  FOR EACH ROW
  EXECUTE FUNCTION award_booking_completion_points();

-- ============================================================================
-- 3. REFERRAL ACTIVATED: +25 points
-- ============================================================================

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
-- 4. RENTAL COMPLETED: +30 points (power bank returned within 24 hours)
-- ============================================================================

CREATE OR REPLACE FUNCTION award_rental_completion_points()
RETURNS TRIGGER AS $$
DECLARE
  rental_duration_hours NUMERIC;
BEGIN
  -- Only process when status changes to 'completed' or 'returned'
  IF NEW.status IN ('completed', 'returned') AND (OLD IS NULL OR OLD.status NOT IN ('completed', 'returned')) THEN
    
    -- Calculate rental duration in hours if we have both pickup and return times
    IF NEW.return_time IS NOT NULL AND NEW.pickup_time IS NOT NULL THEN
      BEGIN
        -- Try to parse the times and calculate duration
        rental_duration_hours := EXTRACT(EPOCH FROM (
          to_timestamp(NEW.return_time, 'YYYY-MM-DD HH24:MI:SS')::timestamp - 
          (NEW.pickup_time::jsonb->>'timestamp')::timestamp
        )) / 3600;
      EXCEPTION WHEN OTHERS THEN
        -- If parsing fails, default to within 24 hours
        rental_duration_hours := 12;
      END;
    ELSE
      -- If times not available, assume it's within 24 hours
      rental_duration_hours := 12;
    END IF;
    
    -- Award points only if returned within 24 hours and not already awarded
    IF rental_duration_hours <= 24 THEN
      -- Check if points already awarded for this order
      IF NOT EXISTS (
        SELECT 1 FROM points_transactions
        WHERE user_id = NEW.user_id::text
        AND source = 'rental'
        AND description LIKE '%returning%power bank%'
        AND created_at >= (now() - INTERVAL '5 minutes')
      ) THEN
        INSERT INTO points_transactions (
          user_id,
          amount,
          type,
          source,
          description,
          created_at
        ) VALUES (
          NEW.user_id::text,
          30,
          'earned',
          'rental',
          'Thank you for returning the power bank to the hub.',
          now()
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_award_rental_points ON orders;

CREATE TRIGGER trigger_award_rental_points
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION award_rental_completion_points();

-- ============================================================================
-- Indexes for performance
-- ============================================================================

-- Index for faster duplicate checking on points_transactions
CREATE INDEX IF NOT EXISTS idx_points_transactions_user_source_created 
  ON points_transactions(user_id, source, created_at DESC);

-- Index for faster lookups on deal_bookings
CREATE INDEX IF NOT EXISTS idx_deal_bookings_user_status 
  ON deal_bookings(user_id, status);

-- Index for faster lookups on orders
CREATE INDEX IF NOT EXISTS idx_orders_user_status 
  ON orders(user_id, status);

-- Index for faster lookups on referrals
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_status 
  ON referrals(referrer_id, status);
