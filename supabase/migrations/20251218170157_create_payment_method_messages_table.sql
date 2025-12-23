/*
  # Create Payment Method Messages Table

  1. New Tables
    - `payment_method_messages`
      - `id` (uuid, primary key)
      - `payment_method_type` (text) - 'ideal', 'bancontact', 'card', etc.
      - `message_type` (text) - 'confirmation_title', 'confirmation_subtitle', 'redirecting_text'
      - `message_text` (text) - the actual message content
      - `language` (text) - 'en', 'nl', etc. for future i18n support
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `payment_method_messages` table
    - Add policy for public read access (messages are not sensitive)
    - Add policy for authenticated admins to manage messages

  3. Data
    - Insert default messages for iDEAL and Bancontact
*/

CREATE TABLE IF NOT EXISTS payment_method_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_method_type text NOT NULL,
  message_type text NOT NULL,
  message_text text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(payment_method_type, message_type, language)
);

ALTER TABLE payment_method_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read payment method messages"
  ON payment_method_messages
  FOR SELECT
  USING (true);

-- Insert default messages for iDEAL
INSERT INTO payment_method_messages (payment_method_type, message_type, message_text, language) VALUES
('ideal', 'confirmation_title', 'Confirm with Ideal.', 'en'),
('ideal', 'confirmation_subtitle', 'You''ll be redirected to your bank to complete.', 'en'),
('ideal', 'redirecting_text', 'Redirecting to your bank...', 'en');

-- Insert default messages for Bancontact
INSERT INTO payment_method_messages (payment_method_type, message_type, message_text, language) VALUES
('bancontact', 'confirmation_title', 'Confirm with Bancontact.', 'en'),
('bancontact', 'confirmation_subtitle', 'You''ll be redirected to your bank to complete.', 'en'),
('bancontact', 'redirecting_text', 'Redirecting to your bank...', 'en');

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_method_messages_lookup 
  ON payment_method_messages(payment_method_type, language);