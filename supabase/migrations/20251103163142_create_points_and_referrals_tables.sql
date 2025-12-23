/*
  # Create Points and Referrals Tables

  ## Summary
  Creates the foundational tables for the points and referrals system:
  - points_transactions: Tracks all point earnings and spending
  - referrals: Tracks referral relationships and rewards

  ## Tables
  1. points_transactions
    - id (uuid, primary key)
    - user_id (text, references users)
    - amount (integer, points amount)
    - type (text, earned/spent/expired/refunded)
    - source (text, referral/purchase/promo/subscription/booking)
    - description (text, human-readable description)
    - order_id (text, optional reference)
    - expires_at (timestamptz, optional expiration)
    - created_at (timestamptz, timestamp)

  2. referrals
    - id (uuid, primary key)
    - referrer_id (text, user who referred)
    - referred_user_id (text, user who was referred)
    - referred_user_email (text, email of referred user)
    - status (text, pending/completed/rewarded)
    - points_earned (integer, points awarded)
    - created_at (timestamptz)
    - completed_at (timestamptz)
    - rewarded_at (timestamptz)

  ## Security
  - RLS enabled on both tables
  - Users can only view their own transactions
  - Users can only view referrals they made
*/

-- Create points_transactions table
CREATE TABLE IF NOT EXISTS points_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  amount integer NOT NULL,
  type text NOT NULL CHECK (type IN ('earned', 'spent', 'expired', 'refunded')),
  source text NOT NULL CHECK (source IN ('referral', 'purchase', 'promo', 'subscription', 'booking')),
  description text NOT NULL,
  order_id text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id text NOT NULL,
  referred_user_id text,
  referred_user_email text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
  points_earned integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz,
  rewarded_at timestamptz
);

-- Enable RLS
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- RLS policies for points_transactions
CREATE POLICY "Users can view own points transactions"
  ON points_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "System can insert points transactions"
  ON points_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS policies for referrals
CREATE POLICY "Users can view referrals they made"
  ON referrals FOR SELECT
  TO authenticated
  USING (referrer_id = auth.uid()::text OR referred_user_id = auth.uid()::text);

CREATE POLICY "System can insert referrals"
  ON referrals FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_points_transactions_user_id ON points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_created_at ON points_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_points_transactions_user_source ON points_transactions(user_id, source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
