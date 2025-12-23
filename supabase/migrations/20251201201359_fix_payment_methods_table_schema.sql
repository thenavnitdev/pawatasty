/*
  # Fix Payment Methods Table Schema

  1. Changes
    - Drop the existing Stripe-specific payment_methods table
    - Create new payment_methods table with proper schema for card/ideal/paypal
    - Add proper columns: type, last_four, cardholder_name, email, is_primary, card_brand, expiry_month, expiry_year
    - Add RLS policies for authenticated users

  2. Security
    - Enable RLS
    - Users can only access their own payment methods
*/

-- Drop existing payment_methods table if exists
DROP TABLE IF EXISTS payment_methods CASCADE;

-- Create new payment_methods table with correct schema
CREATE TABLE IF NOT EXISTS payment_methods (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('card', 'paypal', 'ideal')),
  last_four TEXT,
  cardholder_name TEXT,
  email TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  card_brand TEXT,
  expiry_month INTEGER,
  expiry_year INTEGER,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own payment methods"
  ON payment_methods FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own payment methods"
  ON payment_methods FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own payment methods"
  ON payment_methods FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own payment methods"
  ON payment_methods FOR DELETE
  TO authenticated
  USING (auth.uid()::text = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_primary ON payment_methods(user_id, is_primary);
