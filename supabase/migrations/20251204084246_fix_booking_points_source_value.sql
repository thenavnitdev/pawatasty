/*
  # Fix Booking Points Source Value

  ## Problem
  The `award_booking_completion_points()` trigger function uses source='booking_completion'
  but the points_transactions table constraint only allows: 'referral', 'purchase', 'promo', 
  'subscription', 'booking', 'welcome', 'rental'

  ## Solution
  Change the source value from 'booking_completion' to 'booking' to match the constraint

  ## Changes
  - Update award_booking_completion_points() function to use source='booking'
*/

-- Recreate function with correct source value
CREATE OR REPLACE FUNCTION public.award_booking_completion_points()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  points_to_award INTEGER := 25;
  current_points INTEGER;
  new_total_points INTEGER;
BEGIN
  -- Only award points when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get current points
    SELECT total_points INTO current_points
    FROM users
    WHERE user_id = NEW.user_id;
    
    -- Calculate new total
    new_total_points := COALESCE(current_points, 0) + points_to_award;
    
    -- Update user points
    UPDATE users
    SET total_points = new_total_points
    WHERE user_id = NEW.user_id;
    
    -- Insert transaction record with correct source value
    INSERT INTO points_transactions (
      user_id,
      amount,
      type,
      source,
      description
    ) VALUES (
      NEW.user_id,
      points_to_award,
      'earned',
      'booking',
      'Points earned for completing a booking'
    );
  END IF;
  
  RETURN NEW;
END;
$$;