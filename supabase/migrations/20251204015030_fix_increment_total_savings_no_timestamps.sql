/*
  # Fix increment_total_savings function - avoid timestamp columns

  1. Changes
    - Remove created_at and updated_at from INSERT (they have conflicting types)
    - Only update total_savings field
    - Let database handle timestamps automatically

  2. Purpose
    - Fix the type conflict with created_at/updated_at columns
    - Simplify the function to only handle savings
*/

-- Drop and recreate the function without timestamp handling
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
  INSERT INTO users (user_id, total_savings)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    total_savings = COALESCE(users.total_savings, 0) + p_amount
  RETURNING total_savings INTO v_new_total;
  
  RETURN v_new_total;
END;
$$;