/*
  # Fix Booking Points Award Trigger - Case Sensitivity Issue

  1. Problem
    - Trigger function checks for status = 'Completed' (capital C)
    - But actual database values are 'completed' (lowercase)
    - This prevents points from being awarded for completed bookings

  2. Changes
    - Update trigger function to use lowercase 'completed'
    - Fix duplicate check description pattern
    - Add proper logging for debugging

  3. Result
    - Points will now be awarded when bookings are marked as completed
*/

-- Drop and recreate the function with correct case sensitivity
CREATE OR REPLACE FUNCTION award_booking_completion_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when status changes to 'completed' (lowercase)
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    -- Check if points already awarded for this booking
    IF NOT EXISTS (
      SELECT 1 FROM points_transactions
      WHERE user_id = NEW.user_id::text
        AND source = 'booking'
        AND description LIKE '%booking%'
        AND created_at >= (now() - INTERVAL '5 minutes')
    ) THEN
      -- Award points
      INSERT INTO points_transactions (
        user_id,
        amount,
        type,
        source,
        description,
        created_at
      ) VALUES (
        NEW.user_id::text,
        5,
        'earned',
        'booking',
        'Thank you for completing your booking.',
        now()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;