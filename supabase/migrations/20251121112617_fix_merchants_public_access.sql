/*
  # Make Merchants Publicly Accessible

  This migration fixes the issue where merchants are not visible on the map and discover page.

  ## Problem
  - Merchants table has RLS policies that only allow authenticated users to view
  - But merchants should be public data (visible even before login)
  - The app tries to load merchants after splash screen, before authentication

  ## Solution
  - Drop existing restrictive policies
  - Add new public SELECT policy that allows anyone (including anonymous users) to view merchants
  - Keep authenticated-only policies for INSERT/UPDATE/DELETE

  ## Changes
  1. Drop old "Authenticated users can view merchants" policy
  2. Add new "Anyone can view merchants" policy with anon + authenticated roles
  3. Keep INSERT/UPDATE policies for authenticated users only
*/

-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view merchants" ON merchants;

-- Create new public SELECT policy
CREATE POLICY "Anyone can view merchants"
  ON merchants
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Ensure merchant_deals is also publicly readable
DROP POLICY IF EXISTS "Authenticated users can view merchant deals" ON merchant_deals;

CREATE POLICY "Anyone can view merchant deals"
  ON merchant_deals
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Keep the authenticated-only policies for modifications
-- (INSERT and UPDATE policies already exist and are correct)
