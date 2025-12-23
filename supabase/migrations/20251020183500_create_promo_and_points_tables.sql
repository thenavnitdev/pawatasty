/*
  # Create Promo Codes, Points, and Referrals Tables

  1. New Tables
    - `user_promo_codes` - Stores each user's unique referral/promo code
    - `promo_codes` - Global promo codes that can be created by admins
    - `points_balance` - Tracks user points balance
    - `points_transactions` - Records all points earned/spent
    - `referrals` - Tracks user referrals and rewards

  2. Security
    - Enable RLS on all tables
    - Users can only view/update their own data
    - Referrals are tracked but users can only see their own

  3. Features
    - Auto-generate unique promo code for each user
    - Track points earned from referrals, purchases, promos
    - Support expiring promo codes
    - Track referral status and rewards
*/

-- Create user_promo_codes table (each user gets a unique code)
CREATE TABLE IF NOT EXISTS user_promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  promo_code text NOT NULL UNIQUE,
  referral_count integer DEFAULT 0 NOT NULL,
  total_points_earned integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create promo_codes table (admin-created promotional codes)
CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text DEFAULT '',
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'points')),
  discount_value numeric(10, 2) NOT NULL,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz NOT NULL,
  max_uses integer,
  current_uses integer DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create points_balance table
CREATE TABLE IF NOT EXISTS points_balance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_points integer DEFAULT 0 NOT NULL,
  available_points integer DEFAULT 0 NOT NULL,
  pending_points integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT check_points_non_negative CHECK (
    total_points >= 0 AND
    available_points >= 0 AND
    pending_points >= 0
  )
);

-- Create points_transactions table
CREATE TABLE IF NOT EXISTS points_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
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
  referrer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referred_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_email text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
  points_earned integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz,
  rewarded_at timestamptz
);

-- Enable RLS
ALTER TABLE user_promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Policies for user_promo_codes
CREATE POLICY "Users can view own promo code"
  ON user_promo_codes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own promo code"
  ON user_promo_codes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own promo code"
  ON user_promo_codes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for promo_codes (read-only for users)
CREATE POLICY "Anyone can view active promo codes"
  ON promo_codes FOR SELECT
  TO authenticated
  USING (is_active = true AND now() BETWEEN valid_from AND valid_until);

-- Policies for points_balance
CREATE POLICY "Users can view own points balance"
  ON points_balance FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own points balance"
  ON points_balance FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own points balance"
  ON points_balance FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for points_transactions
CREATE POLICY "Users can view own points transactions"
  ON points_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own points transactions"
  ON points_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policies for referrals
CREATE POLICY "Users can view referrals they made"
  ON referrals FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id);

CREATE POLICY "Users can insert referrals"
  ON referrals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "Users can update referrals they made"
  ON referrals FOR UPDATE
  TO authenticated
  USING (auth.uid() = referrer_id)
  WITH CHECK (auth.uid() = referrer_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_promo_codes_user_id ON user_promo_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_promo_codes_code ON user_promo_codes(promo_code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active, valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_points_balance_user_id ON points_balance(user_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_user_id ON points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_created_at ON points_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- Function to generate unique promo code
CREATE OR REPLACE FUNCTION generate_unique_promo_code()
RETURNS text AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Generate 6 character alphanumeric code (uppercase)
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));

    -- Check if code already exists
    SELECT EXISTS (
      SELECT 1 FROM user_promo_codes WHERE promo_code = new_code
    ) INTO code_exists;

    EXIT WHEN NOT code_exists;
  END LOOP;

  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to create promo code for new user
CREATE OR REPLACE FUNCTION create_user_promo_code()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_promo_codes (user_id, promo_code)
  VALUES (NEW.id, generate_unique_promo_code());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to initialize points balance for new user
CREATE OR REPLACE FUNCTION create_user_points_balance()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO points_balance (user_id, total_points, available_points, pending_points)
  VALUES (NEW.id, 0, 0, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update points balance after transaction
CREATE OR REPLACE FUNCTION update_points_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'earned' THEN
    UPDATE points_balance
    SET
      total_points = total_points + NEW.amount,
      available_points = available_points + NEW.amount,
      updated_at = now()
    WHERE user_id = NEW.user_id;
  ELSIF NEW.type = 'spent' THEN
    UPDATE points_balance
    SET
      available_points = available_points - NEW.amount,
      updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'create_user_promo_code_trigger'
  ) THEN
    CREATE TRIGGER create_user_promo_code_trigger
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION create_user_promo_code();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'create_user_points_balance_trigger'
  ) THEN
    CREATE TRIGGER create_user_points_balance_trigger
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION create_user_points_balance();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_points_balance_trigger'
  ) THEN
    CREATE TRIGGER update_points_balance_trigger
      AFTER INSERT ON points_transactions
      FOR EACH ROW
      EXECUTE FUNCTION update_points_balance();
  END IF;
END $$;

-- Create some sample promo codes for testing
INSERT INTO promo_codes (code, description, discount_type, discount_value, valid_from, valid_until, max_uses, is_active) VALUES
  ('WELCOME10', '10% off your first order', 'percentage', 10.00, now(), now() + interval '1 year', NULL, true),
  ('FREESHIP', 'Free shipping on all orders', 'fixed', 5.00, now(), now() + interval '6 months', 1000, true),
  ('POINTS100', 'Get 100 bonus points', 'points', 100.00, now(), now() + interval '3 months', 500, true)
ON CONFLICT (code) DO NOTHING;
