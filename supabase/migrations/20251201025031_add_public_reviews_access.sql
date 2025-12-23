/*
  # Add public read access to reviews

  1. Changes
    - Add policy to allow anonymous users to view all reviews
    - This enables public access to merchant reviews without authentication
  
  2. Security
    - Read-only access for anonymous users
    - Write operations still require authentication
*/

-- Drop policy if it exists, then recreate
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
END $$;

-- Allow anonymous users to read reviews
CREATE POLICY "Anyone can view reviews"
  ON reviews
  FOR SELECT
  TO anon
  USING (true);
