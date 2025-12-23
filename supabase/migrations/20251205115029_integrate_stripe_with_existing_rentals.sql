/*
  # Integrate Stripe with Existing Rentals Table

  1. Modifications to `rentals` table
    - Add `stripe_customer_id` - Stripe customer for charging
    - Add `stripe_payment_method_id` - Saved payment method
    - Add `validation_charge_id` - €0.50 validation Payment Intent ID
    - Add `validation_paid` - Track if validation fee was paid
    - Add `usage_charge_id` - Usage fee Payment Intent ID
    - Add `usage_amount` - Calculated usage fee
    - Add `merchant_name` - Location name (optional)
    - Add `item_id` - Powerbank or item identifier

  2. Remove Duplicate Tables
    - Drop `rental_sessions` (duplicate)
    - Drop `rental_charges` (duplicate)

  3. Keep Useful Functions
    - `calculate_rental_fee()` - Fee calculation remains

  4. Security - RLS policies already enabled on rentals table
*/

-- Add Stripe integration fields to existing rentals table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rentals' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE rentals ADD COLUMN stripe_customer_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rentals' AND column_name = 'stripe_payment_method_id'
  ) THEN
    ALTER TABLE rentals ADD COLUMN stripe_payment_method_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rentals' AND column_name = 'validation_charge_id'
  ) THEN
    ALTER TABLE rentals ADD COLUMN validation_charge_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rentals' AND column_name = 'validation_paid'
  ) THEN
    ALTER TABLE rentals ADD COLUMN validation_paid boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rentals' AND column_name = 'usage_charge_id'
  ) THEN
    ALTER TABLE rentals ADD COLUMN usage_charge_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rentals' AND column_name = 'usage_amount'
  ) THEN
    ALTER TABLE rentals ADD COLUMN usage_amount decimal(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rentals' AND column_name = 'merchant_name'
  ) THEN
    ALTER TABLE rentals ADD COLUMN merchant_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rentals' AND column_name = 'item_id'
  ) THEN
    ALTER TABLE rentals ADD COLUMN item_id text;
  END IF;
END $$;

-- Drop duplicate tables created earlier
DROP TABLE IF EXISTS rental_charges CASCADE;
DROP TABLE IF EXISTS rental_sessions CASCADE;

-- Ensure RLS is enabled (should already be)
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;

-- Add RLS policies if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rentals' AND policyname = 'Users can view own rentals'
  ) THEN
    CREATE POLICY "Users can view own rentals"
      ON rentals FOR SELECT
      TO authenticated
      USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rentals' AND policyname = 'Users can create own rentals'
  ) THEN
    CREATE POLICY "Users can create own rentals"
      ON rentals FOR INSERT
      TO authenticated
      WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rentals' AND policyname = 'Users can update own rentals'
  ) THEN
    CREATE POLICY "Users can update own rentals"
      ON rentals FOR UPDATE
      TO authenticated
      USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub')
      WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
  END IF;
END $$;