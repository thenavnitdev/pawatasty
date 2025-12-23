/*
  # Fix increment_total_savings function to use correct user_id column

  1. Changes
    - Update function to match on `user_id` instead of `id`
    - `user_id` is the text column that stores the auth user's UUID
    - `id` is an auto-increment bigint and not the auth user identifier

  2. Purpose
    - Fix the redemption error caused by trying to match auth UUID against wrong column
*/

-- Drop and recreate the function with correct column
DROP FUNCTION IF EXISTS increment_total_savings(text, numeric);

CREATE OR REPLACE FUNCTION increment_total_savings(
  p_user_id text,
  p_amount numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_total numeric;
BEGIN
  -- Insert or update the user's total_savings using user_id column
  INSERT INTO users (user_id, total_savings, created_at, updated_at)
  VALUES (p_user_id, p_amount, now(), now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    total_savings = COALESCE(users.total_savings, 0) + p_amount,
    updated_at = now()
  RETURNING total_savings INTO v_new_total;
  
  RETURN v_new_total;
END;
$$;