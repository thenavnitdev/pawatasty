/*
  # Add Card Brand to Payment Methods

  1. Changes
    - Add `card_brand` column to `payment_methods` table
      - Stores the card type (visa, mastercard, amex, etc.)
      - Helps with displaying appropriate card logos
      - Optional field with default empty string

  2. Notes
    - This field is only relevant for card payment methods
    - Used for UI display purposes to show correct card logo
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_methods' AND column_name = 'card_brand'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN card_brand text DEFAULT '';
  END IF;
END $$;
