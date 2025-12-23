/*
  # Create OTP Codes Table

  1. New Tables
    - `otp_codes`
      - `id` (uuid, primary key)
      - `phone` (text, indexed)
      - `code` (text, 6-digit OTP code)
      - `expires_at` (timestamp, when OTP expires)
      - `verified` (boolean, whether OTP was used)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on `otp_codes` table
    - No user-facing policies (only service role can access)
  
  3. Notes
    - OTP codes expire after 3 minutes
    - Only the most recent unverified code is valid
    - Old codes are marked as verified when a new one is created
*/

-- Create OTP codes table
CREATE TABLE IF NOT EXISTS otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_otp_codes_phone ON otp_codes(phone);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON otp_codes(expires_at);

-- Enable RLS
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- No policies needed - only service role should access this table
-- This prevents users from reading OTP codes

-- Function to clean up old OTP codes (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_otp_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM otp_codes 
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$;
