/*
  # Backfill savings for existing completed bookings

  1. Purpose
    - Calculate and add savings for all bookings that were completed before the savings tracking feature was implemented
    - Updates user total_savings based on their completed bookings and the save_value from deals

  2. Process
    - For each user with completed bookings:
      - Sum up all the save_value amounts from their completed deals
      - Update the user's total_savings column

  3. Notes
    - Safe to run multiple times (uses COALESCE to handle NULL values)
    - Only processes completed bookings
    - Ignores deals with NULL or 0 save_value
*/

-- Update total_savings for all users based on their completed bookings
UPDATE users
SET total_savings = COALESCE(
  (
    SELECT SUM(md.save_value)
    FROM deal_bookings db
    JOIN merchant_deals md ON md.id = CAST(db.deal_id AS INTEGER)
    WHERE db.user_id = users.user_id
      AND db.status = 'completed'
      AND md.save_value IS NOT NULL
      AND md.save_value > 0
  ),
  0
)
WHERE EXISTS (
  SELECT 1 
  FROM deal_bookings 
  WHERE deal_bookings.user_id = users.user_id 
    AND deal_bookings.status = 'completed'
);