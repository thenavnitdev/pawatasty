/*
  # Add review_count Column to Merchants Table

  1. Changes
    - Add `review_count` column to `merchants` table to track total number of reviews
    - Default value is 0
    - Backfill existing data by counting reviews from reviews table

  2. Purpose
    - Track the actual number of reviews each merchant has received
    - Display accurate review counts in the UI
    - Ensure rating display is consistent with review count
*/

-- Add review_count column to merchants table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'merchants' AND column_name = 'review_count'
  ) THEN
    ALTER TABLE merchants ADD COLUMN review_count integer DEFAULT 0;
  END IF;
END $$;

-- Backfill review_count for existing merchants
UPDATE merchants m
SET review_count = (
  SELECT COUNT(*)
  FROM reviews r
  WHERE r.target_type = 'merchant' 
    AND r.target_id = m.merchant_id
);

-- If no reviews exist, ensure rating is 0
UPDATE merchants
SET rating = 0
WHERE review_count = 0 AND rating > 0;