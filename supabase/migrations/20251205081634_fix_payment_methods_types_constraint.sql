/*
  # Fix Payment Methods Type Constraint

  1. Changes
    - Update the CHECK constraint on payment_methods.type column to include all supported payment types
    - Adds support for: 'revolut_pay', 'bancontact', 'sepa_debit', 'applepay', 'googlepay'
    - Keeps existing types: 'card', 'paypal', 'ideal'

  2. Security
    - No changes to RLS policies
    - Only modifies the type constraint to match application requirements
*/

-- Drop the existing constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payment_methods_type_check'
  ) THEN
    ALTER TABLE payment_methods DROP CONSTRAINT payment_methods_type_check;
  END IF;
END $$;

-- Add the updated constraint with all supported payment types
ALTER TABLE payment_methods 
ADD CONSTRAINT payment_methods_type_check 
CHECK (type IN ('card', 'paypal', 'ideal', 'revolut_pay', 'bancontact', 'sepa_debit', 'applepay', 'googlepay'));
