/*
  # Add Stripe Payment Method ID Column

  1. Changes
    - Add stripe_payment_method_id column to payment_methods table
    - This stores the Stripe Payment Method ID (pm_xxx) for secure payment processing
    - Used for PCI-compliant payment processing via Stripe

  2. Security
    - No changes to RLS policies
    - Column is optional and only used for card payments
*/

-- Add stripe_payment_method_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'payment_methods'
    AND column_name = 'stripe_payment_method_id'
  ) THEN
    ALTER TABLE payment_methods
    ADD COLUMN stripe_payment_method_id TEXT;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe_pm_id
ON payment_methods(stripe_payment_method_id)
WHERE stripe_payment_method_id IS NOT NULL;
