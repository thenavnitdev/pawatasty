/*
  # Create Liked Merchants Table

  ## Description
  This migration creates the infrastructure for users to save their favorite/liked merchants.

  ## New Tables
    - `liked_merchants`
      - `id` (uuid, primary key) - Unique identifier for each like record
      - `user_id` (uuid, foreign key) - References auth.users table
      - `merchant_id` (text) - ID of the liked merchant
      - `created_at` (timestamptz) - When the merchant was liked
      - Unique constraint on (user_id, merchant_id) to prevent duplicate likes

  ## Security
    - Enable RLS on `liked_merchants` table
    - Add policy for authenticated users to view their own liked merchants
    - Add policy for authenticated users to add their own liked merchants
    - Add policy for authenticated users to remove their own liked merchants
*/

CREATE TABLE IF NOT EXISTS liked_merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, merchant_id)
);

ALTER TABLE liked_merchants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own liked merchants"
  ON liked_merchants
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add liked merchants"
  ON liked_merchants
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove liked merchants"
  ON liked_merchants
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_liked_merchants_user_id ON liked_merchants(user_id);
CREATE INDEX IF NOT EXISTS idx_liked_merchants_merchant_id ON liked_merchants(merchant_id);