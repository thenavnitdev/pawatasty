/*
  # Add total savings tracking to users table

  1. Changes
    - Add `total_savings` column to `users` table to track cumulative savings
    - Column type: numeric(10,2) to store decimal currency values
    - Default value: 0.00 for new users and existing users
  
  2. Notes
    - Uses IF NOT EXISTS to prevent errors if column already exists
    - Default value ensures all users start with 0 savings
    - Numeric type with 2 decimal places for currency precision
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'total_savings'
  ) THEN
    ALTER TABLE users ADD COLUMN total_savings numeric(10,2) DEFAULT 0.00 NOT NULL;
  END IF;
END $$;