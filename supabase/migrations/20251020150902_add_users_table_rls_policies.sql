/*
  # Add RLS Policies for Users Table

  1. Security Changes
    - Add policy for authenticated users to view their own profile
    - Add policy for authenticated users to update their own profile
    - Add policy for authenticated users to insert their own profile
  
  2. Notes
    - The users table has RLS enabled but no policies
    - These policies allow users to manage their own data
    - Uses auth.uid() to match the user's ID
*/

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

-- Allow users to insert their own profile (for new registrations)
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = id::text);