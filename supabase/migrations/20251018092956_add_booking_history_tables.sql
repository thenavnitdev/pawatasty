/*
  # Add Booking History Schema

  1. New Tables
    - `booking_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `type` (text) - 'rental' or 'dining'
      - `name` (text) - Location or restaurant name
      - `address` (text) - Full address
      - `booking_date` (date) - Date of booking
      - `booking_time` (time) - Time of booking
      - `status` (text) - 'active', 'complete', 'cancelled', 'lost'
      - `amount` (decimal) - Total amount
      - `image` (text, nullable) - Image URL for dining bookings
      - `pickup_location` (text, nullable) - Pickup location for rentals
      - `return_location` (text, nullable) - Return location for rentals
      - `deal` (text, nullable) - Deal description for dining
      - `power_bank_id` (text, nullable) - Power bank ID for rentals
      - `rental_fee` (decimal, nullable) - Rental fee for rentals
      - `late_fee` (decimal, nullable) - Late fee for rentals
      - `receipt_number` (text, nullable) - Receipt number
      - `return_date` (date, nullable) - Return date
      - `return_time` (time, nullable) - Return time
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Update timestamp

  2. Security
    - Enable RLS on `booking_history` table
    - Add policies for authenticated users to:
      - Read their own booking history
      - Insert new booking history entries
      - Update their own booking history entries
*/

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

ALTER TABLE booking_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own booking history"
  ON booking_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own booking history"
  ON booking_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own booking history"
  ON booking_history
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_booking_history_user_id ON booking_history(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_history_status ON booking_history(status);
CREATE INDEX IF NOT EXISTS idx_booking_history_date ON booking_history(booking_date DESC);
