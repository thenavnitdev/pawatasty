/*
  # Update Points System to Balanced Values
  
  ## Summary
  Updates the points system to more balanced values for better user engagement:
  
  ## Points Structure (Updated)
  1. **New Joiner**: +5 points (reduced from 30)
  2. **Booking Completed**: +8 points (reduced from 30)
  3. **Referral Activated**: +10 points (reduced from 25)
  4. **Rental Completed**: +8 points (reduced from 30)
  
  ## Changes
  1. Update welcome points trigger (30 → 5 points)
  2. Update booking completion points trigger (30 → 8 points)
  3. Update referral points trigger (25 → 10 points)
  4. Update rental completion points trigger (30 → 8 points)
  5. All duplicate prevention and security remains intact
  
  ## Security
  - Maintains SECURITY DEFINER on all functions
  - Keeps duplicate prevention logic
  - Preserves all validation conditions
*/

-- ============================================================================
-- 1. NEW JOINER: +5 points (updated from 30)
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
      5,
      'earned',
      'welcome',
      'Welcome to Pawatasty!',
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. BOOKING COMPLETED: +8 points (updated from 30)
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
      -- Award 8 points to user
      INSERT INTO points_transactions (
        user_id,
        amount,
        type,
        source,
        description,
        created_at
      ) VALUES (
        NEW.user_id::text,
        8,
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

-- ============================================================================
-- 3. REFERRAL ACTIVATED: +10 points (updated from 25)
-- ============================================================================

CREATE OR REPLACE FUNCTION award_referral_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Only award points if referral is completed and not already rewarded
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') AND NEW.rewarded_at IS NULL THEN
    -- Award points to referrer (10 points)
    INSERT INTO points_transactions (
      user_id,
      amount,
      type,
      source,
      description,
      created_at
    ) VALUES (
      NEW.referrer_id,
      10,
      'earned',
      'referral',
      'A new friend joined using your referral code.',
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

-- ============================================================================
-- 4. RENTAL COMPLETED: +8 points (updated from 30)
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
          8,
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
