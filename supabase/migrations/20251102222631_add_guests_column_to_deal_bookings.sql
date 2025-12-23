/*
  # Add guests column to deal_bookings table

  1. Changes
    - Add `guests` column to `deal_bookings` table to store party size
    - Column type: integer with default value of 1
    - Column allows NULL for backwards compatibility with existing records
  
  2. Notes
    - Uses IF NOT EXISTS to prevent errors if column already exists
    - Default value ensures new bookings have at least 1 guest
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deal_bookings' AND column_name = 'guests'
  ) THEN
    ALTER TABLE deal_bookings ADD COLUMN guests integer DEFAULT 1;
  END IF;
END $$;