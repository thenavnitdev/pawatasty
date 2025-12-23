/*
  # Create increment_total_savings function

  1. New Functions
    - `increment_total_savings(p_user_id text, p_amount numeric)`
      - Increments the total_savings for a user
      - Creates the user record if it doesn't exist
      - Returns the updated total_savings value

  2. Purpose
    - Safely increment user's total savings when completing a booking
    - Handle cases where user record might not exist yet
*/

-- Create function to increment total savings
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
  -- Insert or update the user's total_savings
  INSERT INTO users (id, total_savings, created_at, updated_at)
  VALUES (p_user_id, p_amount, now(), now())
  ON CONFLICT (id) 
  DO UPDATE SET 
    total_savings = COALESCE(users.total_savings, 0) + p_amount,
    updated_at = now()
  RETURNING total_savings INTO v_new_total;
  
  RETURN v_new_total;
END;
$$;