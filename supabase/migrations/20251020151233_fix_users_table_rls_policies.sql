/*
  # Fix RLS Policies for Users Table

  1. Security Changes
    - Drop incorrect policies that match on 'id' column
    - Add correct policies that match on 'user_id' column
    - The user_id column is text type and stores the auth user ID
  
  2. Notes
    - The users table uses 'user_id' (text) not 'id' (bigint)
    - auth.uid() returns UUID but user_id is stored as text
*/

-- Drop existing incorrect policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Allow users to view their own profile using user_id
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

-- Allow users to update their own profile using user_id
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Allow users to insert their own profile using user_id
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);