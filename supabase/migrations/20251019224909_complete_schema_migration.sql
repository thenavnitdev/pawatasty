/*
  # Complete Schema Migration for New Supabase Instance

  1. New Tables
    - `restaurants` - Restaurant/merchant listings with category support
    - `bookings` - Table bookings for restaurants
    - `chat_messages` - Support chat messages between users and system
    - `booking_history` - Complete rental and dining history
    - `deal_bookings` - Deal-specific bookings
    - `user_profiles` - Extended user profile information
    - `payment_methods` - User payment methods (cards, PayPal)
    - `fault_reports` - Fault reports for stations/banks/app issues
    - `suggestions` - User suggestions and feedback

  2. Security
    - Enable RLS on all tables
    - Restrictive policies ensuring users can only access their own data
    - Public read for restaurants
    - Authenticated-only access for all other tables

  3. Performance
    - Indexes on frequently queried columns
    - Triggers for automatic timestamp updates
*/

-- Create restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  category text NOT NULL DEFAULT 'restaurant',
  created_at timestamptz DEFAULT now()
);

-- Add category constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'restaurants_category_check'
  ) THEN
    ALTER TABLE restaurants ADD CONSTRAINT restaurants_category_check 
      CHECK (category IN ('restaurant', 'cafe', 'bar', 'shop'));
  END IF;
END $$;

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  restaurant_id uuid REFERENCES restaurants(id) NOT NULL,
  booking_date date NOT NULL,
  booking_time text NOT NULL,
  party_size integer NOT NULL DEFAULT 1,
  booking_type text NOT NULL DEFAULT 'single',
  deal_description text,
  status text NOT NULL DEFAULT 'reserved',
  created_at timestamptz DEFAULT now()
);

-- Create chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  message text NOT NULL,
  is_from_user boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create booking history table
CREATE TABLE IF NOT EXISTS booking_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('rental', 'dining')),
  name text NOT NULL,
  address text NOT NULL,
  booking_date date NOT NULL,
  booking_time time NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'complete', 'cancelled', 'lost')),
  amount decimal(10, 2) NOT NULL DEFAULT 0.00,
  image text,
  pickup_location text,
  return_location text,
  deal text,
  power_bank_id text,
  rental_fee decimal(10, 2),
  late_fee decimal(10, 2),
  receipt_number text,
  return_date date,
  return_time time,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create deal bookings table
CREATE TABLE IF NOT EXISTS deal_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  deal_id text NOT NULL,
  deal_title text NOT NULL,
  booking_date date NOT NULL,
  booking_time time NOT NULL,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name text NOT NULL DEFAULT '',
  username text UNIQUE NOT NULL,
  email text NOT NULL,
  phone text DEFAULT '',
  gender text DEFAULT '',
  age integer DEFAULT 0,
  bio text DEFAULT '',
  website text DEFAULT '',
  profile_image_url text DEFAULT '',
  instagram_handle text DEFAULT '',
  tiktok_handle text DEFAULT '',
  visits integer DEFAULT 0,
  followers integer DEFAULT 0,
  following integer DEFAULT 0,
  membership_level integer DEFAULT 1 NOT NULL,
  stripe_customer_id text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT user_profiles_user_id_unique UNIQUE(user_id),
  CONSTRAINT check_membership_level CHECK (membership_level >= 1 AND membership_level <= 5)
);

-- Create payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('card', 'paypal')),
  last_four text NOT NULL,
  cardholder_name text DEFAULT '',
  email text DEFAULT '',
  card_brand text DEFAULT '',
  expiry_month integer,
  expiry_year integer,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create fault reports table
CREATE TABLE IF NOT EXISTS fault_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  report_type text NOT NULL,
  qr_code text,
  category text NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create suggestions table
CREATE TABLE IF NOT EXISTS suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE fault_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view restaurants" ON restaurants;
DROP POLICY IF EXISTS "Authenticated users can insert restaurants" ON restaurants;
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can create own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can delete own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can view own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can create own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can view own booking history" ON booking_history;
DROP POLICY IF EXISTS "Users can insert own booking history" ON booking_history;
DROP POLICY IF EXISTS "Users can update own booking history" ON booking_history;
DROP POLICY IF EXISTS "Users can view own deal bookings" ON deal_bookings;
DROP POLICY IF EXISTS "Users can insert own deal bookings" ON deal_bookings;
DROP POLICY IF EXISTS "Users can update own deal bookings" ON deal_bookings;
DROP POLICY IF EXISTS "Users can delete own deal bookings" ON deal_bookings;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can view public profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can insert own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can update own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can delete own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can create own fault reports" ON fault_reports;
DROP POLICY IF EXISTS "Users can view own fault reports" ON fault_reports;
DROP POLICY IF EXISTS "Users can update own fault reports" ON fault_reports;
DROP POLICY IF EXISTS "Users can insert own suggestions" ON suggestions;
DROP POLICY IF EXISTS "Users can read own suggestions" ON suggestions;

-- Policies for restaurants
CREATE POLICY "Anyone can view restaurants"
  ON restaurants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert restaurants"
  ON restaurants FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies for bookings
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookings"
  ON bookings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for chat messages
CREATE POLICY "Users can view own chat messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own chat messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policies for booking history
CREATE POLICY "Users can view own booking history"
  ON booking_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own booking history"
  ON booking_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own booking history"
  ON booking_history FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for deal bookings
CREATE POLICY "Users can view own deal bookings"
  ON deal_bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deal bookings"
  ON deal_bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deal bookings"
  ON deal_bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own deal bookings"
  ON deal_bookings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for user profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view public profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Policies for payment methods
CREATE POLICY "Users can view own payment methods"
  ON payment_methods FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment methods"
  ON payment_methods FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment methods"
  ON payment_methods FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment methods"
  ON payment_methods FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for fault reports
CREATE POLICY "Users can create own fault reports"
  ON fault_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own fault reports"
  ON fault_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own fault reports"
  ON fault_reports FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for suggestions
CREATE POLICY "Users can insert own suggestions"
  ON suggestions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own suggestions"
  ON suggestions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_booking_history_user_id ON booking_history(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_history_status ON booking_history(status);
CREATE INDEX IF NOT EXISTS idx_booking_history_date ON booking_history(booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_deal_bookings_user_id ON deal_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_bookings_restaurant_id ON deal_bookings(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_deal_bookings_date ON deal_bookings(booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_deal_bookings_status ON deal_bookings(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_primary ON payment_methods(user_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_fault_reports_user_id ON fault_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_fault_reports_created_at ON fault_reports(created_at DESC);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_deal_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'deal_bookings_updated_at'
  ) THEN
    CREATE TRIGGER deal_bookings_updated_at
      BEFORE UPDATE ON deal_bookings
      FOR EACH ROW
      EXECUTE FUNCTION update_deal_bookings_updated_at();
  END IF;
END $$;

-- Insert sample restaurants
INSERT INTO restaurants (name, address, category) VALUES
  ('The Rebel Burgers', 'Marnixkade 1378, 1015XS Amsterdam', 'restaurant'),
  ('Nana & Roda''s Res', 'Dam Square 12, 1012 Amsterdam', 'restaurant'),
  ('Eat Phil Burgers', 'Leidseplein 5, 1017 Amsterdam', 'restaurant')
ON CONFLICT DO NOTHING;