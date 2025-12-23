/*
  # Create automatic merchant review statistics updates

  1. New Functions
    - `update_merchant_review_stats()` - Recalculates average rating and review count for a merchant
  
  2. New Triggers
    - `trigger_update_merchant_reviews_on_insert` - Updates stats when a review is added
    - `trigger_update_merchant_reviews_on_update` - Updates stats when a review is modified
    - `trigger_update_merchant_reviews_on_delete` - Updates stats when a review is deleted
  
  3. Changes
    - Automatically updates merchants.rating and merchants.review_count whenever reviews change
    - Ensures rating and review count are always accurate and up-to-date
  
  4. Security
    - Functions are SECURITY DEFINER to bypass RLS for system updates
    - Only triggered by review table changes, not directly callable by users
*/

-- Function to update merchant review statistics
CREATE OR REPLACE FUNCTION update_merchant_review_stats()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  target_merchant_id TEXT;
  avg_rating NUMERIC;
  total_reviews INTEGER;
BEGIN
  -- Determine which merchant to update
  IF TG_OP = 'DELETE' THEN
    target_merchant_id := OLD.target_id;
  ELSE
    target_merchant_id := NEW.target_id;
  END IF;

  -- Only process merchant reviews
  IF (TG_OP = 'DELETE' AND OLD.target_type = 'merchant') OR 
     (TG_OP IN ('INSERT', 'UPDATE') AND NEW.target_type = 'merchant') THEN
    
    -- Calculate average rating and count
    SELECT 
      COALESCE(AVG(rating), 0)::NUMERIC(3,2),
      COUNT(*)::INTEGER
    INTO avg_rating, total_reviews
    FROM reviews
    WHERE target_type = 'merchant' 
      AND target_id = target_merchant_id;

    -- Update the merchant record
    UPDATE merchants
    SET 
      rating = avg_rating,
      review_count = total_reviews
    WHERE merchant_id = target_merchant_id;
    
    RAISE NOTICE 'Updated merchant % - Rating: %, Reviews: %', target_merchant_id, avg_rating, total_reviews;
  END IF;

  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Trigger for INSERT
DROP TRIGGER IF EXISTS trigger_update_merchant_reviews_on_insert ON reviews;
CREATE TRIGGER trigger_update_merchant_reviews_on_insert
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_merchant_review_stats();

-- Trigger for UPDATE
DROP TRIGGER IF EXISTS trigger_update_merchant_reviews_on_update ON reviews;
CREATE TRIGGER trigger_update_merchant_reviews_on_update
  AFTER UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_merchant_review_stats();

-- Trigger for DELETE
DROP TRIGGER IF EXISTS trigger_update_merchant_reviews_on_delete ON reviews;
CREATE TRIGGER trigger_update_merchant_reviews_on_delete
  AFTER DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_merchant_review_stats();
