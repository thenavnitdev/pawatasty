/*
  # Allow public read access to station items
  
  1. Changes
    - Add RLS policy to allow anon role to read station_items
    - This is needed so the merchants edge function can fetch powerbank availability
    - Only SELECT is allowed - insert/update/delete still require authentication
  
  2. Security
    - Read-only access for public
    - Station items data is not sensitive (just availability counts)
    - Write operations still require authentication
*/

-- Allow anon role to read station items (for merchants endpoint)
CREATE POLICY "Public can view station items"
  ON station_items
  FOR SELECT
  TO anon
  USING (true);
