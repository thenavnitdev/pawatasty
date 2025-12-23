/*
  # Fix Points Transactions Column Names
  
  1. Problem
    - The `award_welcome_points()` and `update_user_points_from_transaction()` functions
      reference incorrect column names (`points` and `transaction_type`)
    - The actual columns in `points_transactions` table are `amount` and `type`
    - This causes errors during user account creation
    
  2. Changes
    - Drop and recreate `award_welcome_points()` function with correct column names
    - Drop and recreate `update_user_points_from_transaction()` function with correct column names
    
  3. Security
    - Maintains SECURITY DEFINER to ensure proper execution context
    - No changes to RLS policies needed
*/

-- Drop existing functions
DROP FUNCTION IF EXISTS award_welcome_points() CASCADE;
DROP FUNCTION IF EXISTS update_user_points_from_transaction() CASCADE;

-- Recreate award_welcome_points with correct column names
CREATE OR REPLACE FUNCTION award_welcome_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.profile_completed = true AND (OLD.profile_completed IS NULL OR OLD.profile_completed = false) THEN
    -- Use 'amount' instead of 'points' and 'type' instead of 'transaction_type'
    INSERT INTO points_transactions (user_id, amount, type, source, description)
    VALUES (NEW.user_id, 100, 'earned', 'welcome_bonus', 'Welcome bonus for completing profile');
    
    UPDATE users SET available_points = available_points + 100, total_points = total_points + 100
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate update_user_points_from_transaction with correct column names
CREATE OR REPLACE FUNCTION update_user_points_from_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Use 'type' instead of 'transaction_type' and 'amount' instead of 'points'
  IF NEW.type = 'earned' THEN
    UPDATE users SET 
      available_points = available_points + NEW.amount, 
      total_points = total_points + NEW.amount
    WHERE user_id = NEW.user_id;
  ELSIF NEW.type = 'redeemed' THEN
    UPDATE users SET 
      available_points = available_points - NEW.amount 
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate triggers
DROP TRIGGER IF EXISTS on_profile_completed_award_points ON users;
CREATE TRIGGER on_profile_completed_award_points
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION award_welcome_points();

DROP TRIGGER IF EXISTS on_points_transaction_update_balance ON points_transactions;
CREATE TRIGGER on_points_transaction_update_balance
  AFTER INSERT ON points_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_points_from_transaction();
