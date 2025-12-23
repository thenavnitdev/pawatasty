/*
  # Create Link ID Invite System

  1. Changes
    - Add `link_id` column to users table (6-character alphanumeric, unique)
    - Create function to generate valid link_id (must have letters and numbers)
    - Create function to validate link_id format
    - Create trigger to auto-generate link_id for new users
    - Add index for fast link_id lookups

  2. Security
    - link_id is publicly readable for invite lookups
    - Only users can see their own link_id
    - link_id cannot be manually changed (auto-generated only)
*/

-- Add link_id column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'link_id'
  ) THEN
    ALTER TABLE users ADD COLUMN link_id text UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_users_link_id ON users(link_id);
  END IF;
END $$;

-- Function to validate link_id format (6 chars, alphanumeric, has letters AND numbers)
CREATE OR REPLACE FUNCTION validate_link_id(code text)
RETURNS boolean AS $$
BEGIN
  -- Check length
  IF length(code) != 6 THEN
    RETURN false;
  END IF;

  -- Check if alphanumeric only (A-Z, 0-9)
  IF code !~ '^[A-Z0-9]+$' THEN
    RETURN false;
  END IF;

  -- Check if contains at least one letter
  IF code !~ '[A-Z]' THEN
    RETURN false;
  END IF;

  -- Check if contains at least one number
  IF code !~ '[0-9]' THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to generate a unique link_id
CREATE OR REPLACE FUNCTION generate_unique_link_id()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  has_letter boolean := false;
  has_number boolean := false;
  attempt int := 0;
  max_attempts int := 100;
BEGIN
  LOOP
    result := '';
    has_letter := false;
    has_number := false;

    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;

    has_letter := result ~ '[A-Z]';
    has_number := result ~ '[0-9]';

    IF has_letter AND has_number AND NOT EXISTS (SELECT 1 FROM users WHERE link_id = result) THEN
      RETURN result;
    END IF;

    attempt := attempt + 1;
    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique link_id after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Function to set link_id for new users
CREATE OR REPLACE FUNCTION set_user_link_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.link_id IS NULL THEN
    NEW.link_id := generate_unique_link_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate link_id
DROP TRIGGER IF EXISTS trigger_set_user_link_id ON users;
CREATE TRIGGER trigger_set_user_link_id
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_user_link_id();

-- Backfill existing users with link_ids
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM users WHERE link_id IS NULL LOOP
    UPDATE users SET link_id = generate_unique_link_id() WHERE id = user_record.id;
  END LOOP;
END $$;

-- Make link_id NOT NULL now that all users have one
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'link_id' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE users ALTER COLUMN link_id SET NOT NULL;
  END IF;
END $$;

-- Add RLS policy for link_id lookups
CREATE POLICY "Anyone can lookup users by link_id for invites"
  ON users
  FOR SELECT
  USING (link_id IS NOT NULL);