/*
  # Fix Security Issues - Part 3: Function Security (Fixed)

  1. Fix Function Search Paths
    - Drop and recreate functions with proper search_path
    - Functions updated:
      - update_reviews_updated_at
      - cleanup_old_otp_codes
      - generate_unique_promo_code
      - update_updated_at_column
      - create_user_promo_on_signup
      - user_identifier_exists
      - find_user_by_identifier (drop first)
      - update_user_points_from_transaction
*/

-- ============================================================================
-- FIX FUNCTION SEARCH PATHS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION cleanup_old_otp_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM otp_codes 
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$;

CREATE OR REPLACE FUNCTION generate_unique_promo_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    new_code := upper(substring(md5(random()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM users WHERE promo_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION create_user_promo_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.promo_code IS NULL THEN
    NEW.promo_code := generate_unique_promo_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION user_identifier_exists(identifier text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM users 
    WHERE email = identifier OR phone_nr = identifier OR username = identifier
  );
END;
$$;

-- Drop and recreate find_user_by_identifier with proper signature
DROP FUNCTION IF EXISTS find_user_by_identifier(text);

CREATE FUNCTION find_user_by_identifier(identifier text)
RETURNS TABLE(id bigint, user_id text, email text, phone_nr text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.user_id, u.email, u.phone_nr
  FROM users u
  WHERE u.email = identifier OR u.phone_nr = identifier OR u.username = identifier
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION update_user_points_from_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    UPDATE users
    SET 
      total_points = COALESCE(total_points, 0) + NEW.points,
      available_points = COALESCE(available_points, 0) + NEW.points,
      total_points_earned = COALESCE(total_points_earned, 0) + NEW.points
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;