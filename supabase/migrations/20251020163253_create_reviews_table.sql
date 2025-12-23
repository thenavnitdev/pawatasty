/*
  # Create Reviews Table for Merchants

  1. New Tables
    - `reviews`
      - `id` (uuid, primary key) - Unique review identifier
      - `user_id` (uuid) - Reference to auth.users
      - `target_type` (text) - Type of entity (e.g., 'merchant')
      - `target_id` (text) - ID of the merchant being reviewed
      - `rating` (integer) - Overall rating (1-5)
      - `comment` (text) - Review text
      - `food_rating` (integer) - Food quality rating (1-5)
      - `service_rating` (integer) - Service quality rating (1-5)
      - `ambiance_rating` (integer) - Ambiance rating (1-5)
      - `value_rating` (integer) - Value for money rating (1-5)
      - `images` (jsonb) - Array of image URLs/IDs
      - `helpful_count` (integer) - Number of helpful votes
      - `created_at` (timestamptz) - Review creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
  
  2. Security
    - Enable RLS on `reviews` table
    - Add policy for anyone to read reviews
    - Add policy for authenticated users to create reviews
    - Add policy for users to update/delete their own reviews
  
  3. Indexes
    - Index on target_type and target_id for fast lookups
    - Index on user_id for user's review history
    - Index on rating for filtering
    - Index on created_at for sorting
  
  4. Constraints
    - Rating must be between 1 and 5
    - Target type must be valid
*/

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('merchant', 'deal', 'station')),
  target_id text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  food_rating integer CHECK (food_rating >= 1 AND food_rating <= 5),
  service_rating integer CHECK (service_rating >= 1 AND service_rating <= 5),
  ambiance_rating integer CHECK (ambiance_rating >= 1 AND ambiance_rating <= 5),
  value_rating integer CHECK (value_rating >= 1 AND value_rating <= 5),
  images jsonb DEFAULT '[]'::jsonb,
  helpful_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_target ON reviews(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at DESC);

-- Create composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_reviews_target_created ON reviews(target_type, target_id, created_at DESC);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read all reviews (public access)
CREATE POLICY "Anyone can read reviews"
  ON reviews
  FOR SELECT
  TO public
  USING (true);

-- Policy: Authenticated users can create reviews
CREATE POLICY "Authenticated users can create reviews"
  ON reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own reviews
CREATE POLICY "Users can update own reviews"
  ON reviews
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own reviews
CREATE POLICY "Users can delete own reviews"
  ON reviews
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
DROP TRIGGER IF EXISTS reviews_updated_at_trigger ON reviews;
CREATE TRIGGER reviews_updated_at_trigger
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_reviews_updated_at();

-- Create view for review statistics per merchant
CREATE OR REPLACE VIEW merchant_review_stats AS
SELECT
  target_id as merchant_id,
  COUNT(*) as total_reviews,
  ROUND(AVG(rating)::numeric, 1) as average_rating,
  ROUND(AVG(food_rating)::numeric, 1) as average_food_rating,
  ROUND(AVG(service_rating)::numeric, 1) as average_service_rating,
  ROUND(AVG(ambiance_rating)::numeric, 1) as average_ambiance_rating,
  ROUND(AVG(value_rating)::numeric, 1) as average_value_rating,
  COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star_count,
  COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star_count,
  COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star_count,
  COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star_count,
  COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star_count
FROM reviews
WHERE target_type = 'merchant'
GROUP BY target_id;
