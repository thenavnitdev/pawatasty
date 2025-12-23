/*
  # Fix Payment Methods Stripe Tracking System V2

  ## Overview
  This migration enhances payment_methods table to properly track Stripe Payment Method IDs
  and their setup status for all payment types (card, iDEAL, SEPA, Bancontact, etc.)

  ## Changes

  1. New Columns Added
    - `stripe_setup_intent_id` - Tracks pending setup intents for redirect-based methods
    - `payment_method_status` - Tracks completion state (pending, active, failed, inactive)
    - `setup_completed_at` - Timestamp when Stripe PM was successfully created
    - `supports_subscriptions` - Boolean flag for subscription support
    - `supports_off_session` - Boolean flag for off-session payment support
    - `supports_one_time` - Boolean flag for one-time payment support

  2. Indexes
    - Index on stripe_payment_method_id for faster lookups
    - Index on stripe_setup_intent_id for webhook processing
    - Index on payment_method_status for filtering active methods

  3. Constraints
    - Active payment methods must have stripe_payment_method_id
    - Status must be valid enum value

  4. Data Migration
    - Payment methods without stripe_payment_method_id marked as 'inactive'
    - These will need to be re-added through proper Stripe flow
    - Existing methods with stripe_payment_method_id marked as 'active'

  ## Security
    - No RLS policy changes
    - All new columns follow existing RLS policies
*/

-- Add stripe_setup_intent_id column for tracking pending setup intents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_methods' AND column_name = 'stripe_setup_intent_id'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN stripe_setup_intent_id TEXT;
  END IF;
END $$;

-- Add payment_method_status to track completion state
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_methods' AND column_name = 'payment_method_status'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN payment_method_status TEXT DEFAULT 'inactive';
  END IF;
END $$;

-- Add setup_completed_at timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_methods' AND column_name = 'setup_completed_at'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN setup_completed_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add capability flags
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_methods' AND column_name = 'supports_subscriptions'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN supports_subscriptions BOOLEAN DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_methods' AND column_name = 'supports_off_session'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN supports_off_session BOOLEAN DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_methods' AND column_name = 'supports_one_time'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN supports_one_time BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe_pm_id
  ON payment_methods(stripe_payment_method_id)
  WHERE stripe_payment_method_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_methods_setup_intent
  ON payment_methods(stripe_setup_intent_id)
  WHERE stripe_setup_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_methods_status
  ON payment_methods(payment_method_status, user_id)
  WHERE payment_method_status = 'active';

-- FIRST: Migrate existing data BEFORE adding constraints
-- Mark payment methods WITH stripe_payment_method_id as active
UPDATE payment_methods 
SET 
  payment_method_status = 'active',
  setup_completed_at = COALESCE(setup_completed_at, created_at),
  supports_subscriptions = true,
  supports_off_session = true,
  supports_one_time = true
WHERE stripe_payment_method_id IS NOT NULL;

-- Mark payment methods WITHOUT stripe_payment_method_id as inactive
-- These need to be re-added through proper Stripe flow
UPDATE payment_methods 
SET 
  payment_method_status = 'inactive',
  supports_subscriptions = false,
  supports_off_session = false,
  supports_one_time = false
WHERE stripe_payment_method_id IS NULL;

-- NOW add the check constraint after data is fixed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'payment_methods_active_must_have_stripe_id'
  ) THEN
    ALTER TABLE payment_methods
    ADD CONSTRAINT payment_methods_active_must_have_stripe_id
    CHECK (
      payment_method_status != 'active' OR 
      stripe_payment_method_id IS NOT NULL
    );
  END IF;
END $$;

-- Add check constraint for valid status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'payment_methods_valid_status'
  ) THEN
    ALTER TABLE payment_methods
    ADD CONSTRAINT payment_methods_valid_status
    CHECK (payment_method_status IN ('pending', 'active', 'failed', 'inactive'));
  END IF;
END $$;

-- Add helpful comments
COMMENT ON COLUMN payment_methods.stripe_payment_method_id IS 
  'Stripe Payment Method ID (pm_xxx). Required for active payment methods. Created via Stripe API or Elements.';

COMMENT ON COLUMN payment_methods.stripe_setup_intent_id IS 
  'Stripe Setup Intent ID (seti_xxx) for redirect-based methods like iDEAL and Bancontact during setup.';

COMMENT ON COLUMN payment_methods.payment_method_status IS 
  'Status: pending (awaiting setup completion), active (ready to use), failed (setup failed), inactive (deprecated/removed)';

COMMENT ON COLUMN payment_methods.setup_completed_at IS 
  'Timestamp when the Stripe Payment Method was successfully created and setup completed.';

COMMENT ON COLUMN payment_methods.supports_subscriptions IS 
  'Whether this payment method can be used for recurring subscription payments';

COMMENT ON COLUMN payment_methods.supports_off_session IS 
  'Whether this payment method can be charged without customer present (required for rentals)';

COMMENT ON COLUMN payment_methods.supports_one_time IS 
  'Whether this payment method can be used for one-time payments like validation charges';
