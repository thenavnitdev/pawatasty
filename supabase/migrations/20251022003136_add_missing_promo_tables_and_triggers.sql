/*
  # Add Missing Promo Tables and Auto-Generation

  1. Missing Tables to Create
    - `user_promo_codes` - Auto-generated unique code for each user
    - `promo_codes` - Admin promotional codes
    - `points_balance` - User points tracking

  2. Auto-Generation
    - Trigger creates promo code on new user signup
    - 8-character unique alphanumeric codes
    - Points balance auto-created

  3. Backfill
    - Generate codes for all existing users
*/

-- Create user_promo_codes table
CREATE TABLE IF NOT EXISTS user_promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE,
  promo_code text NOT NULL UNIQUE,
  referral_count integer DEFAULT 0 NOT NULL,
  total_points_earned integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create promo_codes table
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
  user_id text NOT NULL UNIQUE,
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

-- Enable RLS
ALTER TABLE user_promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_balance ENABLE ROW LEVEL SECURITY;

-- Policies for user_promo_codes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_promo_codes' AND policyname = 'Users can view own promo code'
  ) THEN
    CREATE POLICY "Users can view own promo code"
      ON user_promo_codes FOR SELECT
      TO authenticated
      USING (user_id = auth.uid()::text);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_promo_codes' AND policyname = 'System can insert promo codes'
  ) THEN
    CREATE POLICY "System can insert promo codes"
      ON user_promo_codes FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- Policies for promo_codes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'promo_codes' AND policyname = 'Anyone can view active promo codes'
  ) THEN
    CREATE POLICY "Anyone can view active promo codes"
      ON promo_codes FOR SELECT
      TO authenticated
      USING (is_active = true AND now() BETWEEN valid_from AND valid_until);
  END IF;
END $$;

-- Policies for points_balance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'points_balance' AND policyname = 'Users can view own points balance'
  ) THEN
    CREATE POLICY "Users can view own points balance"
      ON points_balance FOR SELECT
      TO authenticated
      USING (user_id = auth.uid()::text);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'points_balance' AND policyname = 'System can insert points balance'
  ) THEN
    CREATE POLICY "System can insert points balance"
      ON points_balance FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_promo_codes_user_id ON user_promo_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_promo_codes_code ON user_promo_codes(promo_code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active, valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_points_balance_user_id ON points_balance(user_id);

-- Function to generate unique promo code
CREATE OR REPLACE FUNCTION generate_unique_promo_code()
RETURNS text AS $$
DECLARE
  new_code text;
  code_exists boolean;
  attempts integer := 0;
BEGIN
  LOOP
    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'Could not generate unique promo code';
    END IF;
    
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    
    SELECT EXISTS (
      SELECT 1 FROM user_promo_codes WHERE promo_code = new_code
      UNION ALL
      SELECT 1 FROM promo_codes WHERE code = new_code
    ) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for trigger
CREATE OR REPLACE FUNCTION create_user_promo_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO user_promo_codes (user_id, promo_code)
    VALUES (NEW.user_id, generate_unique_promo_code())
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO points_balance (user_id, total_points, available_points, pending_points)
    VALUES (NEW.user_id, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS create_user_promo_trigger ON users;
CREATE TRIGGER create_user_promo_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_promo_on_signup();

-- Backfill for existing users
INSERT INTO user_promo_codes (user_id, promo_code)
SELECT 
    user_id,
    generate_unique_promo_code()
FROM users
WHERE user_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO points_balance (user_id, total_points, available_points, pending_points)
SELECT 
    user_id,
    0, 0, 0
FROM users
WHERE user_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Sample promo codes
INSERT INTO promo_codes (code, description, discount_type, discount_value, valid_from, valid_until, is_active) VALUES
  ('WELCOME10', '10% off first order', 'percentage', 10.00, now(), now() + interval '1 year', true),
  ('FREESHIP', 'Free shipping', 'fixed', 5.00, now(), now() + interval '6 months', true)
ON CONFLICT (code) DO NOTHING;
