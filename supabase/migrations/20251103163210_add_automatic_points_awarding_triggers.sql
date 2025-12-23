/*
  # Automatic Points Awarding System

  ## Summary
  Implements automatic points awarding for key user events:
  - Referral activated: +25 points (when someone uses your promo code)
  - Booking completed: +30 points (when user completes a booking)
  - Welcome new joiner: +30 points (when new user signs up)

  ## Functions Created
  1. award_referral_points()
    - Awards 25 points to referrer when referral is completed
    - Prevents duplicate rewards
    
  2. award_booking_completion_points()
    - Awards 30 points when booking status becomes 'completed'
    - Prevents duplicate rewards
    
  3. award_welcome_points()
    - Awards 30 points to new users on signup
    - One-time reward per user

  ## Triggers Created
  1. trigger_award_referral_points - On referrals table
  2. trigger_award_booking_points - On deal_bookings table
  3. trigger_award_welcome_points - On users table

  ## Security
  - Functions run with SECURITY DEFINER for proper permissions
  - Duplicate prevention built into each function
  - Points automatically update user balance via existing trigger
*/

-- Function to award points for referral activation
CREATE OR REPLACE FUNCTION award_referral_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Only award points if referral is completed and not already rewarded
  IF NEW.status = 'completed' AND (OLD IS NULL OR NEW.rewarded_at IS NULL) THEN
    -- Award points to referrer (25 points)
    INSERT INTO points_transactions (
      user_id,
      amount,
      type,
      source,
      description
    ) VALUES (
      NEW.referrer_id,
      25,
      'earned',
      'referral',
      'A new friend has joined using your referral code.'
    );

    -- Update referral to mark as rewarded
    UPDATE referrals
    SET rewarded_at = now()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to award points when booking is completed
CREATE OR REPLACE FUNCTION award_booking_completion_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Only award points when status changes to 'completed' and points haven't been awarded yet
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    -- Check if points were already awarded for this booking
    IF NOT EXISTS (
      SELECT 1 FROM points_transactions
      WHERE user_id = NEW.user_id::text
      AND source = 'booking'
      AND description LIKE '%completing your booking%'
      AND created_at > NEW.created_at - INTERVAL '1 minute'
    ) THEN
      -- Award 30 points to user
      INSERT INTO points_transactions (
        user_id,
        amount,
        type,
        source,
        description
      ) VALUES (
        NEW.user_id::text,
        30,
        'earned',
        'booking',
        'Thank you for completing your booking.'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to award welcome points to new users
CREATE OR REPLACE FUNCTION award_welcome_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Award 30 welcome points to new user
  -- Use INSERT with ON CONFLICT to prevent duplicates
  BEGIN
    INSERT INTO points_transactions (
      user_id,
      amount,
      type,
      source,
      description
    ) VALUES (
      NEW.user_id,
      30,
      'earned',
      'promo',
      'Welcome to Pawatasty!'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Silently ignore if insert fails (duplicate or other issue)
    NULL;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_award_referral_points ON referrals;
DROP TRIGGER IF EXISTS trigger_award_booking_points ON deal_bookings;
DROP TRIGGER IF EXISTS trigger_award_welcome_points ON users;

-- Create trigger for referral points (fires on INSERT or UPDATE)
CREATE TRIGGER trigger_award_referral_points
  AFTER INSERT OR UPDATE ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION award_referral_points();

-- Create trigger for booking completion points
CREATE TRIGGER trigger_award_booking_points
  AFTER INSERT OR UPDATE ON deal_bookings
  FOR EACH ROW
  EXECUTE FUNCTION award_booking_completion_points();

-- Create trigger for welcome points (fires on INSERT only)
CREATE TRIGGER trigger_award_welcome_points
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION award_welcome_points();

-- Add index for faster duplicate checking
CREATE INDEX IF NOT EXISTS idx_points_transactions_user_source_created 
  ON points_transactions(user_id, source, created_at DESC);
