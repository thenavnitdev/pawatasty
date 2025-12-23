/*
  # Add Deal Bookings Schema

  1. New Tables
    - `deal_bookings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `restaurant_id` (uuid, foreign key to restaurants)
      - `deal_id` (text) - ID of the deal being booked
      - `deal_title` (text) - Title of the deal
      - `booking_date` (date) - Date of the booking
      - `booking_time` (time) - Time slot for the booking
      - `status` (text) - 'confirmed', 'cancelled', 'completed'
      - `created_at` (timestamptz) - When booking was created
      - `updated_at` (timestamptz) - When booking was last updated

  2. Security
    - Enable RLS on `deal_bookings` table
    - Add policies for authenticated users to:
      - Read their own deal bookings
      - Insert new deal bookings
      - Update their own deal bookings
      - Delete their own deal bookings

  3. Indexes
    - Index on user_id for fast user booking lookups
    - Index on restaurant_id for merchant queries
    - Index on booking_date for date-based queries
    - Index on status for filtering by booking status
*/

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

ALTER TABLE deal_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deal bookings"
  ON deal_bookings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deal bookings"
  ON deal_bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deal bookings"
  ON deal_bookings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own deal bookings"
  ON deal_bookings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_deal_bookings_user_id ON deal_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_bookings_restaurant_id ON deal_bookings(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_deal_bookings_date ON deal_bookings(booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_deal_bookings_status ON deal_bookings(status);

CREATE OR REPLACE FUNCTION update_deal_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
