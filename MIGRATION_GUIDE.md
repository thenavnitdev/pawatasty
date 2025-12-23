# Migration Guide to New Supabase Instance

**New Instance URL:** https://dopjawhuylqipltnuydp.supabase.co

## Step 1: Apply Database Migrations

Go to your Supabase Dashboard → SQL Editor and run the following migrations **in order**:

### Migration 1: Create Base Schema
Copy the contents of: `supabase/migrations/20251017145519_create_booking_schema.sql`

### Migration 2: Add Category Column
Copy the contents of: `supabase/migrations/20251017171651_add_category_to_restaurants.sql`

### Migration 3: Add Booking History
Copy the contents of: `supabase/migrations/20251018092956_add_booking_history_tables.sql`

### Migration 4: Add Deal Bookings
Copy the contents of: `supabase/migrations/20251018100023_add_deal_bookings_table.sql`

### Migration 5: Create User Profiles
Copy the contents of: `supabase/migrations/20251018134903_create_user_profiles_table.sql`

### Migration 6: Create Payment Methods
Copy the contents of: `supabase/migrations/20251018141032_create_payment_methods_table.sql`

### Migration 7: Add Membership Level
Copy the contents of: `supabase/migrations/20251018193710_add_user_membership_level.sql`

### Migration 8: Create Fault Reports
Copy the contents of: `supabase/migrations/20251018205455_create_fault_reports_table.sql`

### Migration 9: Add Card Brand
Copy the contents of: `supabase/migrations/20251019004813_add_card_brand_to_payment_methods.sql`

### Migration 10: Add Expiry Fields
Copy the contents of: `supabase/migrations/20251019193503_add_expiry_fields_to_payment_methods.sql`

### Migration 11: Create Suggestions
Copy the contents of: `supabase/migrations/20251019220629_create_suggestions_table.sql`

## Step 2: Deploy Edge Functions

You need to deploy these 3 edge functions using Supabase CLI:

### Install Supabase CLI (if not installed)
```bash
npm install -g supabase
```

### Login to Supabase
```bash
supabase login
```

### Link to your project
```bash
supabase link --project-ref dopjawhuylqipltnuydp
```

### Deploy Edge Functions
```bash
supabase functions deploy payment-methods
supabase functions deploy fault-reports
supabase functions deploy suggestions
```

## Step 3: Verify Migration

1. Open `test-full-app.html` in your browser
2. Click "Run All Tests"
3. All tests should pass:
   - ✅ 9 database tables accessible
   - ✅ 3 edge functions responding
   - ✅ External API working
   - ✅ Authentication working

## Alternative: One-Shot SQL Migration

If you prefer, you can run everything at once. Go to SQL Editor and paste:

```sql
-- Create restaurants table with category
CREATE TABLE IF NOT EXISTS restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  category text NOT NULL DEFAULT 'restaurant',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT restaurants_category_check CHECK (category IN ('restaurant', 'cafe', 'bar', 'shop'))
);

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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id),
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

-- Create trigger function
CREATE OR REPLACE FUNCTION update_deal_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER deal_bookings_updated_at
  BEFORE UPDATE ON deal_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_deal_bookings_updated_at();

-- Insert sample data
INSERT INTO restaurants (name, address, category) VALUES
  ('The Rebel Burgers', 'Marnixkade 1378, 1015XS Amsterdam', 'restaurant'),
  ('Nana & Roda''s Res', 'Dam Square 12, 1012 Amsterdam', 'restaurant'),
  ('Eat Phil Burgers', 'Leidseplein 5, 1017 Amsterdam', 'restaurant')
ON CONFLICT DO NOTHING;
```

## Troubleshooting

If you get errors:
- **"relation already exists"**: This is fine, the migration is idempotent
- **"policy already exists"**: Also fine, means it was already created
- **Foreign key violations**: Make sure to run migrations in order

## After Migration

Run the test suite to verify everything works:
1. Open `test-full-app.html` in browser
2. Click "Run All Tests"
3. Check that all 9 tables and 3 edge functions are working
