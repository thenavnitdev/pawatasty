/*
  # Auto-Update Merchant Rating and Review Count on Review Changes

  1. Purpose
    - Automatically update merchant rating and review_count when reviews are added, updated, or deleted
    - Ensure data consistency between reviews and merchants tables
    - Eliminate manual rating updates in edge functions

  2. Implementation
    - Create trigger function to recalculate average rating and review count
    - Trigger fires after INSERT, UPDATE, or DELETE on reviews table
    - Updates the corresponding merchant record in real-time
*/

-- Create function to update merchant rating and review count
CREATE OR REPLACE FUNCTION update_merchant_review_stats()
RETURNS TRIGGER AS $$
DECLARE
  target_merchant_id text;
  avg_rating numeric;
  total_reviews integer;
BEGIN
  -- Determine which merchant_id to update
  IF TG_OP = 'DELETE' THEN
    target_merchant_id := OLD.target_id;
  ELSE
    target_merchant_id := NEW.target_id;
  END IF;

  -- Only process if target_type is 'merchant'
  IF (TG_OP = 'DELETE' AND OLD.target_type = 'merchant') OR
     (TG_OP IN ('INSERT', 'UPDATE') AND NEW.target_type = 'merchant') THEN
    
    -- Calculate average rating and count for this merchant
    SELECT 
      COALESCE(ROUND(AVG(rating)::numeric, 1), 0),
      COUNT(*)
    INTO avg_rating, total_reviews
    FROM reviews
    WHERE target_type = 'merchant' AND target_id = target_merchant_id;

    -- Update the merchant record
    UPDATE merchants
    SET 
      rating = avg_rating,
      review_count = total_reviews
    WHERE merchant_id = target_merchant_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_merchant_review_stats ON reviews;

-- Create trigger that fires after any review change
CREATE TRIGGER trigger_update_merchant_review_stats
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_merchant_review_stats();