/*
  # Add SEPA Mandate for Rental System

  1. Changes
    - Add `rental_sepa_mandate_id` to users table
    - This stores the Stripe payment method ID for SEPA Direct Debit
    - Created via iDEAL validation checkout with €0.50 fee
    - Used for all automatic rental charges (off_session)

  2. Flow
    - User completes iDEAL checkout (€0.50 validation)
    - Stripe creates SEPA Direct Debit mandate
    - Webhook stores payment_method ID in this column
    - All rental charges use this mandate automatically
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'rental_sepa_mandate_id'
  ) THEN
    ALTER TABLE users ADD COLUMN rental_sepa_mandate_id text;
    CREATE INDEX IF NOT EXISTS idx_users_rental_sepa_mandate ON users(rental_sepa_mandate_id);
  END IF;
END $$;
