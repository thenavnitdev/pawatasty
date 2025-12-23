/*
  # Fix Missing Points Update Trigger

  ## Problem
  Points transactions are being recorded but the users table is not being updated
  with the new point balances.

  ## Solution
  Create the trigger and function that automatically updates the users table
  whenever a points_transaction is inserted.

  ## Changes
  1. Create function update_user_points_from_transaction()
  2. Create trigger on points_transactions table
  3. Backfill existing transactions to update user balances

  ## Security
  - Function runs with SECURITY DEFINER for proper permissions
*/

-- Create function to update user points when transaction is inserted
CREATE OR REPLACE FUNCTION update_user_points_from_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'earned' THEN
    -- Add points for earned transactions
    UPDATE users
    SET
      total_points = COALESCE(total_points, 0) + NEW.amount,
      available_points = COALESCE(available_points, 0) + NEW.amount
    WHERE user_id = NEW.user_id;
  ELSIF NEW.type = 'spent' THEN
    -- Deduct points for spent transactions
    UPDATE users
    SET
      available_points = GREATEST(COALESCE(available_points, 0) - NEW.amount, 0)
    WHERE user_id = NEW.user_id;
  ELSIF NEW.type = 'expired' THEN
    -- Remove expired points from available
    UPDATE users
    SET
      available_points = GREATEST(COALESCE(available_points, 0) - NEW.amount, 0)
    WHERE user_id = NEW.user_id;
  ELSIF NEW.type = 'refunded' THEN
    -- Add back refunded points
    UPDATE users
    SET
      available_points = COALESCE(available_points, 0) + NEW.amount
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_user_points_trigger ON points_transactions;

-- Create trigger on points_transactions
CREATE TRIGGER update_user_points_trigger
  AFTER INSERT ON points_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_points_from_transaction();

-- Backfill existing points transactions
DO $$
DECLARE
  transaction_record RECORD;
BEGIN
  -- Reset all points to 0 first
  UPDATE users SET total_points = 0, available_points = 0, pending_points = 0;
  
  -- Process all existing transactions in chronological order
  FOR transaction_record IN 
    SELECT user_id, amount, type
    FROM points_transactions
    ORDER BY created_at ASC
  LOOP
    IF transaction_record.type = 'earned' THEN
      UPDATE users
      SET
        total_points = COALESCE(total_points, 0) + transaction_record.amount,
        available_points = COALESCE(available_points, 0) + transaction_record.amount
      WHERE user_id = transaction_record.user_id;
    ELSIF transaction_record.type = 'spent' THEN
      UPDATE users
      SET
        available_points = GREATEST(COALESCE(available_points, 0) - transaction_record.amount, 0)
      WHERE user_id = transaction_record.user_id;
    ELSIF transaction_record.type = 'expired' THEN
      UPDATE users
      SET
        available_points = GREATEST(COALESCE(available_points, 0) - transaction_record.amount, 0)
      WHERE user_id = transaction_record.user_id;
    ELSIF transaction_record.type = 'refunded' THEN
      UPDATE users
      SET
        available_points = COALESCE(available_points, 0) + transaction_record.amount
      WHERE user_id = transaction_record.user_id;
    END IF;
  END LOOP;
END $$;
