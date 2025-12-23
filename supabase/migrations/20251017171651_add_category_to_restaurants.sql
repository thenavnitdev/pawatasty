/*
  # Add category to restaurants table

  1. Changes
    - Add `category` column to `restaurants` table
    - Set default value to 'restaurant'
    - Update existing records with sample categories

  2. Notes
    - Category types: 'restaurant', 'cafe', 'bar', 'shop'
    - All existing restaurants will default to 'restaurant'
*/

-- Add category column to restaurants table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurants' AND column_name = 'category'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN category text NOT NULL DEFAULT 'restaurant';
  END IF;
END $$;

-- Add check constraint for valid categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'restaurants' AND constraint_name = 'restaurants_category_check'
  ) THEN
    ALTER TABLE restaurants ADD CONSTRAINT restaurants_category_check 
    CHECK (category IN ('restaurant', 'cafe', 'bar', 'shop'));
  END IF;
END $$;
