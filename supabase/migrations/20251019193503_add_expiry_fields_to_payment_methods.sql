/*
  # Add Expiry Fields to Payment Methods

  1. Changes
    - Add `expiry_month` column (integer) to store card expiry month (1-12)
    - Add `expiry_year` column (integer) to store card expiry year (2-digit format)
    - Both fields are nullable as they only apply to card-type payment methods

  2. Notes
    - These fields will be NULL for non-card payment methods (e.g., PayPal)
    - Year is stored in 2-digit format (e.g., 25 for 2025)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_methods' AND column_name = 'expiry_month'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN expiry_month integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_methods' AND column_name = 'expiry_year'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN expiry_year integer;
  END IF;
END $$;
