/*
  # Fix merchants and deals relationship
  
  1. Schema Changes
    - Add unique constraint on merchants.merchant_id
    - Add foreign key constraint between deals.merchant_id and merchants.merchant_id
    - Add stripe_customer_id column to users table
  
  2. Purpose
    - Enable Supabase PostgREST to recognize the relationship for nested queries
    - Support Stripe payment integration with customer IDs
*/

-- Add unique constraint on merchant_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'merchants_merchant_id_key' 
    AND table_name = 'merchants'
  ) THEN
    ALTER TABLE merchants ADD CONSTRAINT merchants_merchant_id_key UNIQUE (merchant_id);
  END IF;
END $$;

-- Add foreign key constraint for deals -> merchants relationship
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'deals_merchant_id_fkey' 
    AND table_name = 'deals'
  ) THEN
    ALTER TABLE deals
    ADD CONSTRAINT deals_merchant_id_fkey
    FOREIGN KEY (merchant_id)
    REFERENCES merchants(merchant_id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Add stripe_customer_id column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE users ADD COLUMN stripe_customer_id text;
  END IF;
END $$;