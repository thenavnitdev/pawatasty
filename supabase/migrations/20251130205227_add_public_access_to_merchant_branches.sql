/*
  # Add Public Access to Merchant Branches

  1. Changes
    - Add policy to allow anonymous users to view merchant branches
    - This enables branches to display on the map and discover pages for all users
  
  2. Security
    - Read-only access for anonymous users
    - Branches are public location data, safe to expose
*/

-- Drop existing SELECT policy to replace with a more permissive one
DROP POLICY IF EXISTS "Authenticated users can view merchant branches" ON merchant_branches;

-- Create new public SELECT policy for merchant branches
CREATE POLICY "Anyone can view merchant branches"
  ON merchant_branches
  FOR SELECT
  TO public
  USING (true);
