/*
  # Add Stripe Customer ID to User Profiles

  1. Changes
    - Add `stripe_customer_id` column to `user_profiles` table
      - text type with default empty string
      - stores the Stripe customer ID for payment processing
      - optional field that can be populated when user makes their first payment

  2. Notes
    - This field is used to link user profiles with Stripe customer records
    - Allows the application to manage subscriptions and payment methods via Stripe
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN stripe_customer_id text DEFAULT '';
  END IF;
END $$;
